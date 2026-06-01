import {
  InterviewSimulationEngine,
  InterviewLog,
  InterviewQuestion,
  CandidateResponse,
  QuestionEvaluation,
} from '../interview-simulation-engine';

describe('InterviewSimulationEngine', () => {
  let engine: InterviewSimulationEngine;

  beforeEach(() => {
    engine = new InterviewSimulationEngine();
  });

  describe('Basic Scoring', () => {
    it('should calculate correct weighted score from dimensions', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1', difficulty: 'Medium' })],
        responses: [createMockResponse({ questionId: 'q1', timeSpent: 100 })],
        evaluations: [
          createMockEvaluation({
            questionId: 'q1',
            dimensions: {
              accuracy: 80,
              clarity: 70,
              depth: 75,
              relevance: 85,
              timeEfficiency: 100,
            },
          }),
        ],
      });

      const result = engine.processInterviewLog(log);

      // Expected: 80*0.3 + 70*0.2 + 75*0.2 + 85*0.2 + 100*0.1 = 24 + 14 + 15 + 17 + 10 = 80
      expect(result.finalScore).toBe(80);
      expect(result.status).toBe('completed');
      expect(result.questionsAnswered).toBe(1);
    });

    it('should handle multiple questions and calculate average', () => {
      const log = createMockInterviewLog({
        questions: [
          createMockQuestion({ id: 'q1' }),
          createMockQuestion({ id: 'q2' }),
          createMockQuestion({ id: 'q3' }),
        ],
        responses: [
          createMockResponse({ questionId: 'q1' }),
          createMockResponse({ questionId: 'q2' }),
          createMockResponse({ questionId: 'q3' }),
        ],
        evaluations: [
          createMockEvaluation({ questionId: 'q1', allDimensions: 80 }),
          createMockEvaluation({ questionId: 'q2', allDimensions: 60 }),
          createMockEvaluation({ questionId: 'q3', allDimensions: 70 }),
        ],
      });

      const result = engine.processInterviewLog(log);

      // Average: (80 + 60 + 70) / 3 = 70
      expect(result.finalScore).toBe(70);
      expect(result.questionsAnswered).toBe(3);
      expect(result.performanceProgression).toHaveLength(3);
    });
  });

  describe('Early Termination Logic', () => {
    it('should terminate when performance drops below threshold after minimum questions', () => {
      const log = createMockInterviewLog({
        questions: Array(10).fill(null).map((_, i) => createMockQuestion({ id: `q${i}` })),
        responses: Array(10).fill(null).map((_, i) => createMockResponse({ questionId: `q${i}` })),
        evaluations: Array(10).fill(null).map((_, i) =>
          createMockEvaluation({ questionId: `q${i}`, allDimensions: 30 }) // Below threshold
        ),
        config: {
          performanceThreshold: 40,
          minQuestionsBeforeTermination: 5,
        },
      });

      const result = engine.processInterviewLog(log);

      expect(result.status).toBe('terminated');
      expect(result.terminationReason).toContain('Performance below threshold');
      expect(result.questionsAnswered).toBeGreaterThanOrEqual(5);
      expect(result.questionsAnswered).toBeLessThan(10); // Should terminate before all questions
    });

    it('should NOT terminate before minimum questions even if performance is low', () => {
      const log = createMockInterviewLog({
        questions: Array(5).fill(null).map((_, i) => createMockQuestion({ id: `q${i}` })),
        responses: Array(5).fill(null).map((_, i) => createMockResponse({ questionId: `q${i}` })),
        evaluations: Array(5).fill(null).map((_, i) =>
          createMockEvaluation({ questionId: `q${i}`, allDimensions: 20 }) // Very low
        ),
        config: {
          performanceThreshold: 40,
          minQuestionsBeforeTermination: 5,
        },
      });

      const result = engine.processInterviewLog(log);

      // Should complete all 5 questions before checking termination
      expect(result.questionsAnswered).toBe(5);
    });

    it('should check termination at correct intervals', () => {
      // Termination check happens every 3 questions after minimum 5
      const log = createMockInterviewLog({
        questions: Array(8).fill(null).map((_, i) => createMockQuestion({ id: `q${i}` })),
        responses: Array(8).fill(null).map((_, i) => createMockResponse({ questionId: `q${i}` })),
        evaluations: Array(8).fill(null).map((_, i) =>
          createMockEvaluation({ questionId: `q${i}`, allDimensions: 30 })
        ),
        config: {
          performanceThreshold: 40,
          minQuestionsBeforeTermination: 5,
        },
      });

      const result = engine.processInterviewLog(log);

      // Should terminate at question 6 (5 + 1, then check at 6 which is 5+1, not divisible by 3)
      // Actually checks at 6 (5+1, 6%3=0), so terminates at 6
      expect(result.questionsAnswered).toBe(6);
      expect(result.status).toBe('terminated');
    });
  });

  describe('Adaptive Difficulty', () => {
    it('should track difficulty changes correctly', () => {
      const log = createMockInterviewLog({
        questions: [
          createMockQuestion({ id: 'q1', difficulty: 'Easy' }),
          createMockQuestion({ id: 'q2', difficulty: 'Medium' }), // Increased
          createMockQuestion({ id: 'q3', difficulty: 'Hard' }), // Increased
          createMockQuestion({ id: 'q4', difficulty: 'Medium' }), // Decreased
        ],
        responses: Array(4).fill(null).map((_, i) => createMockResponse({ questionId: `q${i + 1}` })),
        evaluations: [
          createMockEvaluation({ questionId: 'q1', allDimensions: 80 }), // Strong
          createMockEvaluation({ questionId: 'q2', allDimensions: 85 }), // Strong
          createMockEvaluation({ questionId: 'q3', allDimensions: 90 }), // Strong
          createMockEvaluation({ questionId: 'q4', allDimensions: 45 }), // Weak
        ],
      });

      const result = engine.processInterviewLog(log);

      expect(result.adaptiveDifficultyChanges).toHaveLength(3);
      expect(result.adaptiveDifficultyChanges[0]).toMatchObject({
        questionIndex: 1,
        fromDifficulty: 'Easy',
        toDifficulty: 'Medium',
      });
      expect(result.adaptiveDifficultyChanges[0].reason).toContain('Strong performance');
    });

    it('should simulate adaptive difficulty correctly', () => {
      // Strong performance should increase difficulty
      expect(engine.simulateAdaptiveDifficulty('Easy', [80, 85, 90])).toBe('Medium');
      expect(engine.simulateAdaptiveDifficulty('Medium', [80, 85, 90])).toBe('Hard');
      expect(engine.simulateAdaptiveDifficulty('Hard', [80, 85, 90])).toBe('Hard');

      // Weak performance should decrease difficulty
      expect(engine.simulateAdaptiveDifficulty('Hard', [40, 35, 45])).toBe('Medium');
      expect(engine.simulateAdaptiveDifficulty('Medium', [40, 35, 45])).toBe('Easy');
      expect(engine.simulateAdaptiveDifficulty('Easy', [40, 35, 45])).toBe('Easy');

      // Medium performance should maintain difficulty
      expect(engine.simulateAdaptiveDifficulty('Medium', [60, 65, 55])).toBe('Medium');
    });
  });

  describe('Time Management', () => {
    it('should calculate time efficiency correctly', () => {
      expect(engine.calculateTimeEfficiencyScore(100, 100)).toBe(100); // On time
      expect(engine.calculateTimeEfficiencyScore(110, 100)).toBe(90); // 10% over
      expect(engine.calculateTimeEfficiencyScore(120, 100)).toBe(90); // 20% over
      expect(engine.calculateTimeEfficiencyScore(130, 100)).toBe(75); // 30% over
    });

    it('should track questions over time', () => {
      const log = createMockInterviewLog({
        questions: [
          createMockQuestion({ id: 'q1', timeLimit: 100 }),
          createMockQuestion({ id: 'q2', timeLimit: 100 }),
          createMockQuestion({ id: 'q3', timeLimit: 100 }),
        ],
        responses: [
          createMockResponse({ questionId: 'q1', timeSpent: 90 }), // On time
          createMockResponse({ questionId: 'q2', timeSpent: 120 }), // Over time
          createMockResponse({ questionId: 'q3', timeSpent: 150 }), // Over time
        ],
        evaluations: Array(3).fill(null).map((_, i) =>
          createMockEvaluation({ questionId: `q${i + 1}`, allDimensions: 70 })
        ),
      });

      const result = engine.processInterviewLog(log);

      expect(result.metadata.questionsOverTime).toBe(2);
      expect(result.metadata.timeEfficiencyScore).toBe((1 / 3) * 100); // 1 out of 3 on time
      expect(result.totalTimeSpent).toBe(360);
      expect(result.metadata.averageTimePerQuestion).toBe(120);
    });
  });

  describe('Skill Area Tracking', () => {
    it('should track scores by skill area', () => {
      const log = createMockInterviewLog({
        questions: [
          createMockQuestion({ id: 'q1', skillArea: 'Algorithms' }),
          createMockQuestion({ id: 'q2', skillArea: 'Algorithms' }),
          createMockQuestion({ id: 'q3', skillArea: 'System Design' }),
        ],
        responses: Array(3).fill(null).map((_, i) => createMockResponse({ questionId: `q${i + 1}` })),
        evaluations: [
          createMockEvaluation({ questionId: 'q1', allDimensions: 80 }),
          createMockEvaluation({ questionId: 'q2', allDimensions: 60 }),
          createMockEvaluation({ questionId: 'q3', allDimensions: 90 }),
        ],
      });

      const result = engine.processInterviewLog(log);

      expect(result.skillAreaScores['Algorithms']).toBeDefined();
      expect(result.skillAreaScores['System Design']).toBe(90);
      // Algorithms average: (80 + 60) / 2 = 70
      expect(result.skillAreaScores['Algorithms']).toBeCloseTo(70, 1);
    });
  });

  describe('Readiness Level', () => {
    it('should determine Ready level for score >= 75', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [createMockResponse({ questionId: 'q1' })],
        evaluations: [createMockEvaluation({ questionId: 'q1', allDimensions: 80 })],
      });

      const result = engine.processInterviewLog(log);
      expect(result.readinessLevel).toBe('Ready');
    });

    it('should determine Needs Improvement for score 50-74', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [createMockResponse({ questionId: 'q1' })],
        evaluations: [createMockEvaluation({ questionId: 'q1', allDimensions: 60 })],
      });

      const result = engine.processInterviewLog(log);
      expect(result.readinessLevel).toBe('Needs Improvement');
    });

    it('should determine Not Ready for score < 50', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [createMockResponse({ questionId: 'q1' })],
        evaluations: [createMockEvaluation({ questionId: 'q1', allDimensions: 40 })],
      });

      const result = engine.processInterviewLog(log);
      expect(result.readinessLevel).toBe('Not Ready');
    });
  });

  describe('Validation and Edge Cases', () => {
    it('should throw error for missing required fields', () => {
      const log = { ...createMockInterviewLog(), sessionId: '' };
      expect(() => engine.processInterviewLog(log)).toThrow('Missing required fields');
    });

    it('should throw error for empty questions', () => {
      const log = createMockInterviewLog({ questions: [] });
      expect(() => engine.processInterviewLog(log)).toThrow('at least one question');
    });

    it('should throw error for mismatched responses and evaluations', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [createMockResponse({ questionId: 'q1' })],
        evaluations: [],
      });
      expect(() => engine.processInterviewLog(log)).toThrow('must match');
    });

    it('should throw error for inconsistent question-response-evaluation', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [createMockResponse({ questionId: 'q2' })], // Wrong ID
        evaluations: [createMockEvaluation({ questionId: 'q1' })],
      });
      expect(() => engine.processInterviewLog(log)).toThrow('Inconsistent');
    });

    it('should throw error for invalid dimension scores', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [createMockResponse({ questionId: 'q1' })],
        evaluations: [
          createMockEvaluation({
            questionId: 'q1',
            dimensions: { accuracy: 150, clarity: 70, depth: 70, relevance: 70, timeEfficiency: 70 },
          }),
        ],
      });
      expect(() => engine.processInterviewLog(log)).toThrow('dimension scores must be 0-100');
    });

    it('should handle zero questions answered gracefully', () => {
      const log = createMockInterviewLog({
        questions: [createMockQuestion({ id: 'q1' })],
        responses: [],
        evaluations: [],
      });

      const result = engine.processInterviewLog(log);
      expect(result.questionsAnswered).toBe(0);
      expect(result.finalScore).toBe(0);
    });
  });

  describe('Metadata Tracking', () => {
    it('should track difficulty distribution', () => {
      const log = createMockInterviewLog({
        questions: [
          createMockQuestion({ id: 'q1', difficulty: 'Easy' }),
          createMockQuestion({ id: 'q2', difficulty: 'Easy' }),
          createMockQuestion({ id: 'q3', difficulty: 'Medium' }),
          createMockQuestion({ id: 'q4', difficulty: 'Hard' }),
        ],
        responses: Array(4).fill(null).map((_, i) => createMockResponse({ questionId: `q${i + 1}` })),
        evaluations: Array(4).fill(null).map((_, i) =>
          createMockEvaluation({ questionId: `q${i + 1}`, allDimensions: 70 })
        ),
      });

      const result = engine.processInterviewLog(log);

      expect(result.metadata.difficultyDistribution).toEqual({
        Easy: 2,
        Medium: 1,
        Hard: 1,
      });
    });
  });
});

