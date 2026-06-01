'use client';

import { useEffect, useState } from 'react';
import { reportsAPI } from '@/lib/api';

export default function PerformancePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const candidateData = localStorage.getItem('candidate');
        if (!candidateData) return;

        const candidate = JSON.parse(candidateData);
        const response = await reportsAPI.getSessions(candidate.id);
        setSessions(response.data.sessions);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-6">Performance History</h1>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="mb-4">No interview sessions yet</p>
              <a
                href="/interview/setup"
                className="inline-block py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Start Your First Interview
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'terminated' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {session.status}
                        </span>
                        {session.overall_score && (
                          <span className="text-lg font-bold text-primary-600">
                            Score: {session.overall_score}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Started: {new Date(session.started_at).toLocaleString()}
                      </div>
                      {session.completed_at && (
                        <div className="text-sm text-gray-600">
                          Completed: {new Date(session.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {session.status === 'completed' && (
                      <a
                        href={`/report/${session.id}`}
                        className="py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                      >
                        View Report
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
