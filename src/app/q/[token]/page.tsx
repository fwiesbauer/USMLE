'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { QuizWelcome } from '@/components/quiz/QuizWelcome';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import { QuizResults } from '@/components/quiz/QuizResults';
import { RetrySection } from '@/components/quiz/RetrySection';
import {
  getProgress,
  saveProgress,
  clearProgress,
  initProgress,
  addAttempt,
  getIncorrectQuestionIds,
  calculateScore,
} from '@/lib/progress';
import type {
  PublicQuestion,
  RevealResponse,
  LearnerProgress,
  QuestionAttempt,
} from '@/types/quiz';

type Screen = 'welcome' | 'quiz' | 'results' | 'retry';

export default function LearnerQuizPage() {
  const params = useParams();
  const token = params.token as string;

  const [quizTitle, setQuizTitle] = useState('');
  const [sourceFilename, setSourceFilename] = useState('');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/public/quizzes/${token}`);
        if (!res.ok) {
          setError('Quiz not found or not published.');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setQuizTitle(data.title);
        setSourceFilename(data.source_filename || '');
        setQuestions(data.questions);

        // Check for existing progress
        const existing = getProgress(token);
        if (existing) {
          setProgress(existing);
        }

        setLoading(false);
      } catch {
        setError('Failed to load quiz.');
        setLoading(false);
      }
    }
    loadQuiz();
  }, [token]);

  const handleStart = useCallback(() => {
    const newProgress = initProgress('', token, quizTitle);
    setProgress(newProgress);
    saveProgress(newProgress);
    setCurrentIndex(0);
    setScreen('quiz');
  }, [token, quizTitle]);

  const handleContinue = useCallback(() => {
    if (progress) {
      const incorrectIds = getIncorrectQuestionIds(progress);
      if (incorrectIds.length > 0) {
        setScreen('retry');
      } else {
        setScreen('results');
      }
    }
  }, [progress]);

  const handleStartFresh = useCallback(() => {
    clearProgress(token);
    handleStart();
  }, [token, handleStart]);

  const handleAnswer = useCallback(
    async (questionId: string, selectedAnswer: string): Promise<RevealResponse> => {
      const res = await fetch(`/api/public/quizzes/${token}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer }),
      });

      if (!res.ok) {
        throw new Error('Failed to reveal answer');
      }

      const reveal: RevealResponse = await res.json();

      const attempt: QuestionAttempt = {
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: reveal.is_correct,
        attempted_at: new Date().toISOString(),
      };

      setProgress((prev) => {
        if (!prev) return prev;
        const updated = addAttempt(prev, attempt);
        saveProgress(updated);
        return updated;
      });

      return reveal;
    },
    [token]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setProgress((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, completed_at: new Date().toISOString() };
        saveProgress(updated);
        return updated;
      });
      setScreen('results');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const handleRetryIncorrect = useCallback(() => {
    setScreen('retry');
  }, []);

  const handleRetakeFull = useCallback(() => {
    handleStartFresh();
  }, [handleStartFresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const hasExistingProgress = !!(progress && progress.attempts.length > 0);
  const previousScore = progress ? calculateScore(progress) : undefined;

  if (screen === 'welcome') {
    return (
      <QuizWelcome
        title={quizTitle}
        sourceFilename={sourceFilename}
        questionCount={questions.length}
        hasExistingProgress={hasExistingProgress}
        previousScore={previousScore}
        previousDate={progress?.completed_at}
        onStart={handleStart}
        onContinue={handleContinue}
        onStartFresh={handleStartFresh}
      />
    );
  }

  if (screen === 'quiz') {
    return (
      <QuizQuestion
        question={questions[currentIndex]}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onAnswer={handleAnswer}
        onNext={handleNext}
      />
    );
  }

  if (screen === 'retry' && progress) {
    const incorrectIds = getIncorrectQuestionIds(progress);
    const incorrectQuestions = questions.filter((q) =>
      incorrectIds.includes(q.id)
    );

    return (
      <RetrySection
        incorrectQuestions={incorrectQuestions}
        allQuestions={questions}
        onAnswer={handleAnswer}
        onRetakeFull={handleRetakeFull}
        onBackToResults={() => setScreen('results')}
      />
    );
  }

  if (screen === 'results' && progress) {
    const score = calculateScore(progress);
    const incorrectIds = getIncorrectQuestionIds(progress);

    return (
      <QuizResults
        score={score}
        attempts={progress.attempts}
        questions={questions}
        hasIncorrect={incorrectIds.length > 0}
        onRetryIncorrect={handleRetryIncorrect}
        onRetakeFull={handleRetakeFull}
      />
    );
  }

  return null;
}
