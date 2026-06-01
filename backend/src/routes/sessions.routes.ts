import { Router } from 'express';
import { z } from 'zod';
import { sessionManagerService } from '../services/session-manager.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const createSessionSchema = z.object({
  resumeData: z.object({}).passthrough(),
  jobDescriptionData: z.object({}).passthrough(),
  config: z.object({
    duration: z.union([z.literal(30), z.literal(45), z.literal(60)]),
    focusAreas: z.array(z.string()).optional(),
    initialDifficulty: z.enum(['Easy', 'Medium', 'Hard']),
  }),
});

router.post('/create', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { resumeData, jobDescriptionData, config } = createSessionSchema.parse(req.body);

    const session = await sessionManagerService.createSession(
      req.candidateId!,
      resumeData as any,
      jobDescriptionData as any,
      config
    );

    res.status(201).json({
      sessionId: session.id,
      session,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

router.get('/:sessionId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const session = await sessionManagerService.getSession(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    // Verify ownership
    if (session.candidateId !== req.candidateId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

router.post('/:sessionId/terminate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    await sessionManagerService.terminateSession(req.params.sessionId, reason || 'User terminated');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/:sessionId/current-question', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const session = await sessionManagerService.getSession(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    const currentQuestion = session.state.questions[session.state.currentQuestionIndex];

    res.json({ question: currentQuestion });
  } catch (error) {
    next(error);
  }
});

router.post('/:sessionId/submit-response', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const response = req.body.response;

    const result = await sessionManagerService.submitResponse(req.params.sessionId, response);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
