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
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const socket = wsClient.connect(token);

    socket.on('session.connected', (data: any) => {
      const currentQuestion = data.currentState.questions[data.currentState.currentQuestionIndex];
      setQuestion(currentQuestion);
      setTimeRemaining(currentQuestion.timeLimit);
    });

    socket.on('question.new', (data: any) => {
      setQuestion(data.question);
      setTimeRemaining(data.question.timeLimit);
      setResponse('');
      setEvaluation(null);
    });

    socket.on('timer.update', (data: any) => {
      setTimeRemaining(data.remainingTime);
    });

    socket.on('timer.expired', () => {
      handleSubmit();
    });

    socket.on('evaluation.complete', (data: any) => {
      setEvaluation(data.evaluation);
      setLoading(false);
    });

    socket.on('session.terminated', (data: any) => {
      alert(`Interview terminated: ${data.reason}`);
      router.push(`/report/${sessionId}`);
    });

    socket.on('session.completed', () => {
      router.push(`/report/${sessionId}`);
    });

    wsClient.joinSession(sessionId);

    return () => {
      wsClient.disconnect();
    };
  }, [sessionId, router]);

  const handleSubmit = () => {
    if (!response.trim()) return;

    setLoading(true);
    wsClient.submitResponse(sessionId, {
      questionId: question.id,
      content: response,
      format: 'text',
      timeSpent: question.timeLimit - timeRemaining,
      submittedAt: new Date(),
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!question) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Interview Session</h1>
            <div className={`text-2xl font-bold ${timeRemaining < 30 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {question.type}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                {question.difficulty}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                {question.skillArea}
              </span>
            </div>
            <p className="text-lg">{question.text}</p>
          </div>

          {!evaluation ? (
            <div>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full h-64 p-4 border border-gray-300 rounded-md mb-4"
                disabled={loading}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !response.trim()}
                className="w-full py-3 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Your Score: {evaluation.score}/100</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Accuracy: {evaluation.dimensions.accuracy}</div>
                  <div>Clarity: {evaluation.dimensions.clarity}</div>
                  <div>Depth: {evaluation.dimensions.depth}</div>
                  <div>Relevance: {evaluation.dimensions.relevance}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Feedback:</h4>
                <p className="text-gray-700">{evaluation.feedback}</p>
              </div>

              {evaluation.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Strengths:</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {evaluation.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Areas for Improvement:</h4>
                  <ul className="list-disc list-inside text-gray-700">
                    {evaluation.improvements.map((i: string, idx: number) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-center text-gray-600">
                Waiting for next question...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
