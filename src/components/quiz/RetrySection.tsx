'use client';

import { useState, useCallback } from 'react';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import type { PublicQuestion, RevealResponse, QuestionAttempt } from '@/types/quiz';

interface RetrySectionProps {
  incorrectQuestions: PublicQuestion[];
  allQuestions: PublicQuestion[];
  onAnswer: (questionId: string, selectedAnswer: string) => Promise<RevealResponse>;
  onRetakeFull: () => void;
  onBackToResults: () => void;
}

export function RetrySection({
  incorrectQuestions,
  allQuestions,
  onAnswer,
  onRetakeFull,
  onBackToResults,
}: RetrySectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = useCallback(
    async (questionId: string, selectedAnswer: string): Promise<RevealResponse> => {
      const result = await onAnswer(questionId, selectedAnswer);
      setAttempts((prev) => [
        ...prev,
        {
          question_id: questionId,
          selected_answer: selectedAnswer,
          is_correct: result.is_correct,
          attempted_at: new Date().toISOString(),
        },
      ]);
      return result;
    },
    [onAnswer]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= incorrectQuestions.length) {
      setShowResults(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, incorrectQuestions.length]);

  if (showResults) {
    const correct = attempts.filter((a) => a.is_correct).length;
    const total = attempts.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const stillIncorrect = attempts.some((a) => !a.is_correct);
    const improved = attempts.filter((a) => a.is_correct).length;

    return (
      <QuizResults
        score={{ correct, total, percentage }}
        attempts={attempts}
        questions={allQuestions}
        isRetry
        retryImproved={improved}
        hasIncorrect={stillIncorrect}
        onRetryIncorrect={() => {
          const stillWrong = incorrectQuestions.filter((q) =>
            attempts.some((a) => a.question_id === q.id && !a.is_correct)
          );
          if (stillWrong.length > 0) {
            setCurrentIndex(0);
            setAttempts([]);
            setShowResults(false);
          }
        }}
        onRetakeFull={onRetakeFull}
        onBackToResults={onBackToResults}
      />
    );
  }

  return (
    <QuizQuestion
      question={incorrectQuestions[currentIndex]}
      currentIndex={currentIndex}
      totalQuestions={incorrectQuestions.length}
      onAnswer={handleAnswer}
      onNext={handleNext}
    />
  );
}
