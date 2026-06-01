import { Router } from 'express';
import { reportGeneratorService } from '../services/report-generator.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { query } from '../config/database';

const router = Router();

router.get('/sessions/:sessionId/report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const report = await reportGeneratorService.generateReport(req.params.sessionId);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get('/candidates/:candidateId/trend-report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Verify ownership
    if (req.params.candidateId !== req.candidateId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const report = await reportGeneratorService.generateTrendReport(req.params.candidateId);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.get('/candidates/:candidateId/sessions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Verify ownership
    if (req.params.candidateId !== req.candidateId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const result = await query(
      `SELECT id, status, overall_score, started_at, completed_at 
       FROM interview_sessions 
       WHERE candidate_id = $1 
       ORDER BY started_at DESC`,
      [req.params.candidateId]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
