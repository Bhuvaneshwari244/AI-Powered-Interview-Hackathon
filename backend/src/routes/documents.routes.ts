import { Router } from 'express';
import { upload } from '../utils/file-upload';
import { documentParserService } from '../services/document-parser.service';
import { authenticate } from '../middleware/auth.middleware';
import { query } from '../config/database';

const router = Router();

router.post('/parse-resume', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
    }

    const parsed = await documentParserService.parseResume(req.file.path);

    // Store reference in database (optional, for tracking)
    const result = await query(
      `INSERT INTO parsed_documents (candidate_id, type, data, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id`,
      [req.candidateId, 'resume', JSON.stringify(parsed)]
    ).catch(() => ({ rows: [{ id: 'temp-' + Date.now() }] }));

    res.json({
      resumeId: result.rows[0].id,
      parsed,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/parse-job-description', authenticate, async (req, res, next) => {
  try {
    let parsed;

    if (req.body.text) {
      // Plain text input
      parsed = await documentParserService.parseJobDescription(req.body.text);
    } else if (req.file) {
      // File upload
      parsed = await documentParserService.parseJobDescription({ filePath: req.file.path });
    } else {
      return res.status(400).json({
        error: {
          code: 'NO_INPUT',
          message: 'Either text or file must be provided',
        },
      });
    }

    // Store reference in database (optional, for tracking)
    const result = await query(
      `INSERT INTO parsed_documents (candidate_id, type, data, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id`,
      [req.candidateId, 'job_description', JSON.stringify(parsed)]
    ).catch(() => ({ rows: [{ id: 'temp-' + Date.now() }] }));

    res.json({
      jdId: result.rows[0].id,
      parsed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
