import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export interface AuthRequest extends Request {
  candidateId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7);

    try {
      const { candidateId } = authService.verifyToken(token);
      req.candidateId = candidateId;
      next();
    } catch (error) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
