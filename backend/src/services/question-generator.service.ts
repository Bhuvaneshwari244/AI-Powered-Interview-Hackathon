import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import { query } from '../config/database';
import { env } from '../config/env';
import type {
  ParsedResume,
  ParsedJobDescription,
  Question,
  InterviewConfig,
  DifficultyLevel,
  QuestionType,
  ResponseHistory,
} from '../types';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class QuestionGeneratorService {
  private readonly QUESTION_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  async generateInitialQuestions(
    resume: ParsedResume,
    jobDescription: ParsedJobDescription,
    config: InterviewConfig,
    candidateId: string
  ): Promise<Question[]> {
    const context = this.analyzeContext(resume, jobDescription);
    const questions: Question[] = [];

    // Generate 3-5 initial questions
    const questionCount = 5;
    const questionTypes: QuestionType[] = ['technical', 'conceptual', 'behavioral', 'scenario'];

    for (let i = 0; i < questionCount; i++) {
      const type = questionTypes[i % questionTypes.length];
      const question = await this.generateQuestion(
        type,
        config.initialDifficulty,
        context,
        candidateId,
        []
      );
      questions.push(question);
    }

    return questions;
  }

  async generateNextQuestion(
    candidateId: string,
    sessionContext: {
      resume: ParsedResume;
      jobDescription: ParsedJobDescription;
      config: InterviewConfig;
    },
    previousResponses: ResponseHistory[]
  ): Promise<Question> {
    const context = this.analyzeContext(sessionContext.resume, sessionContext.jobDescription);

    // Determine next difficulty based on performance
    const difficulty = this.adaptDifficulty(previousResponses, sessionContext.config.initialDifficulty);

    // Determine next question type (rotate through types)
    const usedTypes = previousResponses.map((r) => r.question.type);
    const allTypes: QuestionType[] = ['technical', 'conceptual', 'behavioral', 'scenario'];
    const nextType = allTypes.find((t) => !usedTypes.slice(-4).includes(t)) || allTypes[0];

    // Get used question IDs to avoid repetition
    const usedQuestionIds = previousResponses.map((r) => r.question.id);

    return this.generateQuestion(nextType, difficulty, context, candidateId, usedQuestionIds);
  }

  private analyzeContext(resume: ParsedResume, jobDescription: ParsedJobDescription) {
    // Extract all skills from resume
    const resumeSkills = resume.skills.flatMap((cat) => cat.skills);

    // Extract required skills from JD
    const requiredSkills = jobDescription.requiredSkills.flatMap((cat) => cat.skills);

    // Find skill gaps
    const skillGaps = requiredSkills.filter((skill) => !resumeSkills.includes(skill));

    // Find skill overlaps
    const skillOverlaps = requiredSkills.filter((skill) => resumeSkills.includes(skill));

    // Determine focus areas
    const focusAreas = [
      ...jobDescription.requiredSkills.map((cat) => cat.category),
      ...resume.skills.map((cat) => cat.category),
    ].filter((v, i, a) => a.indexOf(v) === i);

    return {
      resumeSkills,
      requiredSkills,
      skillGaps,
      skillOverlaps,
      focusAreas,
      experienceLevel: jobDescription.experienceLevel,
      projects: resume.projects,
    };
  }

  private adaptDifficulty(
    previousResponses: ResponseHistory[],
    initialDifficulty: DifficultyLevel
  ): DifficultyLevel {
    if (previousResponses.length === 0) {
      return initialDifficulty;
    }

    // Calculate average score of last 3 responses
    const recentResponses = previousResponses.slice(-3);
    const avgScore =
      recentResponses.reduce((sum, r) => sum + r.evaluation.score, 0) / recentResponses.length;

    // Adapt difficulty based on performance
    if (avgScore >= 75) {
      // Strong performance - increase difficulty
      return initialDifficulty === 'Easy' ? 'Medium' : 'Hard';
    } else if (avgScore < 50) {
      // Weak performance - decrease difficulty
      return initialDifficulty === 'Hard' ? 'Medium' : 'Easy';
    } else {
      // Maintain current difficulty
      return initialDifficulty;
    }
  }

  private async generateQuestion(
    type: QuestionType,
    difficulty: DifficultyLevel,
    context: any,
    candidateId: string,
    usedQuestionIds: string[]
  ): Promise<Question> {
    // Check cache first
    const cacheKey = `questions:${type}:${difficulty}:${context.focusAreas.join(',')}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const cachedQuestions: Question[] = JSON.parse(cached);
      const availableQuestion = cachedQuestions.find((q) => !usedQuestionIds.includes(q.id));
      if (availableQuestion) {
        console.log('Question found in cache');
        return availableQuestion;
      }
    }

    // Check if question was used by this candidate before
    const usedQuestions = await this.getUsedQuestions(candidateId);

    // Generate new question with LLM
    const question = await this.generateQuestionWithLLM(type, difficulty, context);

    // Ensure uniqueness
    if (usedQuestions.includes(question.text)) {
      // Regenerate if duplicate
      return this.generateQuestionWithLLM(type, difficulty, context);
    }

    // Cache the question
    const cachedQuestions = cached ? JSON.parse(cached) : [];
    cachedQuestions.push(question);
    await redisClient.setEx(cacheKey, this.QUESTION_CACHE_TTL, JSON.stringify(cachedQuestions));

    return question;
  }

  private async generateQuestionWithLLM(
    type: QuestionType,
    difficulty: DifficultyLevel,
    context: any
  ): Promise<Question> {
    const prompt = this.buildPrompt(type, difficulty, context);

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert technical interviewer. Generate high-quality interview questions that are clear, relevant, and appropriate for the candidate's background and target role.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const questionText = response.choices[0].message.content || '';

    // Determine time limit based on difficulty
    const timeLimit = this.getTimeLimit(difficulty);

    // Determine expected response format
    const expectedFormat = type === 'technical' ? 'code' : 'text';

    // Determine skill area
    const skillArea = context.focusAreas[0] || 'General';

    return {
      id: uuidv4(),
      type,
      difficulty,
      skillArea,
      text: questionText.trim(),
      expectedResponseFormat: expectedFormat,
      timeLimit,
      evaluationCriteria: {
        accuracy: 'Correctness of the solution or answer',
        clarity: 'Clear explanation and communication',
        depth: 'Understanding of underlying concepts',
        relevance: 'Relevance to the question asked',
      },
      metadata: {
        relatedSkills: context.skillOverlaps.slice(0, 3),
        projectReference: context.projects.length > 0 ? context.projects[0].name : undefined,
      },
    };
  }

  private buildPrompt(type: QuestionType, difficulty: DifficultyLevel, context: any): string {
    const baseContext = `
Experience Level: ${context.experienceLevel}
Focus Areas: ${context.focusAreas.join(', ')}
Skill Overlaps: ${context.skillOverlaps.join(', ')}
Skill Gaps: ${context.skillGaps.join(', ')}
`;

    switch (type) {
      case 'technical':
        return `${baseContext}

Generate a ${difficulty} technical interview question that tests programming and problem-solving skills.
The question should be relevant to the focus areas and appropriate for a ${context.experienceLevel} level candidate.

Requirements:
- Clear problem statement
- Specific enough to have a definite solution
- Tests algorithmic thinking or coding ability
- Appropriate difficulty level

Return only the question text, no additional formatting.`;

      case 'conceptual':
        return `${baseContext}

Generate a ${difficulty} conceptual interview question that tests theoretical knowledge.
The question should assess understanding of fundamental concepts in the focus areas.

Requirements:
- Tests deep understanding of concepts
- Appropriate for ${context.experienceLevel} level
- Requires explanation, not just memorization

Return only the question text, no additional formatting.`;

      case 'behavioral':
        return `${baseContext}

Generate a ${difficulty} behavioral interview question that assesses soft skills and past experiences.
The question should be relevant to the role and experience level.

Requirements:
- Uses STAR method (Situation, Task, Action, Result)
- Relevant to technical roles
- Appropriate for ${context.experienceLevel} level

Return only the question text, no additional formatting.`;

      case 'scenario':
        return `${baseContext}

Generate a ${difficulty} scenario-based interview question that tests practical application of knowledge.
The question should present a real-world problem relevant to the focus areas.

Requirements:
- Realistic scenario
- Tests problem-solving and decision-making
- Appropriate for ${context.experienceLevel} level
- Requires practical thinking

Return only the question text, no additional formatting.`;

      default:
        return '';
    }
  }

  private getTimeLimit(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case 'Easy':
        return 180; // 3 minutes
      case 'Medium':
        return 300; // 5 minutes
      case 'Hard':
        return 480; // 8 minutes
      default:
        return 300;
    }
  }

  private async getUsedQuestions(candidateId: string): Promise<string[]> {
    try {
      const result = await query(
        `SELECT DISTINCT sq.question_data->>'text' as question_text
         FROM session_questions sq
         JOIN interview_sessions s ON sq.session_id = s.id
         WHERE s.candidate_id = $1`,
        [candidateId]
      );

      return result.rows.map((row) => row.question_text);
    } catch (error) {
      console.error('Error fetching used questions:', error);
      return [];
    }
  }
}

export const questionGeneratorService = new QuestionGeneratorService();
