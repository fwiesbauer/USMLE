import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SourceMetadataSchema = z.object({
  article_title: z.string().nullable().optional(),
  authors: z.array(z.object({ family: z.string(), given: z.string() })).optional(),
  journal_title: z.string().nullable().optional(),
  journal_abbreviation: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  publication_date: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  issue: z.string().nullable().optional(),
  pages: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
  issn: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  document_type: z.enum(['journal_article', 'manuscript']).optional(),
  suggested_filename: z.string().optional(),
}).optional();

const UpdateQuizSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  source_reference: z.string().optional(),
  source_metadata: SourceMetadataSchema,
  doi: z.string().optional(),
  pmid: z.string().optional(),
  pmcid: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', params.id)
    .eq('educator_id', user.id)
    .single();

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', params.id)
    .order('position');

  return NextResponse.json({ ...quiz, questions: questions || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateQuizSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from('quizzes')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('educator_id', user.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', params.id)
    .eq('educator_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
