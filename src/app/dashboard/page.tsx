import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { FeedbackWidget } from '@/components/ui/FeedbackWidget';
import { SignOutButton } from '@/components/ui/SignOutButton';

export default async function DashboardPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const service = createServiceClient();

  const [{ data: quizzes }, { data: educator }] = await Promise.all([
    supabase
      .from('quizzes')
      .select('*')
      .eq('educator_id', user.id)
      .order('created_at', { ascending: false }),
    service
      .from('educators')
      .select('role')
      .eq('id', user.id)
      .single(),
  ]);

  const isAdmin = educator?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-600 hover:text-brand-mid"
              >
                Admin
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              className="text-sm text-gray-600 hover:text-brand-mid"
            >
              Settings
            </Link>
            <SignOutButton className="text-sm text-gray-600 hover:text-brand-mid" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">My Quizzes</h2>
          <Link
            href="/quizzes/new"
            className="inline-flex items-center rounded-lg bg-brand-mid px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            New Quiz
          </Link>
        </div>

        {!quizzes || quizzes.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 mb-4">
              You haven&apos;t created any quizzes yet.
            </p>
            <Link
              href="/quizzes/new"
              className="text-brand-mid hover:underline font-medium"
            >
              Create your first quiz
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}/review`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 truncate">
                      {quiz.title}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        quiz.status === 'published'
                          ? 'bg-correct-fill text-correct-dark'
                          : quiz.status === 'review'
                            ? 'bg-amber-50 text-amber-700'
                            : quiz.status === 'generating'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {quiz.status}
                    </span>
                  </div>
                  {(() => {
                    const meta = quiz.source_metadata as {
                      article_title?: string;
                      authors?: { family: string; given: string }[];
                      journal_abbreviation?: string;
                      journal_title?: string;
                      year?: number;
                    } | null;
                    if (meta?.article_title) {
                      const authorStr = meta.authors?.length
                        ? meta.authors.slice(0, 3).map((a) => `${a.family} ${a.given?.charAt(0) || ''}`).join(', ') + (meta.authors.length > 3 ? ', et al.' : '')
                        : null;
                      const journal = meta.journal_abbreviation || meta.journal_title;
                      return (
                        <div className="mt-1 space-y-0.5">
                          {authorStr && (
                            <p className="text-xs text-gray-500 truncate">{authorStr}</p>
                          )}
                          <p className="text-xs text-gray-400 italic truncate">
                            {[journal, meta.year].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      );
                    }
                    return (quiz.source_reference || quiz.source_filename) ? (
                      <p className="text-xs text-gray-400 truncate">
                        {quiz.source_reference || quiz.source_filename}
                      </p>
                    ) : null;
                  })()}
                  <p className="text-xs text-gray-400 mt-2">
                    {quiz.question_count_requested} questions ·{' '}
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <FeedbackWidget />
    </div>
  );
}
