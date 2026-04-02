import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CategoryBadges } from '@/components/admin/CategoryBadges';

interface Props {
  params: { id: string; quizId: string };
}

export default async function AdminQuizDetailPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const service = createServiceClient();

  // Verify admin
  const { data: currentEducator } = await service
    .from('educators')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentEducator || currentEducator.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch educator
  const { data: educator } = await service
    .from('educators')
    .select('id, email, display_name')
    .eq('id', params.id)
    .single();

  if (!educator) notFound();

  // Fetch quiz
  const { data: quiz } = await service
    .from('quizzes')
    .select('id, title, source_reference, source_filename, doi, status, created_at')
    .eq('id', params.quizId)
    .eq('educator_id', params.id)
    .single();

  if (!quiz) notFound();

  // Fetch questions
  const { data: questions } = await service
    .from('questions')
    .select('*')
    .eq('quiz_id', params.quizId)
    .order('position');

  // Fetch feedback stats for questions in this quiz
  const questionIds = (questions || []).map((q) => q.id);
  const [{ data: votes }, { data: comments }, { data: attempts }] = questionIds.length > 0
    ? await Promise.all([
        service.from('question_votes').select('question_id, vote').in('question_id', questionIds),
        service.from('question_comments').select('question_id').in('question_id', questionIds),
        service.from('question_attempts').select('question_id, is_correct').in('question_id', questionIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const feedbackMap: Record<string, { thumbs_up: number; thumbs_down: number; comment_count: number }> = {};
  for (const v of votes ?? []) {
    if (!feedbackMap[v.question_id]) feedbackMap[v.question_id] = { thumbs_up: 0, thumbs_down: 0, comment_count: 0 };
    if (v.vote === 1) feedbackMap[v.question_id].thumbs_up++;
    else if (v.vote === -1) feedbackMap[v.question_id].thumbs_down++;
  }
  for (const c of comments ?? []) {
    if (!feedbackMap[c.question_id]) feedbackMap[c.question_id] = { thumbs_up: 0, thumbs_down: 0, comment_count: 0 };
    feedbackMap[c.question_id].comment_count++;
  }

  const attemptMap: Record<string, { correct: number; incorrect: number }> = {};
  for (const a of attempts ?? []) {
    if (!attemptMap[a.question_id]) attemptMap[a.question_id] = { correct: 0, incorrect: 0 };
    if (a.is_correct) attemptMap[a.question_id].correct++;
    else attemptMap[a.question_id].incorrect++;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Users', href: '/admin?tab=users' },
          { label: educator.display_name || educator.email, href: `/admin/educators/${params.id}` },
          { label: quiz.title },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-900">{quiz.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            {quiz.source_reference && (
              <span>Source: {quiz.source_reference}</span>
            )}
            {quiz.doi && (
              <a
                href={quiz.doi.startsWith('http') ? quiz.doi : `https://doi.org/${quiz.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-mid hover:underline"
              >
                DOI
              </a>
            )}
            <span>Status: {quiz.status}</span>
            <span>{(questions || []).length} questions</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-8">#</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3 min-w-[200px]">Vignette</th>
                <th className="px-4 py-3 min-w-[200px]">Question</th>
                <th className="px-4 py-3 w-12">Ans</th>
                <th className="px-4 py-3">Organ Systems</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Disciplines</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3 text-right">Taken</th>
                <th className="px-4 py-3 text-right">Correct</th>
                <th className="px-4 py-3 text-right">Incorrect</th>
                <th className="px-4 py-3 text-right">👍</th>
                <th className="px-4 py-3 text-right">👎</th>
                <th className="px-4 py-3 text-right">💬</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(questions || []).map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {q.position}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs whitespace-nowrap">
                    {q.topic}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[250px]">
                    <p className="line-clamp-3">{q.vignette}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-800 text-xs max-w-[250px]">
                    <p className="line-clamp-3">{q.question_text}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-700 text-xs">
                    {q.correct_answer}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadges items={q.organ_systems || []} type="organ" max={2} />
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadges items={q.physician_tasks || []} type="task" max={2} />
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadges items={q.disciplines || []} type="discipline" max={2} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                    {q.section || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700 font-medium">
                    {((attemptMap[q.id]?.correct || 0) + (attemptMap[q.id]?.incorrect || 0)) > 0 ? (attemptMap[q.id]?.correct || 0) + (attemptMap[q.id]?.incorrect || 0) : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-correct-dark">
                    {(attemptMap[q.id]?.correct || 0) > 0 ? attemptMap[q.id].correct : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-wrong-dark">
                    {(attemptMap[q.id]?.incorrect || 0) > 0 ? attemptMap[q.id].incorrect : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700 font-medium">
                    {(feedbackMap[q.id]?.thumbs_up || 0) > 0 ? feedbackMap[q.id].thumbs_up : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700 font-medium">
                    {(feedbackMap[q.id]?.thumbs_down || 0) > 0 ? feedbackMap[q.id].thumbs_down : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700 font-medium">
                    {(feedbackMap[q.id]?.comment_count || 0) > 0 ? feedbackMap[q.id].comment_count : <span className="text-gray-300">0</span>}
                  </td>
                </tr>
              ))}
              {(!questions || questions.length === 0) && (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-gray-400">
                    No questions in this set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
