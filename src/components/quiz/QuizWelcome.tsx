'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface QuizWelcomeProps {
  title: string;
  sourceFilename?: string;
  questionCount: number;
  hasExistingProgress: boolean;
  previousScore?: { correct: number; total: number };
  previousDate?: string;
  onStart: () => void;
  onContinue?: () => void;
  onStartFresh?: () => void;
}

export function QuizWelcome({
  title,
  sourceFilename,
  questionCount,
  hasExistingProgress,
  previousScore,
  previousDate,
  onStart,
  onContinue,
  onStartFresh,
}: QuizWelcomeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-brand-dark mb-4">{title}</h1>

        {sourceFilename && (
          <p className="text-sm text-gray-500 mb-2">
            Based on: {sourceFilename}
          </p>
        )}

        <p className="text-gray-600 mb-6">
          {questionCount} question{questionCount !== 1 ? 's' : ''}
        </p>

        {hasExistingProgress && previousScore ? (
          <div className="space-y-4">
            <div className="bg-brand-light rounded-lg p-4">
              <p className="text-sm text-brand-dark font-medium">
                Continue where you left off?
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Previous score: {previousScore.correct}/{previousScore.total}
                {previousDate && ` · ${new Date(previousDate).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={onContinue} variant="primary">
                Continue
              </Button>
              <Button onClick={onStartFresh} variant="secondary">
                Start Fresh
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Your progress is saved in this browser. It will not transfer to
              other devices.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={onStart} variant="primary" className="px-8 py-3 text-base">
              Start Quiz
            </Button>
            <p className="text-xs text-gray-400">
              Your progress is saved in this browser. It will not transfer to
              other devices.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
