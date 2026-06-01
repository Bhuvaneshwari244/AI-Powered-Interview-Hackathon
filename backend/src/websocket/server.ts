import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authService } from '../services/auth.service';
import { sessionManagerService } from '../services/session-manager.service';
import type { WSClientEvent, WSServerEvent } from '../types';

export class WebSocketServer {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const { candidateId } = authService.verifyToken(token);
        socket.data.candidateId = candidateId;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('session.join', async (payload: { sessionId: string }) => {
        try {
          const session = await sessionManagerService.getSession(payload.sessionId);

          if (!session) {
            socket.emit('error', {
              message: 'Session not found',
              code: 'SESSION_NOT_FOUND',
            });
            return;
          }

          if (session.candidateId !== socket.data.candidateId) {
            socket.emit('error', {
              message: 'Access denied',
              code: 'FORBIDDEN',
            });
            return;
          }

          socket.join(payload.sessionId);

          socket.emit('session.connected', {
            sessionId: payload.sessionId,
            currentState: session.state,
          });

          // Start timer for current question
          this.startQuestionTimer(socket, payload.sessionId, session.state.questions[session.state.currentQuestionIndex]);
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to join session',
            code: 'JOIN_ERROR',
          });
        }
      });

      socket.on('response.submit', async (payload: { sessionId: string; response: any }) => {
        try {
          const result = await sessionManagerService.submitResponse(
            payload.sessionId,
            payload.response
          );

          socket.emit('evaluation.complete', {
            evaluation: result.evaluation,
          });

          if (result.terminated) {
            socket.emit('session.terminated', {
              reason: result.terminationReason || 'Session terminated',
              partialReport: null, // Would generate partial report here
            });
          } else if (result.nextQuestion) {
            socket.emit('question.new', {
              question: result.nextQuestion,
            });

            // Start timer for next question
            this.startQuestionTimer(socket, payload.sessionId, result.nextQuestion);
          } else if (result.sessionComplete) {
            socket.emit('session.completed', {
              message: 'Interview completed',
            });
          }
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to submit response',
            code: 'SUBMIT_ERROR',
          });
        }
      });

      socket.on('heartbeat', (payload: { timestamp: number }) => {
        socket.emit('heartbeat', { timestamp: Date.now() });
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private startQuestionTimer(socket: any, sessionId: string, question: any) {
    let remainingTime = question.timeLimit;

    const timer = setInterval(() => {
      remainingTime--;

      socket.emit('timer.update', {
        remainingTime,
      });

      if (remainingTime <= 0) {
        clearInterval(timer);
        socket.emit('timer.expired', {
          message: 'Time limit exceeded',
        });
      }
    }, 1000);

    // Store timer reference to clear on disconnect
    socket.data.timer = timer;

    socket.on('disconnect', () => {
      if (socket.data.timer) {
        clearInterval(socket.data.timer);
      }
    });
  }
}
