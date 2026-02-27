'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { PublicQuestion, QuizOption, RevealResponse } from '@/types/quiz';

interface QuizQuestionProps {
  question: PublicQuestion;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (questionId: string, selectedAnswer: string) => Promise<RevealResponse>;
  onNext: () => void;
}

export function QuizQuestion({
  question,
  currentIndex,
  totalQuestions,
  onAnswer,
  onNext,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (letter: string) => {
    if (selectedAnswer) return; // Already answered
    setSelectedAnswer(letter);
    setLoading(true);

    try {
      const result = await onAnswer(question.id, letter);
      setReveal(result);
    } catch {
      // Reset on error so the learner can try again
      setSelectedAnswer(null);
    } finally {
      setLoading(false);
    }
  };

  const getOptionClass = (option: QuizOption) => {
    const base =
      'w-full text-left px-4 py-3 rounded-lg border-2 transition-colors font-medium text-sm';

    if (!selectedAnswer) {
      return `${base} border-gray-200 hover:border-brand-mid hover:bg-brand-light cursor-pointer`;
    }

    if (!reveal) {
      return `${base} border-gray-200 opacity-50 cursor-not-allowed`;
    }

    const isSelected = option.letter === selectedAnswer;
    const isCorrect = option.letter === reveal.correct_answer;

    if (isCorrect) {
      return `${base} border-correct-dark bg-correct-fill text-correct-dark`;
    }
    if (isSelected && !reveal.is_correct) {
      return `${base} border-wrong-dark bg-wrong-fill text-wrong-dark`;
    }
    return `${base} border-gray-200 opacity-50`;
  };

  const progressPercent = ((currentIndex + (reveal ? 1 : 0)) / totalQuestions) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-brand-mid h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Topic badge */}
      <span className="inline-block bg-brand-light text-brand-dark text-xs font-medium px-3 py-1 rounded-full mb-4">
        {question.topic}
      </span>

      {/* Vignette */}
      <div className="bg-brand-light border-l-4 border-brand-mid rounded-r-lg p-4 mb-4">
        <p className="text-gray-800 leading-relaxed">{question.vignette}</p>
      </div>

      {/* Lead-in question */}
      <p className="font-bold text-gray-900 mb-4">{question.question_text}</p>

      {/* Options */}
      <div className="space-y-2 mb-6">
        {question.options.map((option) => (
          <button
            key={option.letter}
            onClick={() => handleSelect(option.letter)}
            disabled={!!selectedAnswer || loading}
            className={getOptionClass(option)}
          >
            <span className="font-bold mr-2">{option.letter}.</span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center text-gray-500 text-sm">
          Checking answer...
        </div>
      )}

      {/* Feedback panel */}
      {reveal && (
        <div className="space-y-3">
          <div className="bg-blue-50 border-l-4 border-brand-mid rounded-r-lg p-4">
            <p
              className={`font-bold text-lg ${
                reveal.is_correct ? 'text-correct-dark' : 'text-wrong-dark'
              }`}
            >
              {reveal.is_correct
                ? 'Correct!'
                : `Incorrect — the answer was ${reveal.correct_answer}`}
            </p>
            <p className="text-gray-700 mt-2 leading-relaxed">
              {reveal.explanation}
            </p>
          </div>

          {/* Key Pearls */}
          {reveal.nuggets.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium text-amber-800 text-sm mb-2">
                Key Pearls
              </p>
              <ul className="space-y-1">
                {reveal.nuggets.map((nugget, i) => (
                  <li key={i} className="text-sm text-amber-900 flex">
                    <span className="mr-2">•</span>
                    <span>{nugget}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source info */}
          {reveal.cor_loe && (
            <p className="text-xs italic text-gray-400">{reveal.cor_loe}</p>
          )}

          <div className="flex justify-end">
            <Button onClick={onNext} variant="primary">
              {currentIndex + 1 < totalQuestions ? 'Next Question' : 'See Results'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
