// Core Types and Interfaces

export interface Candidate {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  responsibilities: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface ParsedResume {
  skills: SkillCategory[];
  experience: WorkExperience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  rawText: string;
}

export interface ParsedJobDescription {
  requiredSkills: SkillCategory[];
  preferredSkills: SkillCategory[];
  responsibilities: string[];
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead';
  minimumYears: number;
  rawText: string;
}

export type QuestionType = 'technical' | 'conceptual' | 'behavioral' | 'scenario';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type ResponseFormat = 'text' | 'code' | 'diagram';

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  skillArea: string;
  text: string;
  expectedResponseFormat: ResponseFormat;
  timeLimit: number;
  evaluationCriteria: EvaluationCriteria;
  metadata: {
    relatedSkills: string[];
    projectReference?: string;
  };
}

export interface EvaluationCriteria {
  accuracy: string;
  clarity: string;
  depth: string;
  relevance: string;
}

export interface InterviewConfig {
  duration: 30 | 45 | 60;
  focusAreas?: string[];
  initialDifficulty: DifficultyLevel;
}

export interface CandidateResponse {
  questionId: string;
  content: string;
  format: ResponseFormat;
  timeSpent: number;
  submittedAt: Date;
}

export interface EvaluationDimensions {
  accuracy: number;
  clarity: number;
  depth: number;
  relevance: number;
  timeEfficiency: number;
}

export interface EvaluationResult {
  score: number;
  dimensions: EvaluationDimensions;
  feedback: string;
  strengths: string[];
  improvements: string[];
  exampleBetterResponse?: string;
}

export interface ResponseHistory {
  question: Question;
  response: CandidateResponse;
  evaluation: EvaluationResult;
  timestamp: Date;
}

export interface SessionState {
  currentQuestionIndex: number;
  questions: Question[];
  responses: ResponseHistory[];
  performanceScore: number;
  skillAreaScores: Record<string, number>;
  elapsedTime: number;
  lastActivity: Date;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'terminated';

export interface Session {
  id: string;
  candidateId: string;
  status: SessionStatus;
  startedAt: Date;
  config: InterviewConfig;
  context: {
    resume: ParsedResume;
    jobDescription: ParsedJobDescription;
  };
  state: SessionState;
}

export interface InterviewSession {
  id: string;
  candidate_id: string;
  status: SessionStatus;
  config: InterviewConfig;
  resume_data: ParsedResume;
  job_description_data: ParsedJobDescription;
  started_at: Date;
  completed_at?: Date;
  terminated_at?: Date;
  termination_reason?: string;
  overall_score?: number;
  created_at: Date;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  question_index: number;
  question_data: Question;
  response_data?: CandidateResponse;
  evaluation_data?: EvaluationResult;
  time_spent?: number;
  created_at: Date;
}

export interface PerformanceMetric {
  id: string;
  session_id: string;
  skill_area: string;
  score: number;
  questions_count: number;
  average_time: number;
  created_at: Date;
}

export interface SkillAreaScore {
  skillArea: string;
  score: number;
  questionsAsked: number;
  averageTimeSpent: number;
}

export interface Strength {
  area: string;
  description: string;
  evidence: string[];
}

export interface Weakness {
  area: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  recommendations: string[];
}

export interface QuestionFeedback {
  question: string;
  yourResponse: string;
  score: number;
  feedback: string;
  betterApproach?: string;
}

export interface TimeAnalysis {
  totalTime: number;
  averageTimePerQuestion: number;
  questionsOverTime: number;
  timeEfficiencyScore: number;
}

export interface Recommendation {
  area: string;
  suggestion: string;
  resources?: string[];
}

export type ReadinessLevel = 'Ready' | 'Needs Improvement' | 'Not Ready';

export interface ReadinessReport {
  sessionId: string;
  candidateId: string;
  generatedAt: Date;
  overallScore: number;
  readinessLevel: ReadinessLevel;
  skillAreaBreakdown: SkillAreaScore[];
  strengths: Strength[];
  weaknesses: Weakness[];
  questionFeedback: QuestionFeedback[];
  timeManagement: TimeAnalysis;
  recommendations: Recommendation[];
}

export interface TrendReport {
  candidateId: string;
  sessionsAnalyzed: number;
  overallTrend: 'Improving' | 'Stable' | 'Declining';
  skillAreaTrends: SkillAreaTrend[];
  recommendations: string[];
}

export interface SkillAreaTrend {
  skillArea: string;
  trend: 'Improving' | 'Stable' | 'Declining';
  scoreHistory: { date: Date; score: number }[];
}

// API Request/Response Types
export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  candidate: Omit<Candidate, 'password_hash'>;
}

export interface CreateSessionRequest {
  resumeId: string;
  jdId: string;
  config: InterviewConfig;
}

export interface SubmitResponseRequest {
  response: CandidateResponse;
}

// WebSocket Event Types
export type WSClientEvent = 
  | { type: 'session.join'; payload: { sessionId: string; token: string } }
  | { type: 'response.submit'; payload: { response: CandidateResponse } }
  | { type: 'heartbeat'; payload: { timestamp: number } };

export type WSServerEvent =
  | { type: 'session.connected'; payload: { sessionId: string; currentState: SessionState } }
  | { type: 'question.new'; payload: { question: Question } }
  | { type: 'evaluation.complete'; payload: { evaluation: EvaluationResult } }
  | { type: 'session.terminated'; payload: { reason: string; partialReport: ReadinessReport } }
  | { type: 'timer.update'; payload: { remainingTime: number } }
  | { type: 'error'; payload: { message: string; code: string } };

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
