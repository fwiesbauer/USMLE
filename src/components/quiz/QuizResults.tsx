'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { QuestionAttempt, PublicQuestion } from '@/types/quiz';

interface QuizResultsProps {
  score: { correct: number; total: number; percentage: number };
  attempts: QuestionAttempt[];
  questions: PublicQuestion[];
  isRetry?: boolean;
  retryImproved?: number;
  hasIncorrect: boolean;
  onRetryIncorrect: () => void;
  onRetakeFull: () => void;
  onBackToResults?: () => void;
}

export function QuizResults({
  score,
  attempts,
  questions,
  isRetry,
  retryImproved,
  hasIncorrect,
  onRetryIncorrect,
  onRetakeFull,
  onBackToResults,
}: QuizResultsProps) {
  const scoreColor =
    score.percentage >= 70
      ? 'text-correct-dark'
      : score.percentage >= 50
        ? 'text-yellow-600'
        : 'text-wrong-dark';

  // Map question IDs to topics for breakdown
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Get latest attempt per question
  const latestAttempts = new Map<string, QuestionAttempt>();
  for (const attempt of attempts) {
    latestAttempts.set(attempt.question_id, attempt);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="max-w-lg w-full">
        {/* Score */}
        <div className="text-center mb-8">
          {isRetry && retryImproved !== undefined && (
            <p className="text-sm text-brand-mid font-medium mb-2">
              You improved on {retryImproved} of {score.total} retry question
              {score.total !== 1 ? 's' : ''}
            </p>
          )}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isRetry ? 'Retry Results' : 'Quiz Complete!'}
          </h2>
          <p className={`text-5xl font-bold ${scoreColor}`}>
            {score.correct} / {score.total}
          </p>
          <p className="text-gray-500 mt-1">{score.percentage}%</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 mb-8">
          {Array.from(latestAttempts.entries()).map(([questionId, attempt], i) => {
            const question = questionMap.get(questionId);
            return (
              <div
                key={questionId}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  attempt.is_correct ? 'bg-correct-fill' : 'bg-wrong-fill'
                }`}
              >
                <span className="font-medium">
                  Q{i + 1}: {question?.topic ?? 'Question'}
                </span>
                <span
                  className={
                    attempt.is_correct ? 'text-correct-dark' : 'text-wrong-dark'
                  }
                >
                  {attempt.is_correct ? '✓' : '✗'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {hasIncorrect && (
            <Button onClick={onRetryIncorrect} variant="primary" className="w-full">
              Retry Incorrect Questions
            </Button>
          )}
          <Button onClick={onRetakeFull} variant="secondary" className="w-full">
            Retake Full Quiz
          </Button>
          {isRetry && onBackToResults && (
            <Button onClick={onBackToResults} variant="secondary" className="w-full">
              Back to Results
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
