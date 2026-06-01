'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { reportsAPI } from '@/lib/api';

export default function ReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await reportsAPI.getReport(sessionId);
        setReport(response.data.report);
      } catch (error) {
        console.error('Failed to fetch report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading report...</div>;
  }

  if (!report) {
    return <div className="min-h-screen flex items-center justify-center">Report not found</div>;
  }

  const getReadinessColor = (level: string) => {
    switch (level) {
      case 'Ready':
        return 'text-green-600 bg-green-50';
      case 'Needs Improvement':
        return 'text-yellow-600 bg-yellow-50';
      case 'Not Ready':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-6">Interview Readiness Report</h1>

          {/* Overall Score */}
          <div className="mb-8 text-center">
            <div className="text-6xl font-bold text-primary-600 mb-2">
              {report.overallScore}
            </div>
            <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${getReadinessColor(report.readinessLevel)}`}>
              {report.readinessLevel}
            </div>
          </div>

          {/* Skill Area Breakdown */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Skill Area Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.skillAreaBreakdown.map((skill: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{skill.skillArea}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                    <span className="font-semibold">{skill.score.toFixed(1)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {skill.questionsAsked} questions • Avg time: {Math.round(skill.averageTimeSpent)}s
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Strengths</h2>
            <div className="space-y-3">
              {report.strengths.map((strength: any, index: number) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-1">{strength.area}</h3>
                  <p className="text-gray-700 mb-2">{strength.description}</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {strength.evidence.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Areas for Improvement</h2>
            <div className="space-y-3">
              {report.weaknesses.map((weakness: any, index: number) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-red-800">{weakness.area}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      weakness.impact === 'High' ? 'bg-red-200 text-red-800' :
                      weakness.impact === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {weakness.impact} Impact
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{weakness.description}</p>
                  <div className="text-sm">
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {weakness.recommendations.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Management */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Time Management</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {Math.round(report.timeManagement.totalTime / 60)}m
                </div>
                <div className="text-sm text-gray-600">Total Time</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {Math.round(report.timeManagement.averageTimePerQuestion)}s
                </div>
                <div className="text-sm text-gray-600">Avg per Question</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {report.timeManagement.questionsOverTime}
                </div>
                <div className="text-sm text-gray-600">Over Time</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {Math.round(report.timeManagement.timeEfficiencyScore)}%
                </div>
                <div className="text-sm text-gray-600">Efficiency</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
              <div className="space-y-3">
                {report.recommendations.map((rec: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{rec.area}</h3>
                    <p className="text-gray-700">{rec.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <a
              href="/dashboard"
              className="flex-1 py-3 px-4 bg-primary-600 text-white text-center rounded-md hover:bg-primary-700"
            >
              Back to Dashboard
            </a>
            <a
              href="/performance"
              className="flex-1 py-3 px-4 border border-primary-600 text-primary-600 text-center rounded-md hover:bg-primary-50"
            >
              View All Reports
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
