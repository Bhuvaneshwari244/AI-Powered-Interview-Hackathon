import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { env } from './config/env';
import { pool } from './config/database';
import { connectRedis, redisClient } from './config/redis';
import { apiRateLimiter } from './middleware/rate-limit.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import documentsRoutes from './routes/documents.routes';
import sessionsRoutes from './routes/sessions.routes';
import reportsRoutes from './routes/reports.routes';
import simulationRoutes from './routes/simulation.routes';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AI Mock Interview Platform API',
    version: '1.0.0',
    status: 'running',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', apiRateLimiter, documentsRoutes);
app.use('/api/sessions', apiRateLimiter, sessionsRoutes);
app.use('/api/simulation', apiRateLimiter, simulationRoutes);
app.use('/api', apiRateLimiter, reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      path: req.path,
    },
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Start listening
    httpServer.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${env.PORT}/health`);
      console.log(`📚 API: http://localhost:${env.PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
