/**
 * Test Script for Interview Simulation Engine
 * 
 * This script demonstrates the simulation engine with various scenarios
 */

import { interviewSimulationEngine, InterviewLog } from '../services/interview-simulation-engine';

console.log('='.repeat(80));
console.log('Interview Simulation Engine - Test Suite');
console.log('='.repeat(80));
console.log();

// Test Case 1: Successful Interview (High Performance)
console.log('Test Case 1: Successful Interview (High Performance)');
console.log('-'.repeat(80));

const successfulInterview: InterviewLog = {
  sessionId: 'test-session-1',
  candidateId: 'candidate-1',
  startTime: new Date(),
  questions: [
    {
      id: 'q1',
      type: 'technical',
      difficulty: 'Easy',
      skillArea: 'Algorithms',
      text: 'Implement a function to reverse a string',
      timeLimit: 180,
      expectedResponseFormat: 'code',
    },
    {
      id: 'q2',
      type: 'technical',
      difficulty: 'Medium',
      skillArea: 'Algorithms',
      text: 'Find the longest palindromic substring',
      timeLimit: 300,
      expectedResponseFormat: 'code',
    },
    {
      id: 'q3',
      type: 'conceptual',
      difficulty: 'Medium',
      skillArea: 'Data Structures',
      text: 'Explain the difference between a stack and a queue',
      timeLimit: 240,
      expectedResponseFormat: 'text',
    },
    {
      id: 'q4',
      type: 'behavioral',
      difficulty: 'Medium',
      skillArea: 'Communication',
      text: 'Describe a time when you had to debug a complex issue',
      timeLimit: 300,
      expectedResponseFormat: 'text',
    },
  ],
  responses: [
    {
      questionId: 'q1',
      content: 'function reverse(str) { return str.split("").reverse().join(""); }',
      format: 'code',
      timeSpent: 120,
      submittedAt: new Date(),
    },
    {
      questionId: 'q2',
      content: 'Used dynamic programming approach with O(n^2) complexity',
      format: 'code',
      timeSpent: 280,
      submittedAt: new Date(),
    },
    {
      questionId: 'q3',
      content: 'Stack is LIFO, Queue is FIFO. Stack uses push/pop, Queue uses enqueue/dequeue',
      format: 'text',
      timeSpent: 200,
      submittedAt: new Date(),
    },
    {
      questionId: 'q4',
      content: 'Used systematic debugging approach with logging and binary search',
      format: 'text',
      timeSpent: 250,
      submittedAt: new Date(),
    },
  ],
  evaluations: [
    {
      questionId: 'q1',
      score: 85,
      dimensions: {
        accuracy: 90,
        clarity: 85,
        depth: 80,
        relevance: 90,
        timeEfficiency: 100,
      },
      feedback: 'Excellent solution with clean code',
      strengths: ['Correct implementation', 'Good time management'],
      improvements: ['Could add error handling'],
    },
    {
      questionId: 'q2',
      score: 80,
      dimensions: {
        accuracy: 85,
        clarity: 75,
        depth: 80,
        relevance: 85,
        timeEfficiency: 100,
      },
      feedback: 'Good approach with correct complexity analysis',
      strengths: ['Correct algorithm', 'Good complexity understanding'],
      improvements: ['Could optimize space complexity'],
    },
    {
      questionId: 'q3',
      score: 90,
      dimensions: {
        accuracy: 95,
        clarity: 90,
        depth: 85,
        relevance: 95,
        timeEfficiency: 100,
      },
      feedback: 'Excellent explanation with clear examples',
      strengths: ['Clear explanation', 'Good examples'],
      improvements: [],
    },
    {
      questionId: 'q4',
      score: 85,
      dimensions: {
        accuracy: 85,
        clarity: 85,
        depth: 85,
        relevance: 90,
        timeEfficiency: 100,
      },
      feedback: 'Good structured response using STAR method',
      strengths: ['Systematic approach', 'Clear communication'],
      improvements: ['Could provide more specific metrics'],
    },
  ],
  config: {
    duration: 45,
    initialDifficulty: 'Medium',
    performanceThreshold: 40,
    minQuestionsBeforeTermination: 5,
  },
};

const result1 = interviewSimulationEngine.processInterviewLog(successfulInterview);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log();

// Test Case 2: Early Termination (Poor Performance)
console.log('Test Case 2: Early Termination (Poor Performance)');
console.log('-'.repeat(80));

const poorPerformanceInterview: InterviewLog = {
  sessionId: 'test-session-2',
  candidateId: 'candidate-2',
  startTime: new Date(),
  questions: Array(10)
    .fill(null)
    .map((_, i) => ({
      id: `q${i + 1}`,
      type: 'technical' as const,
      difficulty: 'Medium' as const,
      skillArea: 'Programming',
      text: `Question ${i + 1}`,
      timeLimit: 300,
      expectedResponseFormat: 'code' as const,
    })),
  responses: Array(10)
    .fill(null)
    .map((_, i) => ({
      questionId: `q${i + 1}`,
      content: 'Incomplete answer',
      format: 'code' as const,
      timeSpent: 350,
      submittedAt: new Date(),
    })),
  evaluations: Array(10)
    .fill(null)
    .map((_, i) => ({
      questionId: `q${i + 1}`,
      score: 30,
      dimensions: {
        accuracy: 30,
        clarity: 30,
        depth: 25,
        relevance: 35,
        timeEfficiency: 75,
      },
      feedback: 'Incomplete solution with logical errors',
      strengths: [],
      improvements: ['Review fundamental concepts', 'Practice more problems'],
    })),
  config: {
    duration: 45,
    initialDifficulty: 'Medium',
    performanceThreshold: 40,
    minQuestionsBeforeTermination: 5,
  },
};

