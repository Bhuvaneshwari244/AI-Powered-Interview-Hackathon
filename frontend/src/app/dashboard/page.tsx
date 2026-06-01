'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const candidateData = localStorage.getItem('candidate');
    if (candidateData) {
      setCandidate(JSON.parse(candidateData));
    }
  }, [router]);

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gradient-animated flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              <h1 className="text-2xl font-bold text-white">AI Mock Interview</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="font-semibold">👤 {candidate.name}</span>
              </div>
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push('/');
                }}
                className="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome back, {candidate.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-xl text-white/80">
            Ready to practice your interview skills?
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Start Interview Card */}
          <div className="card-glass p-8 animate-slide-in-left hover:scale-105 transition-transform">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Start New Interview</h2>
            <p className="text-gray-600 mb-6">
              Upload your resume and job description to begin an AI-powered mock interview with personalized questions
            </p>
            <button
              onClick={() => router.push('/interview/setup')}
              className="btn btn-primary w-full text-lg"
            >
              🎯 Start Interview
            </button>
          </div>

          {/* View Performance Card */}
          <div className="card-glass p-8 animate-slide-in-right hover:scale-105 transition-transform">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">View Performance</h2>
            <p className="text-gray-600 mb-6">
              Check your past interview results, track your progress, and see detailed performance analytics
            </p>
            <button
              onClick={() => router.push('/performance')}
              className="btn w-full text-lg bg-gradient-success text-white"
            >
              📈 View Reports
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="card-glass p-6 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-gray-800 mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600">
              Google Gemini generates personalized questions
            </p>
          </div>
          
          <div className="card-glass p-6 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-gray-800 mb-2">Instant Feedback</h3>
            <p className="text-sm text-gray-600">
              Get real-time evaluation and improvement tips
            </p>
          </div>
          
          <div className="card-glass p-6 text-center">
            <div className="text-4xl mb-3">💾</div>
            <h3 className="font-bold text-gray-800 mb-2">Progress Tracking</h3>
            <p className="text-sm text-gray-600">
              All your data saved across devices
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="card-glass p-8 mt-8 animate-scale-in">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Your Account</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl mb-2">📧</div>
              <div className="text-sm text-gray-600 font-semibold">Email</div>
              <div className="text-xs text-gray-500 mt-1 truncate">{candidate.email}</div>
            </div>
            <div>
              <div className="text-3xl mb-2">🆓</div>
              <div className="text-sm text-gray-600 font-semibold">Plan</div>
              <div className="text-xs text-gray-500 mt-1">Free Forever</div>
            </div>
            <div>
              <div className="text-3xl mb-2">🤖</div>
              <div className="text-sm text-gray-600 font-semibold">AI Model</div>
              <div className="text-xs text-gray-500 mt-1">Gemini 1.5 Flash</div>
            </div>
            <div>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm text-gray-600 font-semibold">Status</div>
              <div className="text-xs text-gray-500 mt-1">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
