import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CategoryBadges } from '@/components/admin/CategoryBadges';

interface Props {
  params: { id: string };
  searchParams: { sort?: string; dir?: string };
}

export default async function AdminEducatorPage({ params, searchParams }: Props) {
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

  // Fetch target educator
  const { data: educator } = await service
    .from('educators')
    .select('id, email, display_name, created_at')
    .eq('id', params.id)
    .single();

  if (!educator) notFound();

  // Fetch their quizzes with question data
  const { data: quizzes } = await service
    .from('quizzes')
    .select('id, title, source_reference, source_filename, status, share_token, created_at')
    .eq('educator_id', params.id)
    .order('created_at', { ascending: false });

  // Fetch questions for all quizzes
  const quizIds = (quizzes || []).map((q) => q.id);
  const { data: questions } = quizIds.length > 0
    ? await service
        .from('questions')
        .select('id, quiz_id, organ_systems, physician_tasks, disciplines')
        .in('quiz_id', quizIds)
    : { data: [] as Array<{ id: string; quiz_id: string; organ_systems: string[]; physician_tasks: string[]; disciplines: string[] }> };

  // Aggregate per quiz
  const quizStats: Record<string, {
    count: number;
    organ_systems: Set<string>;
    physician_tasks: Set<string>;
    disciplines: Set<string>;
  }> = {};

  for (const q of questions || []) {
    if (!quizStats[q.quiz_id]) {
      quizStats[q.quiz_id] = {
        count: 0,
        organ_systems: new Set(),
        physician_tasks: new Set(),
        disciplines: new Set(),
      };
    }
    const s = quizStats[q.quiz_id];
    s.count++;
    (q.organ_systems || []).forEach((v: string) => s.organ_systems.add(v));
    (q.physician_tasks || []).forEach((v: string) => s.physician_tasks.add(v));
    (q.disciplines || []).forEach((v: string) => s.disciplines.add(v));
  }

  const sort = searchParams.sort || 'created_at';
  const dir = searchParams.dir === 'asc' ? 'asc' : 'desc';

  const quizRows = (quizzes || []).map((q) => ({
    ...q,
    question_count: quizStats[q.id]?.count || 0,
    organ_systems: Array.from(quizStats[q.id]?.organ_systems || []),
    physician_tasks: Array.from(quizStats[q.id]?.physician_tasks || []),
    disciplines: Array.from(quizStats[q.id]?.disciplines || []),
  }));

  quizRows.sort((a, b) => {
    let cmp = 0;
    if (sort === 'title') cmp = a.title.localeCompare(b.title);
    else if (sort === 'status') cmp = a.status.localeCompare(b.status);
    else if (sort === 'question_count') cmp = a.question_count - b.question_count;
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === 'asc' ? cmp : -cmp;
  });

  function sortUrl(column: string) {
    const newDir = sort === column && dir === 'desc' ? 'asc' : 'desc';
    return `/admin/educators/${params.id}?sort=${column}&dir=${newDir}`;
  }

  function sortIndicator(column: string) {
    if (sort !== column) return '';
    return dir === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  const statusColor: Record<string, string> = {
    published: 'bg-green-50 text-green-700',
    review: 'bg-amber-50 text-amber-700',
    generating: 'bg-blue-50 text-blue-700',
    draft: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Users', href: '/admin?tab=users' },
          { label: educator.display_name || educator.email },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-900">
            {educator.display_name || educator.email}
          </h1>
          <p className="text-sm text-gray-500">
            {educator.email} · Joined {new Date(educator.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">
                  <Link href={sortUrl('title')}>Title{sortIndicator('title')}</Link>
                </th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">
                  <Link href={sortUrl('status')}>Status{sortIndicator('status')}</Link>
                </th>
                <th className="px-4 py-3 text-right">
                  <Link href={sortUrl('question_count')}>Qs{sortIndicator('question_count')}</Link>
                </th>
                <th className="px-4 py-3">Organ Systems</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Disciplines</th>
                <th className="px-4 py-3">Share Link</th>
                <th className="px-4 py-3">
                  <Link href={sortUrl('created_at')}>Created{sortIndicator('created_at')}</Link>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quizRows.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/educators/${params.id}/quizzes/${q.id}`}
                      className="text-brand-mid hover:underline font-medium"
                    >
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                    {q.source_reference || q.source_filename || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[q.status] || ''}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {q.question_count}
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
              ))}
              {quizRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No question sets yet.
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