const result2 = interviewSimulationEngine.processInterviewLog(poorPerformanceInterview);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log();

// Test Case 3: Adaptive Difficulty Changes
console.log('Test Case 3: Adaptive Difficulty Changes');
console.log('-'.repeat(80));

const adaptiveInterview: InterviewLog = {
  sessionId: 'test-session-3',
  candidateId: 'candidate-3',
  startTime: new Date(),
  questions: [
    { id: 'q1', type: 'technical', difficulty: 'Easy', skillArea: 'Algorithms', text: 'Q1', timeLimit: 180, expectedResponseFormat: 'code' },
    { id: 'q2', type: 'technical', difficulty: 'Medium', skillArea: 'Algorithms', text: 'Q2', timeLimit: 300, expectedResponseFormat: 'code' },
    { id: 'q3', type: 'technical', difficulty: 'Hard', skillArea: 'Algorithms', text: 'Q3', timeLimit: 480, expectedResponseFormat: 'code' },
    { id: 'q4', type: 'technical', difficulty: 'Medium', skillArea: 'Algorithms', text: 'Q4', timeLimit: 300, expectedResponseFormat: 'code' },
  ],
  responses: Array(4)
    .fill(null)
    .map((_, i) => ({
      questionId: `q${i + 1}`,
      content: 'Solution',
      format: 'code' as const,
      timeSpent: 200,
      submittedAt: new Date(),
    })),
  evaluations: [
    { questionId: 'q1', score: 85, dimensions: { accuracy: 85, clarity: 85, depth: 85, relevance: 85, timeEfficiency: 100 }, feedback: 'Great', strengths: ['Good'], improvements: [] },
    { questionId: 'q2', score: 80, dimensions: { accuracy: 80, clarity: 80, depth: 80, relevance: 80, timeEfficiency: 100 }, feedback: 'Good', strengths: ['Good'], improvements: [] },
    { questionId: 'q3', score: 90, dimensions: { accuracy: 90, clarity: 90, depth: 90, relevance: 90, timeEfficiency: 100 }, feedback: 'Excellent', strengths: ['Excellent'], improvements: [] },
    { questionId: 'q4', score: 45, dimensions: { accuracy: 45, clarity: 45, depth: 45, relevance: 45, timeEfficiency: 100 }, feedback: 'Needs work', strengths: [], improvements: ['Practice'] },
  ],
  config: {
    duration: 45,
    initialDifficulty: 'Medium',
    performanceThreshold: 40,
    minQuestionsBeforeTermination: 5,
  },
};

const result3 = interviewSimulationEngine.processInterviewLog(adaptiveInterview);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log();

// Test Case 4: Time Management Issues
console.log('Test Case 4: Time Management Issues');
console.log('-'.repeat(80));

const timeIssuesInterview: InterviewLog = {
  sessionId: 'test-session-4',
  candidateId: 'candidate-4',
  startTime: new Date(),
  questions: [
    { id: 'q1', type: 'technical', difficulty: 'Medium', skillArea: 'Programming', text: 'Q1', timeLimit: 300, expectedResponseFormat: 'code' },
    { id: 'q2', type: 'technical', difficulty: 'Medium', skillArea: 'Programming', text: 'Q2', timeLimit: 300, expectedResponseFormat: 'code' },
    { id: 'q3', type: 'technical', difficulty: 'Medium', skillArea: 'Programming', text: 'Q3', timeLimit: 300, expectedResponseFormat: 'code' },
  ],
  responses: [
    { questionId: 'q1', content: 'Solution', format: 'code', timeSpent: 280, submittedAt: new Date() }, // On time
    { questionId: 'q2', content: 'Solution', format: 'code', timeSpent: 350, submittedAt: new Date() }, // 16% over
    { questionId: 'q3', content: 'Solution', format: 'code', timeSpent: 400, submittedAt: new Date() }, // 33% over
  ],
  evaluations: [
    { questionId: 'q1', score: 70, dimensions: { accuracy: 70, clarity: 70, depth: 70, relevance: 70, timeEfficiency: 100 }, feedback: 'Good', strengths: [], improvements: [] },
    { questionId: 'q2', score: 70, dimensions: { accuracy: 70, clarity: 70, depth: 70, relevance: 70, timeEfficiency: 90 }, feedback: 'Good but slow', strengths: [], improvements: [] },
    { questionId: 'q3', score: 70, dimensions: { accuracy: 70, clarity: 70, depth: 70, relevance: 70, timeEfficiency: 75 }, feedback: 'Too slow', strengths: [], improvements: [] },
  ],
  config: {
    duration: 45,
    initialDifficulty: 'Medium',
    performanceThreshold: 40,
    minQuestionsBeforeTermination: 5,
  },
};

const result4 = interviewSimulationEngine.processInterviewLog(timeIssuesInterview);
console.log('Result:', JSON.stringify(result4, null, 2));
console.log();

console.log('='.repeat(80));
console.log('All tests completed successfully!');
console.log('='.repeat(80));
