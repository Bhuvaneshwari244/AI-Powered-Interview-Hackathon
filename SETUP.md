# AI Mock Interview Platform - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Start Services
```bash
# Start Docker services (PostgreSQL, Redis)
npm run docker:up

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Project Structure

```
ai-mock-interview-platform/
├── backend/                 # Express API
│   ├── src/
│   │   ├── config/         # Database, Redis, environment
│   │   ├── db/             # Schema and migrations
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript definitions
│   │   ├── utils/          # Utilities
│   │   ├── websocket/      # WebSocket server
│   │   └── index.ts        # Entry point
│   └── package.json
├── frontend/               # Next.js app
│   ├── src/
│   │   ├── app/           # Pages
│   │   └── lib/           # API client, WebSocket
│   └── package.json
├── docker-compose.yml     # PostgreSQL + Redis
└── package.json           # Root package.json
```

## Features Implemented

✅ Authentication (JWT-based)
✅ Document parsing (Resume & JD with LLM)
✅ Question generation (AI-powered, adaptive difficulty)
✅ Response evaluation (Multi-dimensional scoring)
✅ Session management (Redis state, PostgreSQL persistence)
✅ WebSocket real-time updates
✅ Report generation (Comprehensive readiness reports)
✅ Performance tracking & trends
✅ Frontend UI (Auth, Interview, Reports)
✅ Error handling & rate limiting
✅ Caching & optimization

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login

### Documents
- POST /api/documents/parse-resume
- POST /api/documents/parse-job-description

### Sessions
- POST /api/sessions/create
- GET /api/sessions/:sessionId
- POST /api/sessions/:sessionId/terminate
- GET /api/sessions/:sessionId/current-question
- POST /api/sessions/:sessionId/submit-response

### Reports
- GET /api/sessions/:sessionId/report
- GET /api/candidates/:candidateId/trend-report
- GET /api/candidates/:candidateId/sessions

## WebSocket Events

### Client → Server
- session.join
- response.submit
- heartbeat

### Server → Client
- session.connected
- question.new
- evaluation.complete
- session.terminated
- timer.update

## Development Commands

```bash
# Install dependencies
npm install

# Start Docker services
npm run docker:up

# Stop Docker services
npm run docker:down

# Run migrations
npm run migrate

# Start development
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

Required:
- DATABASE_URL - PostgreSQL connection
- REDIS_URL - Redis connection
- OPENAI_API_KEY - OpenAI API key
- JWT_SECRET - JWT signing secret (min 32 chars)

Optional:
- PORT - Server port (default: 3001)
- NODE_ENV - Environment (development/production)
- MAX_FILE_SIZE - Max upload size (default: 10MB)

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart services
npm run docker:down
npm run docker:up
```

### Redis Connection Issues
```bash
# Check Redis
docker logs interview-platform-redis
```

### Migration Issues
```bash
# Re-run migrations
npm run migrate
```

## Production Deployment

1. Set environment variables
2. Build applications: `npm run build`
3. Start services: `npm run docker:up`
4. Run migrations: `npm run migrate`
5. Start servers: `npm start`

## Notes

- Ensure OpenAI API key is set for question generation and evaluation
- PostgreSQL and Redis must be running before starting the application
- Default credentials are in docker-compose.yml (change for production)
