-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Interview Sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'terminated')),
  config JSONB NOT NULL,
  resume_data JSONB NOT NULL,
  job_description_data JSONB NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  terminated_at TIMESTAMP,
  termination_reason TEXT,
  overall_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Session Questions table
CREATE TABLE IF NOT EXISTS session_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_data JSONB NOT NULL,
  response_data JSONB,
  evaluation_data JSONB,
  time_spent INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, question_index)
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  skill_area VARCHAR(255) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  questions_count INTEGER NOT NULL,
  average_time INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Readiness Reports table
CREATE TABLE IF NOT EXISTS readiness_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON interview_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_session ON session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_index ON session_questions(session_id, question_index);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_skill ON performance_metrics(skill_area);
CREATE INDEX IF NOT EXISTS idx_reports_session ON readiness_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
