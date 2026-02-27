'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export default function QuizSettingsPage() {
  const params = useParams();
  const quizId = params.id as string;

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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Quiz Settings
        </h2>
        <Card>
          <p className="text-gray-500">
            Quiz ID: {quizId}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Settings page — additional configuration options will be available in
            future updates.
          </p>
        </Card>
      </main>
    </div>
  );
}
