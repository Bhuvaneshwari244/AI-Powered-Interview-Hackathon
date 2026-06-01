import { Router } from 'express';
import { interviewSimulationEngine } from '../services/interview-simulation-engine';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/simulation/process
 * Process an interview log and return readiness score
 */
router.post('/process', authenticate, async (req, res, next) => {
  try {
    const interviewLog = req.body;

    // Validate that log is provided
    if (!interviewLog) {
      return res.status(400).json({
        error: {
          code: 'MISSING_LOG',
          message: 'Interview log is required',
        },
      });
    }

    // Process the interview log
    const result = interviewSimulationEngine.processInterviewLog(interviewLog);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/simulation/adaptive-difficulty
 * Simulate adaptive difficulty adjustment
 */
router.post('/adaptive-difficulty', authenticate, async (req, res, next) => {
  try {
    const { currentDifficulty, recentScores } = req.body;

    if (!currentDifficulty || !recentScores) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'currentDifficulty and recentScores are required',
        },
      });
    }

    const nextDifficulty = interviewSimulationEngine.simulateAdaptiveDifficulty(
      currentDifficulty,
      recentScores
    );

    res.json({
      success: true,
      currentDifficulty,
      nextDifficulty,
      recentScores,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/simulation/time-efficiency
 * Calculate time efficiency score
 */
router.post('/time-efficiency', authenticate, async (req, res, next) => {
  try {
    const { timeSpent, timeLimit } = req.body;

    if (timeSpent === undefined || timeLimit === undefined) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'timeSpent and timeLimit are required',
        },
      });
    }

    const score = interviewSimulationEngine.calculateTimeEfficiencyScore(timeSpent, timeLimit);

    res.json({
      success: true,
      timeSpent,
      timeLimit,
      timeEfficiencyScore: score,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
