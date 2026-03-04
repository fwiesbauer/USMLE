'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [warning, setWarning] = useState('');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'confirm' | 'generating'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.pdf$/i, ''));
      }
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.type === 'application/pdf') {
        setFile(dropped);
        if (!title) {
          setTitle(dropped.name.replace(/\.pdf$/i, ''));
        }
      }
    },
    [title]
  );

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setError('');
    setUploading(true);

    try {
      // Create quiz record first
      const createRes = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          question_count_requested: questionCount,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        setError(data.error || 'Failed to create quiz.');
        return;
      }

      const quiz = await createRes.json();
      setQuizId(quiz.id);

      // Upload PDF
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`/api/quizzes/${quiz.id}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setError(data.error || 'Failed to upload PDF.');
        return;
      }

      const uploadData = await uploadRes.json();
      setPreview(uploadData.source_text_preview);
      setWordCount(uploadData.word_count);
      if (uploadData.warning) setWarning(uploadData.warning);
      setStep('confirm');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!quizId) return;
    setError('');
    setGenerating(true);
    setStep('generating');

    try {
      // The generate endpoint runs synchronously — it awaits AI generation
      // and returns when questions are saved. This can take 30-120+ seconds.
      const res = await fetch(`/api/quizzes/${quizId}/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Generation failed. Please try again.');
        setStep('confirm');
        setGenerating(false);
        return;
      }

      if (data.status === 'review') {
        router.push(`/quizzes/${quizId}/review`);
        return;
      }
    } catch {
      // Network error or timeout — check if generation completed in the background
      // by polling status once
      try {
        const statusRes = await fetch(`/api/quizzes/${quizId}/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'review') {
            router.push(`/quizzes/${quizId}/review`);
            return;
          }
        }
      } catch {
        // ignore
      }
      setError('An unexpected error occurred. Please check your quiz list — questions may still have been generated.');
      setStep('confirm');
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold text-brand-dark">
            <a href="/dashboard">QuizForge</a>
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">New Quiz</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {step === 'upload' && (
          <Card>
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-mid transition-colors"
              >
                {file ? (
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500 mb-2">
                      Drag and drop a PDF here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              <Input
                id="title"
                label="Quiz Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Cardiology Guidelines Review"
              />

              <div>
                <label
                  htmlFor="questionCount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Questions
                </label>
                <input
                  id="questionCount"
                  type="number"
                  min={3}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="block w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
                />
              </div>

              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={!file || !title.trim()}
                className="w-full"
              >
                Upload & Extract Text
              </Button>
            </div>
          </Card>
        )}

        {step === 'confirm' && (
          <Card>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Text Extracted</h3>
              {wordCount !== null && (
                <p className="text-sm text-gray-600">
                  {wordCount.toLocaleString()} words extracted
                </p>
              )}
              {warning && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {warning}
                </p>
              )}
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-auto">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {preview}...
                </p>
              </div>
              <Button onClick={handleGenerate} className="w-full">
                Generate {questionCount} Questions
              </Button>
            </div>
          </Card>
        )}

        {step === 'generating' && (
          <Card className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-mid mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              Generating questions...
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This may take 30–120 seconds depending on the document length.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
