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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-6">Interview Setup</h1>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 1: Upload Resume</h2>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="mb-4"
              />
              <button
                onClick={handleResumeUpload}
                disabled={!resumeFile || loading}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Parsing...' : 'Continue'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 2: Job Description</h2>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 p-3 border border-gray-300 rounded-md mb-4"
              />
              <button
                onClick={handleJDSubmit}
                disabled={!jdText || loading}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Parsing...' : 'Continue'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 3: Configure Interview</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <select
                    value={config.duration}
                    onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) as any })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Difficulty
                  </label>
                  <select
                    value={config.initialDifficulty}
                    onChange={(e) => setConfig({ ...config, initialDifficulty: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleStartInterview}
                disabled={loading}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Interview'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
