# AI-Powered Mock Interview Platform

An intelligent mock interview platform that simulates realistic technical interview environments using AI. Built for the Hack2Hire hackathon.

## Features

- 📄 **Resume & JD Analysis**: Automatically extracts skills and experience from resumes and job descriptions
- 🤖 **AI-Powered Questions**: Generates contextually relevant technical, conceptual, behavioral, and scenario-based questions
- 📈 **Dynamic Difficulty**: Adapts question difficulty based on candidate performance
- ⏱️ **Time Management**: Enforces strict time constraints with automatic submission
- 🎯 **Objective Scoring**: Multi-dimensional evaluation (accuracy, clarity, depth, relevance, time efficiency)
- 📊 **Comprehensive Reports**: Detailed readiness reports with strengths, weaknesses, and actionable feedback
- 🔄 **Real-time Updates**: WebSocket-based live interview experience
- 📉 **Performance Trends**: Track improvement across multiple sessions

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **AI**: OpenAI GPT-4
- **Real-time**: Socket.io

### Frontend
- **Framework**: Next.js 13 (React)
- **Styling**: TailwindCSS
- **State Management**: React Query
- **Code Editor**: Monaco Editor
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- OpenAI API Key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Bhuvaneshwari244/AI-Powered-Interview-Hackathon.git
cd AI-Powered-Interview-Hackathon
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key and other configurations
```

4. Start services with Docker:
```bash
npm run docker:up
```

5. Run database migrations:
```bash
npm run migrate
```

6. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Project Structure

```
ai-mock-interview-platform/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── db/             # Database migrations and models
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── index.ts        # Entry point
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities and helpers
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── docker-compose.yml     # Docker services configuration
└── package.json           # Root package.json (monorepo)
```

## Development

### Running Tests
```bash
npm run test
```

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

### Building for Production
```bash
npm run build
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new candidate
- `POST /api/auth/login` - Login and get JWT token

### Documents
- `POST /api/documents/parse-resume` - Upload and parse resume
- `POST /api/documents/parse-job-description` - Upload and parse job description

### Sessions
- `POST /api/sessions/create` - Create new interview session
- `GET /api/sessions/:sessionId` - Get session details
- `POST /api/sessions/:sessionId/terminate` - Terminate session early

### Interview
- `GET /api/sessions/:sessionId/current-question` - Get current question
- `POST /api/sessions/:sessionId/submit-response` - Submit answer

### Reports
- `GET /api/sessions/:sessionId/report` - Get readiness report
- `GET /api/candidates/:candidateId/trend-report` - Get performance trends

## WebSocket Events

### Client → Server
- `session.join` - Join interview session
- `response.submit` - Submit answer
- `heartbeat` - Keep connection alive

### Server → Client
- `session.connected` - Session joined successfully
- `question.new` - New question available
- `evaluation.complete` - Answer evaluated
- `session.terminated` - Session ended early
- `timer.update` - Time remaining update

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET` - Secret for JWT token signing

## Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Production Build
```bash
npm run build
npm run start
```

## Contributing

This is a hackathon project. Contributions are welcome!

## License

MIT

## Hackathon Details

- **Event**: Hack2Hire: AI-Powered Interview Hackathon
- **Deadline**: June 1st, 2026 6:00pm
- **Submission**: Public GitHub repository with screen recording video

## Contact

For questions or support, contact the development team.
