'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { documentsAPI, sessionsAPI } from '@/lib/api';

export default function InterviewSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [config, setConfig] = useState({
    duration: 45 as 30 | 45 | 60,
    initialDifficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    timePerQuestion: 300 as 180 | 300 | 420 | 600, // 3, 5, 7, or 10 minutes in seconds
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedResume, setParsedResume] = useState<any>(null);
  const [parsedJD, setParsedJD] = useState<any>(null);

  const handleResumeUpload = async () => {
    if (!resumeFile) return;

    setLoading(true);
    setError('');

    try {
      const response = await documentsAPI.parseResume(resumeFile);
      setParsedResume(response.data.parsed);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to parse resume');
    } finally {
      setLoading(false);
    }
  };

  const handleJDSubmit = async () => {
    if (!jdText) return;

    setLoading(true);
    setError('');

    try {
      const response = await documentsAPI.parseJobDescription({ text: jdText });
      setParsedJD(response.data.parsed);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to parse job description');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await sessionsAPI.create({
        resumeData: parsedResume,
        jobDescriptionData: parsedJD,
        config,
      });

      router.push(`/interview/session/${response.data.sessionId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-animated py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="card-glass p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-gradient-primary rounded-full mb-4">
              <span className="text-4xl">⚙️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Setup</h1>
            <p className="text-gray-600">Configure your AI-powered mock interview</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-semibold ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
                📄 Resume
              </span>
              <span className={`text-sm font-semibold ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
                💼 Job Description
              </span>
              <span className={`text-sm font-semibold ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
                ⚙️ Configure
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{width: `${(step / 3) * 100}%`}}
              ></div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 animate-fade-in">
              <div className="flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">📄 Step 1: Upload Resume</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition">
                <div className="text-5xl mb-4">📎</div>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="mb-4"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <p className="text-gray-600 mb-2">
                    {resumeFile ? `Selected: ${resumeFile.name}` : 'Click to upload your resume'}
                  </p>
                  <p className="text-sm text-gray-500">Supports PDF, DOCX, DOC</p>
                </label>
              </div>
              <button
                onClick={handleResumeUpload}
                disabled={!resumeFile || loading}
                className="btn btn-primary w-full mt-6 text-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner mr-2" style={{width: '20px', height: '20px', borderWidth: '2px'}}></span>
                    Parsing Resume...
                  </span>
                ) : (
                  '➡️ Continue'
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">💼 Step 2: Job Description</h2>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here...&#10;&#10;Example:&#10;We are looking for a Full Stack Developer with experience in React, Node.js, and PostgreSQL..."
                className="input-modern w-full h-64 resize-none"
              />
              <button
                onClick={handleJDSubmit}
                disabled={!jdText || loading}
                className="btn btn-primary w-full mt-6 text-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner mr-2" style={{width: '20px', height: '20px', borderWidth: '2px'}}></span>
                    Parsing Job Description...
                  </span>
                ) : (
                  '➡️ Continue'
                )}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">⚙️ Step 3: Configure Interview</h2>
              
              <div className="space-y-6 mb-8">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    ⏱️ Time Per Question
                  </label>
                  <select
                    value={config.timePerQuestion}
                    onChange={(e) => setConfig({ ...config, timePerQuestion: Number(e.target.value) as any })}
                    className="input-modern w-full text-lg"
                  >
                    <option value={180}>⚡ 3 minutes per question (Fast)</option>
                    <option value={300}>⏱️ 5 minutes per question (Standard)</option>
                    <option value={420}>🕐 7 minutes per question (Comfortable)</option>
                    <option value={600}>🕑 10 minutes per question (Detailed)</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    💡 Choose how much time you want for each question
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    📅 Total Duration
                  </label>
                  <select
                    value={config.duration}
                    onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) as any })}
                    className="input-modern w-full text-lg"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    💡 Total interview duration (affects number of questions)
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-yellow-50 p-6 rounded-lg">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    🎯 Initial Difficulty
                  </label>
                  <select
                    value={config.initialDifficulty}
                    onChange={(e) => setConfig({ ...config, initialDifficulty: e.target.value as any })}
                    className="input-modern w-full text-lg"
                  >
                    <option value="Easy">😊 Easy</option>
                    <option value="Medium">😐 Medium</option>
                    <option value="Hard">😤 Hard</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    💡 Starting difficulty level for questions
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartInterview}
                disabled={loading}
                className="btn btn-success w-full text-xl py-4 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner mr-2" style={{width: '24px', height: '24px', borderWidth: '3px'}}></span>
                    Starting Interview...
                  </span>
                ) : (
                  '🚀 Start Interview'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
