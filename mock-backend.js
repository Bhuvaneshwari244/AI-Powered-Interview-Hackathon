/**
 * Temporary Mock Backend Server
 * Use this while setting up PostgreSQL and Redis
 * 
 * Run with: node mock-backend.js
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;
const JWT_SECRET = 'temporary-mock-secret-key-for-testing';

// In-memory storage (will reset when server restarts)
const users = new Map();
const sessions = new Map();

app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock backend is running' });
});

// Auth - Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Validation
    if (!email || !name || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, name, and password are required',
        },
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
        },
      });
    }

    // Check if user exists
    if (users.has(email)) {
      return res.status(400).json({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
        },
      });
    }

    // Create user
    const userId = `user_${Date.now()}`;
    const user = {
      id: userId,
      email,
      name,
      password, // In real app, this would be hashed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.set(email, user);

    // Generate token
    const token = jwt.sign({ candidateId: userId }, JWT_SECRET, { expiresIn: '24h' });

    console.log(`✅ User registered: ${email}`);

    res.status(201).json({
      token,
      candidate: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed',
      },
    });
  }
});

// Auth - Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    }

    // Find user
    const user = users.get(email);
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Generate token
    const token = jwt.sign({ candidateId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    console.log(`✅ User logged in: ${email}`);

    res.json({
      token,
      candidate: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed',
      },
    });
  }
});

// Mock endpoints for other features
app.post('/api/documents/parse-resume', (req, res) => {
  res.json({
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    experience: ['Software Developer at Tech Corp', 'Intern at StartupXYZ'],
    education: ['BS Computer Science'],
  });
});

app.post('/api/documents/parse-job-description', (req, res) => {
  res.json({
    required_skills: ['React', 'Node.js', 'PostgreSQL'],
    preferred_skills: ['AWS', 'Docker', 'TypeScript'],
    role: 'Full Stack Developer',
  });
});

app.post('/api/sessions/create', (req, res) => {
  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    status: 'active',
    created_at: new Date().toISOString(),
    current_question_index: 0,
    questions: [
      {
        id: 'q1',
        type: 'technical',
        difficulty: 'medium',
        question: 'Explain the difference between let, const, and var in JavaScript.',
        time_limit: 300,
      },
      {
        id: 'q2',
        type: 'conceptual',
        difficulty: 'medium',
        question: 'What is the event loop in Node.js and how does it work?',
        time_limit: 300,
      },
      {
        id: 'q3',
        type: 'behavioral',
        difficulty: 'easy',
        question: 'Describe a challenging project you worked on and how you overcame obstacles.',
        time_limit: 300,
      }
    ]
  };
  
  sessions.set(sessionId, session);
  
  console.log(`✅ Session created: ${sessionId}`);
  
  res.json({
    sessionId: sessionId,  // Frontend expects camelCase
    session_id: sessionId, // Keep snake_case for compatibility
    status: 'active',
  });
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { message: 'Session not found' } });
  }
  res.json(session);
});

app.get('/api/sessions/:sessionId/current-question', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { message: 'Session not found' } });
  }
  
  const currentQuestion = session.questions[session.current_question_index];
  if (!currentQuestion) {
    return res.json({ completed: true, message: 'All questions completed' });
  }
  
  res.json({
    question: currentQuestion,
    question_number: session.current_question_index + 1,
    total_questions: session.questions.length,
  });
});

app.post('/api/sessions/:sessionId/submit-response', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { message: 'Session not found' } });
  }
  
  // Move to next question
  session.current_question_index++;
  
  const hasMoreQuestions = session.current_question_index < session.questions.length;
  
  res.json({
    success: true,
    evaluation: {
      score: Math.floor(Math.random() * 30) + 70, // Random score 70-100
      feedback: 'Good answer! You demonstrated understanding of the concept.',
    },
    has_more_questions: hasMoreQuestions,
  });
});

app.get('/api/sessions/:sessionId/report', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { message: 'Session not found' } });
  }
  
  // Generate mock report
  const overallScore = Math.floor(Math.random() * 30) + 70;
  
  res.json({
    report: {
      sessionId: req.params.sessionId,
      overallScore: overallScore,
      readinessLevel: overallScore >= 80 ? 'Ready' : overallScore >= 60 ? 'Needs Improvement' : 'Not Ready',
      skillAreaBreakdown: [
        {
          skillArea: 'JavaScript',
          score: Math.floor(Math.random() * 30) + 70,
          questionsAsked: 1,
          averageTimeSpent: 180,
        },
        {
          skillArea: 'Node.js',
          score: Math.floor(Math.random() * 30) + 70,
          questionsAsked: 1,
          averageTimeSpent: 200,
        },
        {
          skillArea: 'Communication',
          score: Math.floor(Math.random() * 30) + 70,
          questionsAsked: 1,
          averageTimeSpent: 150,
        },
      ],
      strengths: [
        {
          area: 'Technical Knowledge',
          description: 'Demonstrated good understanding of core concepts',
          evidence: ['Clear explanations', 'Used proper terminology'],
        },
      ],
      weaknesses: [
        {
          area: 'Answer Depth',
          description: 'Answers could be more detailed with examples',
          impact: 'Medium',
          recommendations: [
            'Provide specific examples from your experience',
            'Explain the reasoning behind your answers',
          ],
        },
      ],
      timeManagement: {
        totalTime: 530,
        averageTimePerQuestion: 177,
        questionsOverTime: 0,
        timeEfficiencyScore: 85,
      },
      recommendations: [
        {
          area: 'Interview Preparation',
          suggestion: 'Practice explaining technical concepts with real-world examples',
        },
      ],
    },
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('session.join', (data) => {
    const { sessionId } = data;
    console.log(`📥 Client joining session: ${sessionId}`);
    
    socket.join(sessionId);
    
    const session = sessions.get(sessionId);
    if (session) {
      socket.emit('session.connected', {
        session_id: sessionId,
        status: 'connected',
      });
      
      // Send first question
      const currentQuestion = session.questions[session.current_question_index];
      if (currentQuestion) {
        socket.emit('question.new', {
          question: currentQuestion,
          question_number: session.current_question_index + 1,
          total_questions: session.questions.length,
        });
      }
    } else {
      socket.emit('error', { message: 'Session not found' });
    }
  });
  
  socket.on('response.submit', (data) => {
    const { sessionId, response } = data;
    console.log(`📝 Response submitted for session: ${sessionId}`);
    
    const session = sessions.get(sessionId);
    if (session) {
      // Simulate evaluation
      socket.emit('evaluation.complete', {
        score: Math.floor(Math.random() * 30) + 70,
        feedback: 'Good answer! You demonstrated understanding of the concept.',
      });
      
      // Move to next question
      session.current_question_index++;
      
      if (session.current_question_index < session.questions.length) {
        const nextQuestion = session.questions[session.current_question_index];
        socket.emit('question.new', {
          question: nextQuestion,
          question_number: session.current_question_index + 1,
          total_questions: session.questions.length,
        });
      } else {
        socket.emit('session.completed', {
          message: 'Interview completed!',
          total_questions: session.questions.length,
        });
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Catch-all for unimplemented endpoints
app.use((req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: `Endpoint ${req.method} ${req.path} not implemented in mock backend`,
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

server.listen(PORT, () => {
  console.log('\n🚀 Mock Backend Server Started');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket support: ENABLED`);
  console.log('\n⚠️  This is a TEMPORARY mock backend for testing');
  console.log('   Follow SETUP_INSTRUCTIONS.md to set up the real backend\n');
  console.log('📝 Registered users will be stored in memory');
  console.log('   (Data will be lost when server restarts)\n');
});
