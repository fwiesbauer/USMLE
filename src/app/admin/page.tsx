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
    topic: string;
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
    // Analytics
    attempts: number;
    correct: number;
    incorrect: number;
    certain: number;
    medium: number;
    uncertain: number;
    thumbs_up: number;
    thumbs_down: number;
    comment_count: number;
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
      .select('id, question_text, topic, organ_systems, physician_tasks, disciplines, created_at, quiz_id')
      .order('created_at', { ascending: false })
      .limit(500);

    if (questions && questions.length > 0) {
      const questionIds = questions.map((q) => q.id);
      const quizIds = Array.from(new Set(questions.map((q) => q.quiz_id)));

      // Fetch quizzes, educators, and analytics in parallel
      const [
        { data: quizzes },
        { data: attempts },
        { data: votes },
        { data: commentCounts },
      ] = await Promise.all([
        service
          .from('quizzes')
          .select('id, educator_id, source_reference, source_filename, source_metadata, doi, share_token')
          .in('id', quizIds),
        service
          .from('question_attempts')
          .select('question_id, is_correct, certainty')
          .in('question_id', questionIds),
        service
          .from('question_votes')
          .select('question_id, vote')
          .in('question_id', questionIds),
        service
          .from('question_comments')
          .select('question_id')
          .in('question_id', questionIds),
      ]);

      // Build attempt stats per question
      const attemptStats: Record<string, { attempts: number; correct: number; incorrect: number; certain: number; medium: number; uncertain: number }> = {};
      for (const a of attempts || []) {
        const s = attemptStats[a.question_id] || (attemptStats[a.question_id] = { attempts: 0, correct: 0, incorrect: 0, certain: 0, medium: 0, uncertain: 0 });
        s.attempts++;
        if (a.is_correct) s.correct++; else s.incorrect++;
        if (a.certainty === 'certain') s.certain++;
        else if (a.certainty === 'medium') s.medium++;
        else if (a.certainty === 'uncertain') s.uncertain++;
      }

      // Build vote stats per question
      const voteStats: Record<string, { up: number; down: number }> = {};
      for (const v of votes || []) {
        const s = voteStats[v.question_id] || (voteStats[v.question_id] = { up: 0, down: 0 });
        if (v.vote === 1) s.up++; else s.down++;
      }

      // Build comment counts per question
      const commentCountMap: Record<string, number> = {};
      for (const c of commentCounts || []) {
        commentCountMap[c.question_id] = (commentCountMap[c.question_id] || 0) + 1;
      }

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
        const as = attemptStats[q.id] || { attempts: 0, correct: 0, incorrect: 0, certain: 0, medium: 0, uncertain: 0 };
        const vs = voteStats[q.id] || { up: 0, down: 0 };
        return {
          id: q.id,
          question_text: q.question_text,
          topic: q.topic || '',
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
          attempts: as.attempts,
          correct: as.correct,
          incorrect: as.incorrect,
          certain: as.certain,
          medium: as.medium,
          uncertain: as.uncertain,
          thumbs_up: vs.up,
          thumbs_down: vs.down,
          comment_count: commentCountMap[q.id] || 0,
        };
      });

      // Sort
      allQuestions.sort((a, b) => {
        let cmp = 0;
        if (sort === 'educator') cmp = a.educator_email.localeCompare(b.educator_email);
        else if (sort === 'topic') cmp = a.topic.localeCompare(b.topic);
        else if (sort === 'attempts') cmp = a.attempts - b.attempts;
        else if (sort === 'correct') cmp = a.correct - b.correct;
        else if (sort === 'incorrect') cmp = a.incorrect - b.incorrect;
        else if (sort === 'thumbs_up') cmp = a.thumbs_up - b.thumbs_up;
        else if (sort === 'thumbs_down') cmp = a.thumbs_down - b.thumbs_down;
        else if (sort === 'comments') cmp = a.comment_count - b.comment_count;
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
                  <th className="px-4 py-3 min-w-[60px]">ID</th>
                  <th className="px-4 py-3 min-w-[200px]">
                    <Link href={sortUrl('topic')}>Topic{sortIndicator('topic')}</Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('educator')}>Creator{sortIndicator('educator')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('attempts')}>Taken{sortIndicator('attempts')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('correct')}>Correct{sortIndicator('correct')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('incorrect')}>Wrong{sortIndicator('incorrect')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">Certainty</th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('thumbs_up')}>👍{sortIndicator('thumbs_up')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('thumbs_down')}>👎{sortIndicator('thumbs_down')}</Link>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Link href={sortUrl('comments')}>💬{sortIndicator('comments')}</Link>
                  </th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">
                    <Link href={sortUrl('created_at')}>Created{sortIndicator('created_at')}</Link>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allQuestions.map((q) => {
                  const meta = q.source_metadata as { article_title?: string; authors?: { family: string; given: string }[]; journal_abbreviation?: string; year?: number; doi?: string } | null;
                  const pctCorrect = q.attempts > 0 ? Math.round((q.correct / q.attempts) * 100) : null;
                  return (
                  <tr key={q.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                      <span className="select-all cursor-pointer" title="Click to select full ID">{q.id}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs">
                      <p className="font-medium text-sm">{q.topic || '—'}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{q.question_text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/educators/${q.educator_id}`}
                        className="text-brand-mid hover:underline text-xs"
                      >
                        {q.educator_name || q.educator_email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">
                      {q.attempts || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {q.attempts > 0 ? (
                        <span className="text-correct-dark font-medium">
                          {q.correct} <span className="text-gray-400 font-normal text-xs">({pctCorrect}%)</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {q.attempts > 0 ? (
                        <span className="text-wrong-dark font-medium">
                          {q.incorrect}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                      {q.attempts > 0 ? (
                        <span className="flex items-center justify-end gap-1.5">
                          <span className="text-emerald-600" title="Certain">{q.certain}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-amber-600" title="Medium">{q.medium}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-red-600" title="Uncertain">{q.uncertain}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-correct-dark font-medium">
                      {q.thumbs_up || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-wrong-dark font-medium">
                      {q.thumbs_down || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-medium">
                      {q.comment_count || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                      <p className="truncate" title={meta?.article_title || q.source_filename || ''}>
                        {meta?.authors?.[0]?.family ? `${meta.authors[0].family} ` : ''}{meta?.year || ''}{meta?.journal_abbreviation ? `, ${meta.journal_abbreviation}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  );
                })}
                {allQuestions.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
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
