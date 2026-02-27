'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Question } from '@/types/quiz';

interface QuestionEditorProps {
  question: Question;
  onSave: (updated: Partial<Question>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function QuestionEditor({
  question,
  onSave,
  onDelete,
}: QuestionEditorProps) {
  const [topic, setTopic] = useState(question.topic);
  const [vignette, setVignette] = useState(question.vignette);
  const [questionText, setQuestionText] = useState(question.question_text);
  const [options, setOptions] = useState(question.options);
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer);
  const [explanation, setExplanation] = useState(question.explanation);
  const [nuggets, setNuggets] = useState(question.nuggets);
  const [section, setSection] = useState(question.section);
  const [corLoe, setCorLoe] = useState(question.cor_loe);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        topic,
        vignette,
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
        explanation,
        nuggets,
        section,
        cor_loe: corLoe,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const updateOption = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  };

  const addNugget = () => {
    setNuggets((prev) => [...prev, '']);
  };

  const removeNugget = (index: number) => {
    setNuggets((prev) => prev.filter((_, i) => i !== index));
  };

  const updateNugget = (index: number, value: string) => {
    setNuggets((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Question {question.position}
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            loading={saving}
            variant="primary"
          >
            Save
          </Button>
          <Button
            onClick={handleDelete}
            loading={deleting}
            variant="danger"
          >
            Delete
          </Button>
        </div>
      </div>

      <Input
        id="topic"
        label="Topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vignette
        </label>
        <textarea
          value={vignette}
          onChange={(e) => setVignette(e.target.value)}
          rows={5}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={2}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
        />
      </div>

      {/* Options A-E */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Options
        </label>
        {options.map((option, i) => (
          <div key={option.letter} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctAnswer"
              value={option.letter}
              checked={correctAnswer === option.letter}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="h-4 w-4 text-brand-mid focus:ring-brand-mid"
            />
            <span className="font-bold text-sm w-6">{option.letter}.</span>
            <input
              type="text"
              value={option.text}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
        />
      </div>

      {/* Nuggets / Pearls */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key Pearls
        </label>
        <div className="space-y-2">
          {nuggets.map((nugget, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-gray-400">•</span>
              <input
                type="text"
                value={nugget}
                onChange={(e) => updateNugget(i, e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
              />
              <button
                onClick={() => removeNugget(i)}
                className="text-gray-400 hover:text-red-500 text-sm"
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
          <Button onClick={addNugget} variant="secondary" className="text-xs">
            Add Pearl
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="section"
          label="Section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        />
        <Input
          id="cor_loe"
          label="COR / LOE"
          value={corLoe}
          onChange={(e) => setCorLoe(e.target.value)}
        />
      </div>
    </div>
  );
}
