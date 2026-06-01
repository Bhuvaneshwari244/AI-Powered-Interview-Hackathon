import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { env } from '../config/env';
import type { Candidate, RegisterRequest, LoginRequest, AuthResponse } from '../types';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, name, password } = data;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM candidates WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await query(
      `INSERT INTO candidates (email, name, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, name, created_at, updated_at`,
      [email, name, password_hash]
    );

    const candidate = result.rows[0];

    // Generate JWT token
    const token = this.generateToken(candidate.id);

    return {
      token,
      candidate: {
        id: candidate.id,
        email: candidate.email,
        name: candidate.name,
        created_at: candidate.created_at,
        updated_at: candidate.updated_at,
      },
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const result = await query(
      'SELECT id, email, name, password_hash, created_at, updated_at FROM candidates WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const candidate = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, candidate.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(candidate.id);

    return {
      token,
      candidate: {
        id: candidate.id,
        email: candidate.email,
        name: candidate.name,
        created_at: candidate.created_at,
        updated_at: candidate.updated_at,
      },
    };
  }

  generateToken(candidateId: string): string {
    return jwt.sign(
      { candidateId },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  verifyToken(token: string): { candidateId: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { candidateId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getCandidateById(id: string): Promise<Omit<Candidate, 'password_hash'> | null> {
    const result = await query(
      'SELECT id, email, name, created_at, updated_at FROM candidates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

export const authService = new AuthService();