// Helper functions
function createMockInterviewLog(overrides?: Partial<InterviewLog>): InterviewLog {
  return {
    sessionId: 'session-123',
    candidateId: 'candidate-456',
    startTime: new Date(),
    questions: overrides?.questions || [],
    responses: overrides?.responses || [],
    evaluations: overrides?.evaluations || [],
    config: {
      duration: 45,
      initialDifficulty: 'Medium',
      performanceThreshold: overrides?.config?.performanceThreshold ?? 40,
      minQuestionsBeforeTermination: overrides?.config?.minQuestionsBeforeTermination ?? 5,
      ...overrides?.config,
    },
    ...overrides,
  };
}

function createMockQuestion(overrides?: Partial<InterviewQuestion>): InterviewQuestion {
  return {
    id: 'q1',
    type: 'technical',
    difficulty: 'Medium',
    skillArea: 'Programming',
    text: 'Sample question',
    timeLimit: 300,
    expectedResponseFormat: 'text',
    ...overrides,
  };
}

function createMockResponse(overrides?: Partial<CandidateResponse>): CandidateResponse {
  return {
    questionId: 'q1',
    content: 'Sample response',
    format: 'text',
    timeSpent: 200,
    submittedAt: new Date(),
    ...overrides,
  };
}

function createMockEvaluation(
  overrides?: Partial<QuestionEvaluation> & { allDimensions?: number }
): QuestionEvaluation {
  const allDims = overrides?.allDimensions ?? 70;
  return {
    questionId: 'q1',
    score: allDims,
    dimensions: {
      accuracy: allDims,
      clarity: allDims,
      depth: allDims,
      relevance: allDims,
      timeEfficiency: allDims,
      ...overrides?.dimensions,
    },
    feedback: 'Sample feedback',
    strengths: ['Good approach'],
    improvements: ['Could improve clarity'],
    ...overrides,
  };
}
