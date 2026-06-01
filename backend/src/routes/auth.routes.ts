import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);
    res.status(201).json(result);
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

router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);
    res.json(result);
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
    if (error instanceof Error && error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: error.message,
        },
      });
    }
    next(error);
  }
});

export default router;
