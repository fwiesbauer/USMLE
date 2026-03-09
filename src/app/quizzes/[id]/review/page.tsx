'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuestionCard } from '@/components/editor/QuestionCard';
import { QuestionEditor } from '@/components/editor/QuestionEditor';
import type { Question, Quiz } from '@/types/quiz';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadQuiz = useCallback(async () => {
    const supabase = createClient();
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (!quizData) {
      setError('Quiz not found');
      setLoading(false);
      return;
    }

    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('position');

    setQuiz(quizData as unknown as Quiz);
    setQuestions((questionData || []) as unknown as Question[]);
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Build share URL for already-published quizzes
  const existingShareUrl =
    quiz?.status === 'published' && quiz?.share_token
      ? `${window.location.origin}/q/${quiz.share_token}`
      : '';

  const handleSave = async (questionId: string, updated: Partial<Question>) => {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });

    if (!res.ok) {
      throw new Error('Failed to save question');
    }

    const savedQuestion = await res.json();
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...savedQuestion } : q))
    );
    setEditedIds((prev) => new Set(prev).add(questionId));
  };

  const handleDelete = async (questionId: string) => {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Failed to delete question');
    }

    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setSelectedIndex(0);
  };

  const handlePublish = async () => {
    if (questions.length < 3) {
      setError('You need at least 3 questions to publish.');
      return;
    }

    setPublishing(true);
    setError('');

    try {
      const res = await fetch(`/api/quizzes/${quizId}/publish`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to publish quiz.');
        return;
      }

      const data = await res.json();
      setShareUrl(data.share_url);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error || 'Quiz not found'}</p>
      </div>
    );
  }

  const selectedQuestion = questions[selectedIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-dark">
              <a href="/dashboard">QuizForge</a>
            </h1>
            <p className="text-sm text-gray-500">{quiz.title}</p>
          </div>
          <Button
            onClick={handlePublish}
            loading={publishing}
            disabled={questions.length < 3}
          >
            {quiz.status === 'published' ? 'Republish Quiz' : 'Publish Quiz'}
          </Button>
        </div>
        {existingShareUrl && !shareUrl && (
          <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Share link:</span>
            <input
              readOnly
              value={existingShareUrl}
              className="flex-1 max-w-md rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-gray-50"
            />
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(existingShareUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        )}
      </header>

      {/* Share URL modal */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <Card className="max-w-md w-full text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Your quiz is live!
            </h3>
            <p className="text-sm text-gray-500 mb-4">Share this link:</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
              />
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setShareUrl('');
                router.push('/dashboard');
              }}
            >
              Done
            </Button>
          </Card>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Left panel: Question list */}
          <div className="w-80 flex-shrink-0 space-y-2">
            <p className="text-sm font-medium text-gray-500 mb-2">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                isSelected={i === selectedIndex}
                isEdited={editedIds.has(q.id)}
                onClick={() => setSelectedIndex(i)}
              />
            ))}
          </div>

          {/* Right panel: Editor */}
          <div className="flex-1">
            {selectedQuestion ? (
              <Card>
                <QuestionEditor
                  key={selectedQuestion.id}
                  question={selectedQuestion}
                  onSave={(updated) => handleSave(selectedQuestion.id, updated)}
                  onDelete={() => handleDelete(selectedQuestion.id)}
                />
              </Card>
            ) : (
              <Card className="text-center py-12">
                <p className="text-gray-500">No questions yet.</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
