'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { wsClient } from '@/lib/websocket';

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [question, setQuestion] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId || sessionId === 'undefined') {
      console.error('Invalid session ID');
      router.push('/interview/setup');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const socket = wsClient.connect(token);

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socket.on('session.connected', (data: any) => {
      console.log('Session connected:', data);
      setConnected(true);
    });

    socket.on('question.new', (data: any) => {
      console.log('New question received:', data);
      setQuestion(data.question);
      setTimeRemaining(data.question.time_limit || 300);
      setQuestionNumber(data.question_number || 1);
      setTotalQuestions(data.total_questions || 3);
      setResponse('');
      setEvaluation(null);
      setLoading(false);
    });

    socket.on('evaluation.complete', (data: any) => {
      console.log('Evaluation received:', data);
      setEvaluation(data);
      setLoading(false);
    });

    socket.on('session.completed', (data: any) => {
      console.log('Session completed:', data);
      setTimeout(() => {
        router.push(`/report/${sessionId}`);
      }, 2000);
    });

    socket.on('error', (data: any) => {
      console.error('Socket error:', data);
      alert(data.message || 'An error occurred');
    });

    // Join the session
    wsClient.joinSession(sessionId);

    // Timer countdown
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!evaluation && question) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      wsClient.disconnect();
    };
  }, [sessionId, router]);

  const handleSubmit = () => {
    if (!response.trim() && timeRemaining > 0) {
      alert('Please provide an answer before submitting');
      return;
    }

    setLoading(true);
    wsClient.submitResponse(sessionId, {
      questionId: question?.id,
      content: response,
      format: 'text',
      timeSpent: (question?.time_limit || 300) - timeRemaining,
      submittedAt: new Date().toISOString(),
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!connected || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Connecting to interview session...</p>
          <p className="text-sm text-gray-500 mt-2">Session ID: {sessionId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-t-xl shadow-lg p-6 border-b-4 border-blue-600">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">AI Mock Interview</h1>
              <p className="text-gray-600 mt-1">
                Question {questionNumber} of {totalQuestions}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${timeRemaining < 60 ? 'text-red-600 animate-pulse' : timeRemaining < 120 ? 'text-orange-600' : 'text-blue-600'}`}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-sm text-gray-500 mt-1">Time Remaining</p>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white shadow-lg p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold uppercase">
                {question.type || 'Technical'}
              </span>
              <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold uppercase">
                {question.difficulty || 'Medium'}
              </span>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-600">
              <p className="text-xl text-gray-800 leading-relaxed">{question.question}</p>
            </div>
          </div>

          {!evaluation ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Answer
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your answer here... Be clear, concise, and demonstrate your understanding."
                  className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>{response.length} characters</span>
                  <span>{response.trim().split(/\s+/).filter(w => w).length} words</span>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || !response.trim()}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Evaluating your answer...
                  </span>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Score Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Your Score</h3>
                    <p className="text-5xl font-bold text-green-600">{evaluation.score || 0}/100</p>
                  </div>
                  <div className="text-6xl">
                    {evaluation.score >= 80 ? '🎉' : evaluation.score >= 60 ? '👍' : '💪'}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
                <h4 className="font-semibold text-lg text-gray-800 mb-3 flex items-center">
                  <span className="text-2xl mr-2">💬</span>
                  Feedback
                </h4>
                <p className="text-gray-700 leading-relaxed">{evaluation.feedback || 'Good effort!'}</p>
              </div>

              {/* Next Question Indicator */}
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 rounded-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-700 font-medium">
                    {questionNumber < totalQuestions ? 'Preparing next question...' : 'Completing interview...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white rounded-b-xl shadow-lg p-4 text-center text-sm text-gray-500">
          <p>💡 Tip: Be specific, provide examples, and explain your reasoning clearly</p>
        </div>
      </div>
    </div>
  );
}
