/**
 * AI-Powered Mock Backend Server with OpenAI Integration
 * Real AI question generation and answer evaluation
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const OpenAI = require('openai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'temporary-mock-secret-key-for-testing';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory storage
const users = new Map();
const sessions = new Map();
const sessionData = new Map(); // Store resume/JD data per session

app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AI-powered backend is running',
    openai: !!process.env.OPENAI_API_KEY 
  });
});

// Auth - Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email, name, and password are required' }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
      });
    }

    if (users.has(email)) {
      return res.status(400).json({
        error: { code: 'USER_EXISTS', message: 'User with this email already exists' }
      });
    }

    const userId = `user_${Date.now()}`;
    const user = {
      id: userId,
      email,
      name,
      password,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.set(email, user);
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
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' }
    });
  }
});

// Auth - Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
      });
    }

    const user = users.get(email);
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

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
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
    });
  }
});

// Parse resume (mock)
app.post('/api/documents/parse-resume', (req, res) => {
  res.json({
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python', 'SQL'],
    experience: ['Software Developer at Tech Corp (2 years)', 'Full Stack Intern at StartupXYZ'],
    education: ['BS Computer Science - University Name'],
  });
});

// Parse job description (mock)
app.post('/api/documents/parse-job-description', (req, res) => {
  res.json({
    required_skills: ['React', 'Node.js', 'PostgreSQL', 'REST APIs'],
    preferred_skills: ['AWS', 'Docker', 'TypeScript', 'GraphQL'],
    role: 'Full Stack Developer',
    experience_level: 'Mid-level (2-4 years)',
  });
});

// Create session with AI question generation
app.post('/api/sessions/create', async (req, res) => {
  try {
    const sessionId = `session_${Date.now()}`;
    const { resumeData, jobDescriptionData, config } = req.body;

    // Store session data for question generation
    sessionData.set(sessionId, {
      resumeData,
      jobDescriptionData,
      config,
    });

    console.log(`🤖 Generating AI questions for session: ${sessionId}`);

    // Generate questions using OpenAI
    const questions = await generateQuestions(resumeData, jobDescriptionData, config);

    const session = {
      id: sessionId,
      status: 'active',
      created_at: new Date().toISOString(),
      current_question_index: 0,
      questions: questions,
      responses: [],
    };

    sessions.set(sessionId, session);

    console.log(`✅ Session created with ${questions.length} AI-generated questions`);

    res.json({
      sessionId: sessionId,
      session_id: sessionId,
      status: 'active',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create session' }
    });
  }
});

// Generate questions using OpenAI
async function generateQuestions(resumeData, jobDescriptionData, config) {
  try {
    const prompt = `You are an expert technical interviewer. Generate 5 interview questions based on the following:

Resume Skills: ${resumeData?.skills?.join(', ') || 'JavaScript, React, Node.js'}
Job Requirements: ${jobDescriptionData?.required_skills?.join(', ') || 'Full Stack Development'}
Role: ${jobDescriptionData?.role || 'Software Developer'}
Difficulty: ${config?.initialDifficulty || 'Medium'}

Generate a mix of:
- 2 technical questions (coding concepts, algorithms)
- 2 conceptual questions (system design, best practices)
- 1 behavioral question (teamwork, problem-solving)

Return ONLY a JSON array with this exact format:
[
  {
    "id": "q1",
    "type": "technical",
    "difficulty": "medium",
    "question": "Question text here",
    "time_limit": 300
  }
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert technical interviewer. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0].message.content.trim();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }

    const questions = JSON.parse(jsonStr);
    console.log(`✅ Generated ${questions.length} questions using GPT-3.5-turbo`);
    return questions;

  } catch (error) {
    console.error('❌ OpenAI question generation failed:', error.message);
    // Fallback to default questions
    return [
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
    ];
  }
}

// Evaluate answer using OpenAI
async function evaluateAnswer(question, answer) {
  try {
    const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Question: ${question.question}
Question Type: ${question.type}
Difficulty: ${question.difficulty}

Candidate's Answer: ${answer}

Evaluate the answer and provide:
1. A score from 0-100
2. Brief feedback (2-3 sentences)

Return ONLY a JSON object with this exact format:
{
  "score": 85,
  "feedback": "Your feedback here"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert technical interviewer. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = completion.choices[0].message.content.trim();
    
    // Extract JSON from response
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }

    const evaluation = JSON.parse(jsonStr);
    console.log(`✅ Answer evaluated: Score ${evaluation.score}/100`);
    return evaluation;

  } catch (error) {
    console.error('❌ OpenAI evaluation failed:', error.message);
    // Fallback evaluation
    const wordCount = answer.trim().split(/\s+/).length;
    const score = Math.min(100, Math.max(30, wordCount * 2));
    return {
      score: score,
      feedback: 'Your answer has been recorded. Consider providing more detailed explanations with examples.',
    };
  }
}

app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { message: 'Session not found' } });
  }
  res.json(session);
});

app.get('/api/sessions/:sessionId/report', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { message: 'Session not found' } });
  }

  // Calculate overall score from responses
  const scores = session.responses?.map(r => r.evaluation?.score || 0) || [];
  const overallScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 75;

  res.json({
    report: {
      sessionId: req.params.sessionId,
      overallScore: overallScore,
      readinessLevel: overallScore >= 80 ? 'Ready' : overallScore >= 60 ? 'Needs Improvement' : 'Not Ready',
      skillAreaBreakdown: [
        {
          skillArea: 'Technical Skills',
          score: scores[0] || 75,
          questionsAsked: Math.min(2, session.questions.length),
          averageTimeSpent: 180,
        },
        {
          skillArea: 'Problem Solving',
          score: scores[1] || 75,
          questionsAsked: Math.min(2, session.questions.length),
          averageTimeSpent: 200,
        },
        {
          skillArea: 'Communication',
          score: scores[2] || 75,
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
        totalTime: session.responses?.length * 180 || 540,
        averageTimePerQuestion: 180,
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

// Get all sessions for a candidate
app.get('/api/candidates/:candidateId/sessions', (req, res) => {
  const candidateSessions = Array.from(sessions.values())
    .filter(s => s.status === 'active' || s.status === 'completed')
    .map(s => ({
      id: s.id,
      created_at: s.created_at,
      status: s.status,
      questions_count: s.questions?.length || 0,
      responses_count: s.responses?.length || 0,
    }));

  res.json({ sessions: candidateSessions });
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

  socket.on('response.submit', async (data) => {
    const { sessionId, response } = data;
    console.log(`📝 Evaluating response for session: ${sessionId}`);

    const session = sessions.get(sessionId);
    if (session) {
      const currentQuestion = session.questions[session.current_question_index];

      // Evaluate answer using OpenAI
      const evaluation = await evaluateAnswer(currentQuestion, response.content);

      // Store response
      if (!session.responses) session.responses = [];
      session.responses.push({
        question: currentQuestion,
        answer: response.content,
        evaluation: evaluation,
        timestamp: new Date().toISOString(),
      });

      socket.emit('evaluation.complete', {
        ...evaluation,
        question: currentQuestion.question,
        your_answer: response.content,
      });

      // Move to next question
      session.current_question_index++;

      if (session.current_question_index < session.questions.length) {
        const nextQuestion = session.questions[session.current_question_index];
        // Wait 5 seconds before showing next question (time to read feedback)
        setTimeout(() => {
          socket.emit('question.new', {
            question: nextQuestion,
            question_number: session.current_question_index + 1,
            total_questions: session.questions.length,
          });
        }, 5000);
      } else {
        // Wait 3 seconds before completing
        setTimeout(() => {
          socket.emit('session.completed', {
            message: 'Interview completed!',
            total_questions: session.questions.length,
          });
        }, 3000);
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
      message: `Endpoint ${req.method} ${req.path} not implemented`,
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
  console.log('\n🚀 AI-Powered Backend Server Started');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 OpenAI Integration: ${process.env.OPENAI_API_KEY ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`🔌 WebSocket support: ENABLED`);
  console.log('\n✨ Features:');
  console.log('   - AI-generated interview questions');
  console.log('   - Real-time answer evaluation');
  console.log('   - Personalized feedback\n');
});
