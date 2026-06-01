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
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">AI Mock Interview</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{candidate.name}</span>
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push('/');
                }}
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Start New Interview</h2>
            <p className="text-gray-600 mb-4">
              Upload your resume and job description to begin a mock interview
            </p>
            <button
              onClick={() => router.push('/interview/setup')}
              className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Start Interview
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">View Performance</h2>
            <p className="text-gray-600 mb-4">
              Check your past interview results and track your progress
            </p>
            <button
              onClick={() => router.push('/performance')}
              className="w-full py-2 px-4 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
