/**
 * Interview Simulation Engine
 * 
 * Core engine that processes interview logs and produces Interview Readiness Scores.
 * Implements scoring, timing, adaptive difficulty, and termination logic.
 */

export interface InterviewQuestion {
  id: string;
  type: 'technical' | 'conceptual' | 'behavioral' | 'scenario';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  skillArea: string;
  text: string;
  timeLimit: number; // seconds
  expectedResponseFormat: 'text' | 'code' | 'diagram';
}

export interface CandidateResponse {
  questionId: string;
  content: string;
  format: 'text' | 'code' | 'diagram';
  timeSpent: number; // seconds
  submittedAt: Date;
}

export interface EvaluationDimensions {
  accuracy: number; // 0-100
  clarity: number; // 0-100
  depth: number; // 0-100
  relevance: number; // 0-100
  timeEfficiency: number; // 0-100
}

export interface QuestionEvaluation {
  questionId: string;
  score: number; // 0-100
  dimensions: EvaluationDimensions;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface InterviewLog {
  sessionId: string;
  candidateId: string;
  startTime: Date;
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  evaluations: QuestionEvaluation[];
  config: {
    duration: number; // minutes
    initialDifficulty: 'Easy' | 'Medium' | 'Hard';
    performanceThreshold: number; // 0-100
    minQuestionsBeforeTermination: number;
  };
}

export interface InterviewResult {
  sessionId: string;
  candidateId: string;
  finalScore: number; // 0-100
  readinessLevel: 'Ready' | 'Needs Improvement' | 'Not Ready';
  status: 'completed' | 'terminated' | 'in_progress';
  terminationReason?: string;
  questionsAnswered: number;
  totalTimeSpent: number; // seconds
  skillAreaScores: Record<string, number>;
  performanceProgression: number[];
  adaptiveDifficultyChanges: Array<{
    questionIndex: number;
    fromDifficulty: string;
    toDifficulty: string;
    reason: string;
  }>;
  metadata: {
    averageScore: number;
    averageTimePerQuestion: number;
    questionsOverTime: number;
    timeEfficiencyScore: number;
    difficultyDistribution: Record<string, number>;
  };
}

export class InterviewSimulationEngine {
  private readonly PERFORMANCE_THRESHOLD = 40;
  private readonly MIN_QUESTIONS_BEFORE_TERMINATION = 5;
  private readonly TERMINATION_CHECK_INTERVAL = 3;
  
  // Scoring weights
  private readonly DIMENSION_WEIGHTS = {
    accuracy: 0.30,
    clarity: 0.20,
    depth: 0.20,
    relevance: 0.20,
    timeEfficiency: 0.10,
  };

  // Readiness level thresholds
  private readonly READINESS_THRESHOLDS = {
    ready: 75,
    needsImprovement: 50,
  };

  /**
   * Main entry point: Process interview log and produce final result
   */
  public processInterviewLog(log: InterviewLog): InterviewResult {
    // Validate input
    this.validateInterviewLog(log);

    // Initialize result
    const result: InterviewResult = {
      sessionId: log.sessionId,
      candidateId: log.candidateId,
      finalScore: 0,
      readinessLevel: 'Not Ready',
      status: 'in_progress',
      questionsAnswered: 0,
      totalTimeSpent: 0,
      skillAreaScores: {},
      performanceProgression: [],
      adaptiveDifficultyChanges: [],
      metadata: {
        averageScore: 0,
        averageTimePerQuestion: 0,
        questionsOverTime: 0,
        timeEfficiencyScore: 0,
        difficultyDistribution: { Easy: 0, Medium: 0, Hard: 0 },
      },
    };

    // Process each question-response-evaluation triplet
    const processedCount = Math.min(
      log.questions.length,
      log.responses.length,
      log.evaluations.length
    );

    for (let i = 0; i < processedCount; i++) {
      const question = log.questions[i];
      const response = log.responses[i];
      const evaluation = log.evaluations[i];

      // Validate triplet consistency
      if (question.id !== response.questionId || question.id !== evaluation.questionId) {
        throw new Error(`Inconsistent question-response-evaluation at index ${i}`);
      }

      // Calculate weighted score for this question
      const weightedScore = this.calculateWeightedScore(evaluation.dimensions);

      // Update performance progression
      result.performanceProgression.push(weightedScore);

      // Update skill area scores
      this.updateSkillAreaScores(result.skillAreaScores, question.skillArea, weightedScore);

      // Update time tracking
      result.totalTimeSpent += response.timeSpent;

      // Track time violations
      if (response.timeSpent > question.timeLimit) {
        result.metadata.questionsOverTime++;
      }

      // Track difficulty distribution
      result.metadata.difficultyDistribution[question.difficulty]++;

      // Update questions answered
      result.questionsAnswered++;

      // Check for early termination
      if (this.shouldTerminateEarly(result, log.config)) {
        result.status = 'terminated';
        result.terminationReason = `Performance below threshold (${log.config.performanceThreshold})`;
        break;
      }

      // Track adaptive difficulty changes
      if (i < processedCount - 1) {
        const nextQuestion = log.questions[i + 1];
        if (question.difficulty !== nextQuestion.difficulty) {
          result.adaptiveDifficultyChanges.push({
            questionIndex: i + 1,
            fromDifficulty: question.difficulty,
            toDifficulty: nextQuestion.difficulty,
            reason: this.determineAdaptationReason(weightedScore, question.difficulty, nextQuestion.difficulty),
          });
        }
      }
    }

    // Calculate final metrics
    this.calculateFinalMetrics(result);

    // Determine final status
    if (result.status !== 'terminated') {
      result.status = 'completed';
    }

    // Determine readiness level
    result.readinessLevel = this.determineReadinessLevel(result.finalScore);

    return result;
  }

