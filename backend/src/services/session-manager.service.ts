import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import { query } from '../config/database';
import { questionGeneratorService } from './question-generator.service';
import { responseEvaluatorService } from './response-evaluator.service';
import type {
  Session,
  SessionState,
  InterviewConfig,
  ParsedResume,
  ParsedJobDescription,
  CandidateResponse,
  ResponseHistory,
  Question,
  EvaluationResult,
} from '../types';

export class SessionManagerService {
  private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours
  private readonly PERFORMANCE_THRESHOLD = 40;
  private readonly MIN_QUESTIONS_BEFORE_TERMINATION = 5;

  async createSession(
    candidateId: string,
    resume: ParsedResume,
    jobDescription: ParsedJobDescription,
    config: InterviewConfig
  ): Promise<Session> {
    const sessionId = uuidv4();

    // Generate initial questions
    const initialQuestions = await questionGeneratorService.generateInitialQuestions(
      resume,
      jobDescription,
      config,
      candidateId
    );

    const state: SessionState = {
      currentQuestionIndex: 0,
      questions: initialQuestions,
      responses: [],
      performanceScore: 0,
      skillAreaScores: {},
      elapsedTime: 0,
      lastActivity: new Date(),
    };

    const session: Session = {
      id: sessionId,
      candidateId,
      status: 'active',
      startedAt: new Date(),
      config,
      context: {
        resume,
        jobDescription,
      },
      state,
    };

    // Store in Redis
    await this.saveSessionState(sessionId, session);

    // Store metadata in PostgreSQL
    await query(
      `INSERT INTO interview_sessions 
       (id, candidate_id, status, config, resume_data, job_description_data, started_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sessionId,
        candidateId,
        'active',
        JSON.stringify(config),
        JSON.stringify(resume),
        JSON.stringify(jobDescription),
        session.startedAt,
      ]
    );

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const cacheKey = `session:${sessionId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const result = await query('SELECT * FROM interview_sessions WHERE id = $1', [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    // Reconstruct session from database (simplified)
    return null; // Would need to reconstruct full state
  }

  async submitResponse(
    sessionId: string,
    response: CandidateResponse
  ): Promise<{
    evaluation: EvaluationResult;
    nextQuestion?: Question;
    sessionComplete: boolean;
    terminated: boolean;
    terminationReason?: string;
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentQuestion = session.state.questions[session.state.currentQuestionIndex];

    // Evaluate response
    const evaluation = await responseEvaluatorService.evaluateResponse(currentQuestion, response);

    // Update response history
    const responseHistory: ResponseHistory = {
      question: currentQuestion,
      response,
      evaluation,
      timestamp: new Date(),
    };

    session.state.responses.push(responseHistory);

    // Update performance scores
    this.updatePerformanceScores(session.state, evaluation, currentQuestion.skillArea);

    // Store question and response in database
    await query(
      `INSERT INTO session_questions 
       (session_id, question_index, question_data, response_data, evaluation_data, time_spent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        session.state.currentQuestionIndex,
        JSON.stringify(currentQuestion),
        JSON.stringify(response),
        JSON.stringify(evaluation),
        response.timeSpent,
      ]
    );

    // Check for early termination
    if (this.shouldTerminateEarly(session.state)) {
      await this.terminateSession(sessionId, 'Performance below threshold');
      return {
        evaluation,
        sessionComplete: true,
        terminated: true,
        terminationReason: 'Performance below threshold',
      };
    }

    // Move to next question
    session.state.currentQuestionIndex++;

    // Check if session is complete
    if (session.state.currentQuestionIndex >= session.state.questions.length) {
      // Generate next question or complete session
      const shouldContinue = this.shouldContinueSession(session);

      if (shouldContinue) {
        const nextQuestion = await questionGeneratorService.generateNextQuestion(
          session.candidateId,
          session.context,
          session.state.responses
        );

        session.state.questions.push(nextQuestion);

        await this.saveSessionState(sessionId, session);

        return {
          evaluation,
          nextQuestion,
          sessionComplete: false,
          terminated: false,
        };
      } else {
        // Complete session
        await this.completeSession(sessionId);
        return {
          evaluation,
          sessionComplete: true,
          terminated: false,
        };
      }
    }

    // Save updated state
    await this.saveSessionState(sessionId, session);

    const nextQuestion = session.state.questions[session.state.currentQuestionIndex];

    return {
      evaluation,
      nextQuestion,
      sessionComplete: false,
      terminated: false,
    };
  }

  private updatePerformanceScores(
    state: SessionState,
    evaluation: EvaluationResult,
    skillArea: string
  ): void {
    // Update overall performance score (average of all responses)
    const allScores = [...state.responses.map((r) => r.evaluation.score), evaluation.score];
    state.performanceScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    // Update skill area scores
    if (!state.skillAreaScores[skillArea]) {
      state.skillAreaScores[skillArea] = evaluation.score;
    } else {
      const skillResponses = state.responses.filter((r) => r.question.skillArea === skillArea);
      const skillScores = [...skillResponses.map((r) => r.evaluation.score), evaluation.score];
      state.skillAreaScores[skillArea] =
        skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length;
    }
  }

  private shouldTerminateEarly(state: SessionState): boolean {
    // Check after every 3 questions, minimum 5 questions
    if (state.responses.length < this.MIN_QUESTIONS_BEFORE_TERMINATION) {
      return false;
    }

    if (state.responses.length % 3 !== 0) {
      return false;
    }

    return state.performanceScore < this.PERFORMANCE_THRESHOLD;
  }

  private shouldContinueSession(session: Session): boolean {
    // Continue if within time limit and performance is acceptable
    const elapsedMinutes = session.state.elapsedTime / 60;
    return elapsedMinutes < session.config.duration && session.state.responses.length < 20;
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    await query(
      `UPDATE interview_sessions 
       SET status = 'terminated', terminated_at = NOW(), termination_reason = $1 
       WHERE id = $2`,
      [reason, sessionId]
    );

    const session = await this.getSession(sessionId);
    if (session) {
      session.status = 'terminated';
      await this.saveSessionState(sessionId, session);
    }
  }

  async completeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    await query(
      `UPDATE interview_sessions 
       SET status = 'completed', completed_at = NOW(), overall_score = $1 
       WHERE id = $2`,
      [session.state.performanceScore, sessionId]
    );

    session.status = 'completed';
    await this.saveSessionState(sessionId, session);

    // Store performance metrics
    for (const [skillArea, score] of Object.entries(session.state.skillAreaScores)) {
      const skillResponses = session.state.responses.filter(
        (r) => r.question.skillArea === skillArea
      );
      const avgTime =
        skillResponses.reduce((sum, r) => sum + r.response.timeSpent, 0) / skillResponses.length;

      await query(
        `INSERT INTO performance_metrics 
         (session_id, skill_area, score, questions_count, average_time) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, skillArea, score, skillResponses.length, avgTime]
      );
    }
  }

  private async saveSessionState(sessionId: string, session: Session): Promise<void> {
    const cacheKey = `session:${sessionId}`;
    await redisClient.setEx(cacheKey, this.SESSION_TTL, JSON.stringify(session));
  }

  async recoverSession(sessionId: string): Promise<Session | null> {
    return this.getSession(sessionId);
  }
}

export const sessionManagerService = new SessionManagerService();
