'use client';

import type { Question } from '@/types/quiz';

interface QuestionCardProps {
  question: Question;
  isSelected: boolean;
  isEdited: boolean;
  onClick: () => void;
}

export function QuestionCard({
  question,
  isSelected,
  isEdited,
  onClick,
}: QuestionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-brand-mid bg-brand-light'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-gray-500">
            Q{question.position}
          </span>
          <span className="inline-block bg-brand-light text-brand-dark text-xs font-medium px-2 py-0.5 rounded-full truncate">
            {question.topic}
          </span>
        </div>
        <span className="text-sm flex-shrink-0 ml-2">
          {isEdited ? (
            <span className="text-yellow-500" title="Edited">
              ✎
            </span>
          ) : (
            <span className="text-correct-dark" title="Original">
              ✓
            </span>
          )}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1 truncate">
        {question.question_text}
      </p>
    </button>
  );
}