  /**
   * Calculate weighted score from evaluation dimensions
   */
  private calculateWeightedScore(dimensions: EvaluationDimensions): number {
    const score =
      dimensions.accuracy * this.DIMENSION_WEIGHTS.accuracy +
      dimensions.clarity * this.DIMENSION_WEIGHTS.clarity +
      dimensions.depth * this.DIMENSION_WEIGHTS.depth +
      dimensions.relevance * this.DIMENSION_WEIGHTS.relevance +
      dimensions.timeEfficiency * this.DIMENSION_WEIGHTS.timeEfficiency;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Update skill area scores with running average
   */
  private updateSkillAreaScores(
    skillAreaScores: Record<string, number>,
    skillArea: string,
    score: number
  ): void {
    if (!skillAreaScores[skillArea]) {
      skillAreaScores[skillArea] = score;
    } else {
      // Calculate running average
      const currentAvg = skillAreaScores[skillArea];
      const count = Object.keys(skillAreaScores).filter((k) => k === skillArea).length + 1;
      skillAreaScores[skillArea] = (currentAvg * (count - 1) + score) / count;
    }
  }

  /**
   * Check if interview should terminate early
   */
  private shouldTerminateEarly(
    result: InterviewResult,
    config: InterviewLog['config']
  ): boolean {
    // Must answer minimum questions first
    if (result.questionsAnswered < config.minQuestionsBeforeTermination) {
      return false;
    }

    // Check every N questions
    if (result.questionsAnswered % this.TERMINATION_CHECK_INTERVAL !== 0) {
      return false;
    }

    // Calculate current average performance
    const avgPerformance =
      result.performanceProgression.reduce((sum, score) => sum + score, 0) /
      result.performanceProgression.length;

    // Terminate if below threshold
    return avgPerformance < config.performanceThreshold;
  }

  /**
   * Determine reason for difficulty adaptation
   */
  private determineAdaptationReason(
    score: number,
    fromDifficulty: string,
    toDifficulty: string
  ): string {
    const difficultyLevels = ['Easy', 'Medium', 'Hard'];
    const fromIndex = difficultyLevels.indexOf(fromDifficulty);
    const toIndex = difficultyLevels.indexOf(toDifficulty);

    if (toIndex > fromIndex) {
      return `Strong performance (score: ${score.toFixed(1)}) - increasing difficulty`;
    } else if (toIndex < fromIndex) {
      return `Weak performance (score: ${score.toFixed(1)}) - decreasing difficulty`;
    } else {
      return `Maintaining difficulty level (score: ${score.toFixed(1)})`;
    }
  }

  /**
   * Calculate final metrics
   */
  private calculateFinalMetrics(result: InterviewResult): void {
    if (result.questionsAnswered === 0) {
      return;
    }

    // Calculate average score
    result.metadata.averageScore =
      result.performanceProgression.reduce((sum, score) => sum + score, 0) /
      result.performanceProgression.length;

    // Set final score as average score
    result.finalScore = Math.round(result.metadata.averageScore);

    // Calculate average time per question
    result.metadata.averageTimePerQuestion = result.totalTimeSpent / result.questionsAnswered;

    // Calculate time efficiency score
    const totalQuestions = result.questionsAnswered;
    const questionsOnTime = totalQuestions - result.metadata.questionsOverTime;
    result.metadata.timeEfficiencyScore = (questionsOnTime / totalQuestions) * 100;

    // Round skill area scores
    for (const skillArea in result.skillAreaScores) {
      result.skillAreaScores[skillArea] = Math.round(result.skillAreaScores[skillArea] * 100) / 100;
    }
  }

  /**
   * Determine readiness level based on final score
   */
  private determineReadinessLevel(score: number): 'Ready' | 'Needs Improvement' | 'Not Ready' {
    if (score >= this.READINESS_THRESHOLDS.ready) {
      return 'Ready';
    } else if (score >= this.READINESS_THRESHOLDS.needsImprovement) {
      return 'Needs Improvement';
    } else {
      return 'Not Ready';
    }
  }

  /**
   * Validate interview log structure and data
   */
  private validateInterviewLog(log: InterviewLog): void {
    if (!log.sessionId || !log.candidateId) {
      throw new Error('Missing required fields: sessionId or candidateId');
    }

    if (!log.questions || log.questions.length === 0) {
      throw new Error('Interview log must contain at least one question');
    }

    if (log.responses.length !== log.evaluations.length) {
      throw new Error('Number of responses must match number of evaluations');
    }

    if (log.responses.length > log.questions.length) {
      throw new Error('Number of responses cannot exceed number of questions');
    }

    // Validate config
    if (!log.config) {
      throw new Error('Interview config is required');
    }

    if (log.config.performanceThreshold < 0 || log.config.performanceThreshold > 100) {
      throw new Error('Performance threshold must be between 0 and 100');
    }

    if (log.config.minQuestionsBeforeTermination < 1) {
      throw new Error('Minimum questions before termination must be at least 1');
    }

    // Validate each question
    for (let i = 0; i < log.questions.length; i++) {
      const question = log.questions[i];
      if (!question.id || !question.type || !question.difficulty || !question.skillArea) {
        throw new Error(`Invalid question at index ${i}: missing required fields`);
      }

      if (question.timeLimit <= 0) {
        throw new Error(`Invalid question at index ${i}: timeLimit must be positive`);
      }
    }

    // Validate each response
    for (let i = 0; i < log.responses.length; i++) {
      const response = log.responses[i];
      if (!response.questionId || response.timeSpent < 0) {
        throw new Error(`Invalid response at index ${i}`);
      }
    }

    // Validate each evaluation
    for (let i = 0; i < log.evaluations.length; i++) {
      const evaluation = log.evaluations[i];
      if (!evaluation.questionId) {
        throw new Error(`Invalid evaluation at index ${i}: missing questionId`);
      }

      const dims = evaluation.dimensions;
      if (
        dims.accuracy < 0 || dims.accuracy > 100 ||
        dims.clarity < 0 || dims.clarity > 100 ||
        dims.depth < 0 || dims.depth > 100 ||
        dims.relevance < 0 || dims.relevance > 100 ||
        dims.timeEfficiency < 0 || dims.timeEfficiency > 100
      ) {
        throw new Error(`Invalid evaluation at index ${i}: dimension scores must be 0-100`);
      }
    }
  }

  /**
   * Simulate adaptive difficulty adjustment
   */
  public simulateAdaptiveDifficulty(
    currentDifficulty: 'Easy' | 'Medium' | 'Hard',
    recentScores: number[]
  ): 'Easy' | 'Medium' | 'Hard' {
    if (recentScores.length === 0) {
      return currentDifficulty;
    }

    // Calculate average of recent scores (last 3)
    const scoresToConsider = recentScores.slice(-3);
    const avgScore = scoresToConsider.reduce((sum, s) => sum + s, 0) / scoresToConsider.length;

    // Strong performance (≥75) - increase difficulty
    if (avgScore >= 75) {
      if (currentDifficulty === 'Easy') return 'Medium';
      if (currentDifficulty === 'Medium') return 'Hard';
      return 'Hard';
    }

    // Weak performance (<50) - decrease difficulty
    if (avgScore < 50) {
      if (currentDifficulty === 'Hard') return 'Medium';
      if (currentDifficulty === 'Medium') return 'Easy';
      return 'Easy';
    }

    // Maintain current difficulty
    return currentDifficulty;
  }

  /**
   * Calculate time efficiency penalty
   */
  public calculateTimeEfficiencyScore(timeSpent: number, timeLimit: number): number {
    const ratio = timeSpent / timeLimit;

    if (ratio <= 1.0) {
      // Within time limit - full score
      return 100;
    } else if (ratio <= 1.2) {
      // 10-20% overtime - 10% penalty
      return 90;
    } else {
      // >20% overtime - 25% penalty
      return 75;
    }
  }
}

// Export singleton instance
export const interviewSimulationEngine = new InterviewSimulationEngine();
