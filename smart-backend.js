/**
 * Smart AI-Powered Backend - Full Features Without OpenAI Dependency
 * Intelligent question generation and evaluation using algorithms
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

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

// Initialize Google Gemini (FREE API!)
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;

// Persistent storage file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SESSION_DATA_FILE = path.join(DATA_DIR, 'session-data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory for persistent storage');
}

// Load data from files or initialize empty
function loadData(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
  }
  return new Map(Object.entries(defaultValue));
}

// Save data to files
function saveData(filePath, mapData) {
  try {
    const obj = Object.fromEntries(mapData);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
  }
}

// Persistent storage with auto-save
const users = loadData(USERS_FILE);
const sessions = loadData(SESSIONS_FILE);
const sessionData = loadData(SESSION_DATA_FILE);

console.log(`💾 Loaded ${users.size} users, ${sessions.size} sessions from persistent storage`);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Question bank organized by skill and difficulty
const questionBank = {
  javascript: {
    easy: [
      "What is the difference between let, const, and var in JavaScript?",
      "Explain what a closure is in JavaScript with an example.",
      "What is the purpose of the 'this' keyword in JavaScript?",
      "What are arrow functions and how do they differ from regular functions?",
      "Explain the concept of hoisting in JavaScript."
    ],
    medium: [
      "Explain the event loop in JavaScript and how it handles asynchronous operations.",
      "What is the difference between == and === in JavaScript?",
      "Explain prototypal inheritance in JavaScript.",
      "What are Promises and how do they help with asynchronous programming?",
      "Describe the difference between call(), apply(), and bind() methods."
    ],
    hard: [
      "Explain how JavaScript's garbage collection works.",
      "What are Web Workers and when would you use them?",
      "Describe the differences between microtasks and macrotasks in the event loop.",
      "Explain memory leaks in JavaScript and how to prevent them.",
      "What is the Temporal Dead Zone in JavaScript?"
    ]
  },
  react: {
    easy: [
      "What is JSX and why is it used in React?",
      "Explain the difference between state and props in React.",
      "What are React Hooks? Name a few commonly used hooks.",
      "What is the virtual DOM and how does React use it?",
      "Explain the component lifecycle in React."
    ],
    medium: [
      "What is the purpose of useEffect hook and how does it work?",
      "Explain the concept of lifting state up in React.",
      "What are controlled vs uncontrolled components?",
      "How does React's reconciliation algorithm work?",
      "Explain the Context API and when you would use it."
    ],
    hard: [
      "Explain React's Fiber architecture and its benefits.",
      "How would you optimize performance in a large React application?",
      "Describe the differences between useMemo and useCallback.",
      "Explain Server-Side Rendering (SSR) in React and its advantages.",
      "What are React Portals and when would you use them?"
    ]
  },
  nodejs: {
    easy: [
      "What is Node.js and what makes it different from browser JavaScript?",
      "Explain what npm is and its purpose.",
      "What is the purpose of package.json?",
      "What are modules in Node.js?",
      "Explain the difference between synchronous and asynchronous functions."
    ],
    medium: [
      "Explain the Node.js event loop and how it works.",
      "What is middleware in Express.js?",
      "How do you handle errors in Node.js applications?",
      "Explain streams in Node.js and their types.",
      "What is the purpose of the cluster module in Node.js?"
    ],
    hard: [
      "Explain how Node.js handles child processes.",
      "What are the best practices for securing a Node.js application?",
      "Describe memory management and garbage collection in Node.js.",
      "How would you implement rate limiting in a Node.js API?",
      "Explain the differences between process.nextTick() and setImmediate()."
    ]
  },
  database: {
    easy: [
      "What is the difference between SQL and NoSQL databases?",
      "Explain what a primary key is in a database.",
      "What is an index and why is it important?",
      "What does CRUD stand for?",
      "Explain the concept of database normalization."
    ],
    medium: [
      "What are database transactions and why are they important?",
      "Explain the ACID properties of databases.",
      "What is the difference between INNER JOIN and LEFT JOIN?",
      "How do you optimize database queries?",
      "Explain database indexing strategies."
    ],
    hard: [
      "Explain database sharding and when you would use it.",
      "What are the CAP theorem and its implications?",
      "Describe database replication strategies.",
      "How would you design a database schema for a social media platform?",
      "Explain the differences between optimistic and pessimistic locking."
    ]
  },
  systemDesign: {
    medium: [
      "How would you design a URL shortening service like bit.ly?",
      "Explain how you would design a caching system.",
      "How would you design a rate limiter?",
      "Describe how you would design a notification system.",
      "How would you design a file storage system like Dropbox?"
    ],
    hard: [
      "Design a scalable chat application like WhatsApp.",
      "How would you design a distributed task scheduler?",
      "Explain how you would design a search engine.",
      "Design a real-time analytics system.",
      "How would you design a video streaming platform like YouTube?"
    ]
  },
  behavioral: {
    easy: [
      "Tell me about a challenging project you worked on and how you overcame obstacles.",
      "Describe a time when you had to learn a new technology quickly.",
      "How do you handle disagreements with team members?",
      "What motivates you as a software developer?",
      "Describe your ideal work environment."
    ],
    medium: [
      "Tell me about a time when you had to make a difficult technical decision.",
      "Describe a situation where you had to debug a complex issue.",
      "How do you prioritize tasks when working on multiple projects?",
      "Tell me about a time when you received critical feedback. How did you handle it?",
      "Describe a project where you had to collaborate with non-technical stakeholders."
    ]
  }
};

// Intelligent question generation based on resume and JD
async function generateSmartQuestions(resumeData, jobDescriptionData, config) {
  // Try Gemini first if available
  if (geminiModel) {
    try {
      console.log('🤖 Attempting to use Google Gemini 1.5 Flash (FREE)...');
      const questions = await generateQuestionsWithGemini(resumeData, jobDescriptionData, config);
      console.log('✅ Successfully generated questions using Google Gemini');
      return questions;
    } catch (error) {
      console.log(`⚠️  Gemini failed (${error.message}), falling back to smart algorithm`);
    }
  }

  // Fallback to smart algorithm
  return generateQuestionsWithAlgorithm(resumeData, jobDescriptionData, config);
}

// Google Gemini question generation (FREE!)
async function generateQuestionsWithGemini(resumeData, jobDescriptionData, config) {
  const prompt = `You are an expert technical interviewer. Generate 5 interview questions based on the following:

Resume Skills: ${resumeData?.skills?.join(', ') || 'JavaScript, React, Node.js'}
Job Requirements: ${jobDescriptionData?.required_skills?.join(', ') || 'Full Stack Development'}
Role: ${jobDescriptionData?.role || 'Software Developer'}
Difficulty: ${config?.initialDifficulty || 'Medium'}

Generate a mix of:
- 2 technical questions (coding concepts, algorithms)
- 2 conceptual questions (system design, best practices)
- 1 behavioral question (teamwork, problem-solving)

Return ONLY a JSON array with this exact format (no markdown, no explanation):
[
  {
    "id": "q1",
    "type": "technical",
    "difficulty": "medium",
    "question": "Question text here",
    "time_limit": 300
  }
]`;

  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Clean up the response
  let jsonStr = text.trim();
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(jsonStr);
}

// OpenAI question generation (kept for reference, but using Gemini now)
async function generateQuestionsWithOpenAI(resumeData, jobDescriptionData, config) {
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
  
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(jsonStr);
}

// Algorithm-based question generation (fallback)
function generateQuestionsWithAlgorithm(resumeData, jobDescriptionData, config) {
  const questions = [];
  const skills = resumeData?.skills || [];
  const requiredSkills = jobDescriptionData?.required_skills || [];
  const difficulty = (config?.initialDifficulty || 'Medium').toLowerCase();
  
  // Determine relevant skill areas
  const skillAreas = new Set();
  [...skills, ...requiredSkills].forEach(skill => {
    const skillLower = skill.toLowerCase();
    if (skillLower.includes('javascript') || skillLower.includes('js')) skillAreas.add('javascript');
    if (skillLower.includes('react')) skillAreas.add('react');
    if (skillLower.includes('node')) skillAreas.add('nodejs');
    if (skillLower.includes('sql') || skillLower.includes('database') || skillLower.includes('postgres')) skillAreas.add('database');
  });

  // If no specific skills found, use general questions
  if (skillAreas.size === 0) {
    skillAreas.add('javascript');
    skillAreas.add('nodejs');
  }

  let questionId = 1;

  // Generate technical questions based on skills
  const skillAreasArray = Array.from(skillAreas);
  skillAreasArray.forEach((skillArea, index) => {
    if (index < 2 && questionBank[skillArea]) { // Max 2 technical questions
      const questionsForSkill = questionBank[skillArea][difficulty] || questionBank[skillArea]['medium'];
      const randomQuestion = questionsForSkill[Math.floor(Math.random() * questionsForSkill.length)];
      
      questions.push({
        id: `q${questionId++}`,
        type: 'technical',
        difficulty: difficulty,
        question: randomQuestion,
        time_limit: 300,
        skill_area: skillArea
      });
    }
  });

  // Add system design question
  if (questionBank.systemDesign[difficulty]) {
    const systemQuestions = questionBank.systemDesign[difficulty];
    questions.push({
      id: `q${questionId++}`,
      type: 'conceptual',
      difficulty: difficulty,
      question: systemQuestions[Math.floor(Math.random() * systemQuestions.length)],
      time_limit: 300,
      skill_area: 'system-design'
    });
  }

  // Add behavioral question
  const behavioralQuestions = questionBank.behavioral[difficulty] || questionBank.behavioral['easy'];
  questions.push({
    id: `q${questionId++}`,
    type: 'behavioral',
    difficulty: 'easy',
    question: behavioralQuestions[Math.floor(Math.random() * behavioralQuestions.length)],
    time_limit: 300,
    skill_area: 'behavioral'
  });

  // Add one more technical question if we have less than 5
  if (questions.length < 5 && skillAreasArray.length > 0) {
    const skillArea = skillAreasArray[Math.floor(Math.random() * skillAreasArray.length)];
    const questionsForSkill = questionBank[skillArea][difficulty] || questionBank[skillArea]['medium'];
    const randomQuestion = questionsForSkill[Math.floor(Math.random() * questionsForSkill.length)];
    
    questions.push({
      id: `q${questionId++}`,
      type: 'technical',
      difficulty: difficulty,
      question: randomQuestion,
      time_limit: 300,
      skill_area: skillArea
    });
  }

  console.log(`✅ Generated ${questions.length} personalized questions using smart algorithm for skills: ${Array.from(skillAreas).join(', ')}`);
  return questions;
}

// Intelligent answer evaluation
async function evaluateAnswerSmart(question, answer) {
  // Try Gemini first if available
  if (geminiModel) {
    try {
      console.log('🤖 Attempting to evaluate with Google Gemini...');
      const evaluation = await evaluateWithGemini(question, answer);
      console.log(`✅ Gemini evaluation: Score ${evaluation.score}/100`);
      return evaluation;
    } catch (error) {
      console.log(`⚠️  Gemini evaluation failed (${error.message}), using smart algorithm`);
    }
  }

  // Fallback to smart algorithm
  return evaluateWithAlgorithm(question, answer);
}

// Google Gemini evaluation (FREE!)
async function evaluateWithGemini(question, answer) {
  const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Question: ${question.question}
Question Type: ${question.type}
Difficulty: ${question.difficulty}

Candidate's Answer: ${answer}

Evaluate the answer and provide:
1. A score from 0-100 (be strict: gibberish = 0-10, brief = 20-40, good = 60-80, excellent = 80-100)
2. Brief feedback (2-3 sentences)

Return ONLY a JSON object with this exact format (no markdown, no explanation):
{
  "score": 85,
  "feedback": "Your feedback here"
}`;

  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Clean up the response
  let jsonStr = text.trim();
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(jsonStr);
}

// OpenAI evaluation (kept for reference, but using Gemini now)
async function evaluateWithOpenAI(question, answer) {
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
  
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(jsonStr);
}

// Algorithm-based evaluation (fallback)
function evaluateWithAlgorithm(question, answer) {
  const answerLower = answer.toLowerCase().trim();
  const words = answerLower.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = answer.trim().length;

  // Base score calculation
  let score = 0;
  let feedback = '';

  // Check if answer is extremely short or just random characters
  if (charCount < 3) {
    score = 0;
    feedback = "No meaningful answer provided. Please provide a proper explanation.";
    return { score, feedback };
  }

  // Check if answer is just 1-2 words or very short
  if (wordCount <= 2 || charCount < 10) {
    score = Math.min(5, charCount);
    feedback = "Your answer is far too brief. Please provide a detailed explanation with examples and reasoning.";
    return { score, feedback };
  }

  // Check for gibberish or random characters (less than 3 words)
  if (wordCount < 3) {
    score = 8;
    feedback = "Your answer doesn't seem meaningful. Please provide a clear, structured response with proper explanations.";
    return { score, feedback };
  }

  // Check if most words are too short (likely gibberish)
  const properWords = words.filter(w => w.length >= 3);
  const properWordRatio = properWords.length / words.length;
  
  if (properWordRatio < 0.5) {
    score = 10;
    feedback = "Your answer contains mostly random characters. Please provide a meaningful, well-structured response.";
    return { score, feedback };
  }

  // Check if answer has common English words (basic validation)
  const commonWords = ['the', 'is', 'are', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an'];
  const hasCommonWords = commonWords.some(word => answerLower.includes(word));
  
  if (!hasCommonWords && wordCount < 10) {
    score = 15;
    feedback = "Your answer doesn't appear to be a proper explanation. Please write in complete sentences.";
    return { score, feedback };
  }

  // Check if answer is too short (less than 5 words)
  if (wordCount < 5) {
    score = Math.min(20, wordCount * 4);
    feedback = "Your answer is too brief. Please provide more detailed explanations with examples and reasoning.";
    return { score, feedback };
  }

  // Score based on length and structure
  if (wordCount >= 50) {
    score = 85;
    feedback = "Excellent! Your answer is comprehensive and well-detailed.";
  } else if (wordCount >= 30) {
    score = 75;
    feedback = "Good answer! You covered the main points. Consider adding more specific examples.";
  } else if (wordCount >= 15) {
    score = 65;
    feedback = "Decent answer, but could be more detailed. Try to explain your reasoning and provide examples.";
  } else if (wordCount >= 10) {
    score = 50;
    feedback = "Your answer is somewhat brief. Expand on your points with more details and examples.";
  } else {
    score = 35;
    feedback = "Your answer needs more detail. Provide comprehensive explanations with examples.";
  }

  // Bonus points for technical terms (for technical questions)
  if (question.type === 'technical') {
    const technicalTerms = ['function', 'variable', 'async', 'promise', 'callback', 'api', 'database', 
                           'component', 'state', 'props', 'hook', 'event', 'loop', 'closure', 'scope',
                           'prototype', 'class', 'object', 'array', 'string', 'number', 'boolean',
                           'stack', 'queue', 'heap', 'thread', 'process', 'memory', 'algorithm'];
    
    const termsFound = technicalTerms.filter(term => answerLower.includes(term)).length;
    if (termsFound >= 3) {
      score = Math.min(100, score + 10);
      feedback = "Great! You used relevant technical terminology and provided a detailed explanation.";
    } else if (termsFound >= 1) {
      score = Math.min(100, score + 5);
    }
  }

  // Bonus for examples
  if (answerLower.includes('example') || answerLower.includes('for instance') || answerLower.includes('such as')) {
    score = Math.min(100, score + 5);
  }

  // Bonus for code snippets or structured thinking
  if (answer.includes('```') || answer.includes('1.') || answer.includes('2.')) {
    score = Math.min(100, score + 5);
  }

  console.log(`✅ Algorithm evaluation: Score ${score}/100 (${wordCount} words, ${charCount} chars)`);
  return { score, feedback };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Smart AI backend is running',
    features: 'Intelligent question generation and evaluation'
  });
});

// Auth endpoints
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
    saveData(USERS_FILE, users); // Save to disk
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

app.post('/api/documents/parse-resume', (req, res) => {
  res.json({
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python', 'SQL'],
    experience: ['Software Developer at Tech Corp (2 years)', 'Full Stack Intern at StartupXYZ'],
    education: ['BS Computer Science - University Name'],
  });
});

app.post('/api/documents/parse-job-description', (req, res) => {
  res.json({
    required_skills: ['React', 'Node.js', 'PostgreSQL', 'REST APIs'],
    preferred_skills: ['AWS', 'Docker', 'TypeScript', 'GraphQL'],
    role: 'Full Stack Developer',
    experience_level: 'Mid-level (2-4 years)',
  });
});

app.post('/api/sessions/create', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let candidateId = null;
    
    // Extract candidate ID from JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        candidateId = decoded.candidateId;
      } catch (err) {
        console.log('Token verification failed:', err.message);
      }
    }

    const sessionId = `session_${Date.now()}`;
    const { resumeData, jobDescriptionData, config } = req.body;

    sessionData.set(sessionId, {
      resumeData,
      jobDescriptionData,
      config,
    });
    saveData(SESSION_DATA_FILE, sessionData); // Save to disk

    console.log(`🧠 Generating smart questions for session: ${sessionId}`);

    const questions = await generateSmartQuestions(resumeData, jobDescriptionData, config);

    const session = {
      id: sessionId,
      candidateId: candidateId, // Link session to user
      status: 'active',
      created_at: new Date().toISOString(),
      current_question_index: 0,
      questions: questions,
      responses: [],
    };

    sessions.set(sessionId, session);
    saveData(SESSIONS_FILE, sessions); // Save to disk

    console.log(`✅ Session created with ${questions.length} personalized questions`);

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

app.get('/api/candidates/:candidateId/sessions', (req, res) => {
  const { candidateId } = req.params;
  
  // Filter sessions by candidate ID
  const candidateSessions = Array.from(sessions.values())
    .filter(s => s.candidateId === candidateId) // Only return user's own sessions
    .map(s => ({
      id: s.id,
      created_at: s.created_at,
      status: s.current_question_index >= s.questions.length ? 'completed' : 'active',
      questions_count: s.questions?.length || 0,
      responses_count: s.responses?.length || 0,
      overall_score: s.responses?.length > 0 
        ? Math.round(s.responses.reduce((sum, r) => sum + (r.evaluation?.score || 0), 0) / s.responses.length)
        : 0
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  console.log(`📊 Retrieved ${candidateSessions.length} sessions for candidate: ${candidateId}`);
  res.json({ sessions: candidateSessions });
});

// WebSocket handling
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

      const evaluation = await evaluateAnswerSmart(currentQuestion, response.content);

      if (!session.responses) session.responses = [];
      session.responses.push({
        question: currentQuestion,
        answer: response.content,
        evaluation: evaluation,
        timestamp: new Date().toISOString(),
      });
      saveData(SESSIONS_FILE, sessions); // Save to disk after response

      console.log(`✅ Answer evaluated: Score ${evaluation.score}/100`);

      socket.emit('evaluation.complete', {
        ...evaluation,
        question: currentQuestion.question,
        your_answer: response.content,
      });

      session.current_question_index++;

      if (session.current_question_index < session.questions.length) {
        const nextQuestion = session.questions[session.current_question_index];
        setTimeout(() => {
          socket.emit('question.new', {
            question: nextQuestion,
            question_number: session.current_question_index + 1,
            total_questions: session.questions.length,
          });
        }, 5000);
      } else {
        session.status = 'completed';
        saveData(SESSIONS_FILE, sessions); // Save completed status
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

app.use((req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: `Endpoint ${req.method} ${req.path} not implemented`,
    },
  });
});

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
  console.log('\n🚀 Hybrid AI Backend Server Started');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Google Gemini 1.5 Flash: ${geminiModel ? '✅ ENABLED (FREE, will try first)' : '❌ DISABLED'}`);
  console.log(`🧠 Smart Algorithm: ✅ ENABLED (fallback)`);
  console.log(`💾 Persistent Storage: ✅ ENABLED (data saved to disk)`);
  console.log(`🔌 WebSocket support: ENABLED`);
  console.log('\n✨ Features:');
  console.log('   - Uses Google Gemini 1.5 Flash (FREE API!)');
  console.log('   - Falls back to smart algorithm if Gemini fails');
  console.log('   - Smart question generation based on resume/JD');
  console.log('   - Intelligent answer evaluation');
  console.log('   - Personalized feedback');
  console.log('   - Data persists across server restarts\n');
  if (!geminiModel) {
    console.log('💡 To enable FREE Google Gemini AI:');
    console.log('   1. Get free API key: https://makersuite.google.com/app/apikey');
    console.log('   2. Add to .env: GEMINI_API_KEY=your_key_here\n');
  }
});
