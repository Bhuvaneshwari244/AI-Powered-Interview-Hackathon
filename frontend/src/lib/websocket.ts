import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export class WebSocketClient {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(WS_URL, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('session.join', { sessionId });
    }
  }

  submitResponse(sessionId: string, response: any) {
    if (this.socket) {
      this.socket.emit('response.submit', { sessionId, response });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export const wsClient = new WebSocketClient();
