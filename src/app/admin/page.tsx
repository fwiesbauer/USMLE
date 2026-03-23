import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CategoryBadges } from '@/components/admin/CategoryBadges';

interface Props {
  searchParams: { tab?: string; sort?: string; dir?: string };
}

export default async function AdminPage({ searchParams }: Props) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const service = createServiceClient();

  // Verify admin role (safety net beyond middleware)
  const { data: currentEducator } = await service
    .from('educators')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentEducator || currentEducator.role !== 'admin') {
    redirect('/dashboard');
  }

  const tab = searchParams.tab || 'users';
  const sort = searchParams.sort || (tab === 'users' ? 'created_at' : 'created_at');
  const dir = searchParams.dir === 'asc' ? 'asc' : 'desc';

  // Fetch counts for both tabs (lightweight queries)
  const [{ count: totalUsers }, { count: totalQuestions }] = await Promise.all([
    service.from('educators').select('id', { count: 'exact', head: true }),
    service.from('questions').select('id', { count: 'exact', head: true }),
  ]);

  // ---- Users tab data ----
  let educators: Array<{
    id: string;
    email: string;
    display_name: string | null;
    created_at: string;
    quiz_count: number;
    question_count: number;
  }> = [];

  // ---- All Questions tab data ----
  let allQuestions: Array<{
    id: string;
    question_text: string;
    organ_systems: string[];
    physician_tasks: string[];
    disciplines: string[];
    created_at: string;
    educator_email: string;
    educator_name: string | null;
    educator_id: string;
    source_reference: string | null;
    source_filename: string | null;
    source_metadata: Record<string, unknown> | null;
    doi: string | null;
    share_token: string | null;
  }> = [];

  if (tab === 'users') {
    const { data: eds } = await service
      .from('educators')
      .select('id, email, display_name, created_at');

    if (eds) {
      // Get quiz and question counts per educator
      const { data: quizzes } = await service
        .from('quizzes')
        .select('id, educator_id');

      const { data: questions } = await service
        .from('questions')
        .select('id, quiz_id');

      const quizCountByEd: Record<string, number> = {};
      const quizIdToEd: Record<string, string> = {};
      for (const q of quizzes || []) {
        quizCountByEd[q.educator_id] = (quizCountByEd[q.educator_id] || 0) + 1;
        quizIdToEd[q.id] = q.educator_id;
      }

      const questionCountByEd: Record<string, number> = {};
      for (const q of questions || []) {
        const edId = quizIdToEd[q.quiz_id];
        if (edId) {
          questionCountByEd[edId] = (questionCountByEd[edId] || 0) + 1;
        }
      }

      educators = eds.map((e) => ({
        ...e,
        quiz_count: quizCountByEd[e.id] || 0,
        question_count: questionCountByEd[e.id] || 0,
      }));

      // Sort
      educators.sort((a, b) => {
        let cmp = 0;
        if (sort === 'email') cmp = a.email.localeCompare(b.email);
        else if (sort === 'display_name') cmp = (a.display_name || '').localeCompare(b.display_name || '');
        else if (sort === 'quiz_count') cmp = a.quiz_count - b.quiz_count;
        else if (sort === 'question_count') cmp = a.question_count - b.question_count;
        else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return dir === 'asc' ? cmp : -cmp;
      });
    }
  } else {
    // All Questions tab
    const { data: questions } = await service
      .from('questions')
      .select('id, question_text, organ_systems, physician_tasks, disciplines, created_at, quiz_id')
      .order('created_at', { ascending: false })
      .limit(500);

    if (questions && questions.length > 0) {
      const quizIds = Array.from(new Set(questions.map((q) => q.quiz_id)));
      const { data: quizzes } = await service
        .from('quizzes')
        .select('id, educator_id, source_reference, source_filename, source_metadata, doi, share_token')
        .in('id', quizIds);

      const quizMap: Record<string, { educator_id: string; source_reference: string | null; source_filename: string | null; source_metadata: Record<string, unknown> | null; doi: string | null; share_token: string | null }> = {};
      for (const q of quizzes || []) {
        quizMap[q.id] = q;
      }

      const educatorIds = Array.from(new Set((quizzes || []).map((q) => q.educator_id)));
      const { data: eds } = await service
        .from('educators')
        .select('id, email, display_name')
        .in('id', educatorIds);

      const edMap: Record<string, { email: string; display_name: string | null }> = {};
      for (const e of eds || []) {
        edMap[e.id] = e;
      }

      allQuestions = questions.map((q) => {
        const quiz = quizMap[q.quiz_id] || { educator_id: '', source_reference: null, source_filename: null, source_metadata: null, doi: null, share_token: null };
        const ed = edMap[quiz.educator_id] || { email: '—', display_name: null };
        return {
          id: q.id,
          question_text: q.question_text,
          organ_systems: q.organ_systems || [],
          physician_tasks: q.physician_tasks || [],
          disciplines: q.disciplines || [],
          created_at: q.created_at,
          educator_email: ed.email,
          educator_name: ed.display_name,
          educator_id: quiz.educator_id,
          source_reference: quiz.source_reference,
          source_filename: quiz.source_filename,
          source_metadata: quiz.source_metadata as Record<string, unknown> | null,
          doi: quiz.doi,
          share_token: quiz.share_token,
        };
      });

      // Sort
      allQuestions.sort((a, b) => {
        let cmp = 0;
        if (sort === 'educator') cmp = a.educator_email.localeCompare(b.educator_email);
        else if (sort === 'organ_systems') cmp = (a.organ_systems[0] || '').localeCompare(b.organ_systems[0] || '');
        else if (sort === 'disciplines') cmp = (a.disciplines[0] || '').localeCompare(b.disciplines[0] || '');
        else if (sort === 'physician_tasks') cmp = (a.physician_tasks[0] || '').localeCompare(b.physician_tasks[0] || '');
        else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return dir === 'asc' ? cmp : -cmp;
      });
    }
  }

  function sortUrl(column: string) {
    const newDir = sort === column && dir === 'desc' ? 'asc' : 'desc';
    return `/admin?tab=${tab}&sort=${column}&dir=${newDir}`;
  }

  function sortIndicator(column: string) {
    if (sort !== column) return '';
    return dir === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <Link
            href="/admin?tab=users"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'users'
                ? 'border-brand-mid text-brand-mid'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Users ({totalUsers ?? '...'})
          </Link>
          <Link
            href="/admin?tab=questions"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'questions'
                ? 'border-brand-mid text-brand-mid'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Questions ({totalQuestions ?? '...'})
          </Link>
        </div>

        {tab === 'users' ? (
          /* ========== USERS TABLE ========== */
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">
                    <Link href={sortUrl('email')}>Email{sortIndicator('email')}</Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('display_name')}>Name{sortIndicator('display_name')}</Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('created_at')}>Joined{sortIndicator('created_at')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('quiz_count')}>Sets{sortIndicator('quiz_count')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('question_count')}>Questions{sortIndicator('question_count')}</Link>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {educators.map((ed) => (
                  <tr key={ed.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/educators/${ed.id}`} className="text-brand-mid hover:underline">
                        {ed.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ed.display_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(ed.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{ed.quiz_count}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{ed.question_count}</td>
                  </tr>
                ))}
                {educators.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========== ALL QUESTIONS TABLE ========== */
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 min-w-[250px]">Question</th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('organ_systems')}>Organ Systems{sortIndicator('organ_systems')}</Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('physician_tasks')}>Tasks{sortIndicator('physician_tasks')}</Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('disciplines')}>Disciplines{sortIndicator('disciplines')}</Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('educator')}>Creator{sortIndicator('educator')}</Link>
                  </th>
                  <th className="px-4 py-3">Article / Source</th>
                  <th className="px-4 py-3">Authors</th>
                  <th className="px-4 py-3">Journal</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">DOI</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Share Link</th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('created_at')}>Created{sortIndicator('created_at')}</Link>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allQuestions.map((q) => {
                  const meta = q.source_metadata as { article_title?: string; authors?: { family: string; given: string }[]; journal_title?: string; journal_abbreviation?: string; year?: number; doi?: string; document_type?: string } | null;
                  const doi = meta?.doi || q.doi;
                  return (
                  <tr key={q.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-gray-800 max-w-xs">
                      <p className="line-clamp-2">{q.question_text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadges items={q.organ_systems} type="organ" />
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadges items={q.physician_tasks} type="task" />
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadges items={q.disciplines} type="discipline" />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/educators/${q.educator_id}`}
                        className="text-brand-mid hover:underline text-xs"
                      >
                        {q.educator_name || q.educator_email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[250px]">
                      <p className="line-clamp-2">{meta?.article_title || q.source_reference || q.source_filename || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {meta?.authors?.length
                        ? meta.authors.map((a) => a.family).join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">
                      {meta?.journal_abbreviation || meta?.journal_title || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {meta?.year || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                      {doi ? (
                        <a href={`https://doi.org/${doi}`} target="_blank" rel="noopener noreferrer" className="text-brand-mid hover:underline">{doi}</a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {meta?.document_type === 'journal_article' ? 'Article' : meta?.document_type === 'manuscript' ? 'Manuscript' : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {q.share_token ? (
                        <a
                          href={`/q/${q.share_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-mid hover:underline"
                        >
                          /q/{q.share_token.slice(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  );
                })}
                {allQuestions.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-gray-400">
                      No questions generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
