# Database Schema

QuizForge uses **Supabase** (PostgreSQL) as its database. All migrations are in `supabase/migrations/` and should be run in numerical order.

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    │
    │ 1:1 (trigger: handle_new_user)
    ▼
educators
    │
    │ 1:many
    ▼
quizzes
    │
    │ 1:many
    ▼
questions ──────┬──────────────┐
    │           │              │
    │ 1:many    │ 1:many       │
    ▼           ▼              │
question_    question_         │
comments     votes             │
```

## Tables

### `educators`

Extends Supabase's `auth.users` with app-specific fields.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK → auth.users | Matches the Supabase auth user ID |
| `email` | TEXT | NOT NULL | User's email |
| `display_name` | TEXT | nullable | Optional display name |
| `anthropic_api_key_encrypted` | TEXT | nullable | AES-256-GCM encrypted API key (any provider) |
| `ai_provider` | TEXT | NOT NULL, DEFAULT 'anthropic' | AI provider: 'anthropic', 'openai', or 'google' |
| `role` | TEXT | NOT NULL, DEFAULT 'educator', CHECK IN ('educator','admin') | User role for access control |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |

**Note**: The column is named `anthropic_api_key_encrypted` for historical reasons, but it stores the encrypted key for whichever provider is selected.

### `quizzes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Quiz identifier |
| `educator_id` | UUID | NOT NULL, FK → educators | Owner |
| `title` | TEXT | NOT NULL | Quiz title |
| `source_filename` | TEXT | nullable | Original PDF filename |
| `source_text` | TEXT | nullable | Extracted text from PDF (max ~100k chars) |
| `source_reference` | TEXT | nullable | Formatted bibliographic citation (NEJM-style) |
| `doi` | TEXT | nullable | Digital Object Identifier |
| `pmid` | TEXT | nullable | PubMed identifier (e.g. "12345678") |
| `pmcid` | TEXT | nullable | PubMed Central identifier (e.g. "PMC12345678") |
| `source_metadata` | JSONB | nullable | Structured bibliographic metadata (see below) |
| `suggested_filename` | TEXT | nullable | AI-suggested PDF filename |
| `pdf_storage_path` | TEXT | nullable | Path in Supabase Storage |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | 'draft', 'generating', 'review', 'published' |
| `share_token` | TEXT | UNIQUE, nullable | UUID token for public access |
| `question_count_requested` | INT | NOT NULL, DEFAULT 10 | How many questions the educator requested |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `published_at` | TIMESTAMPTZ | nullable | When the quiz was published |

#### `source_metadata` JSONB Structure

The `source_metadata` column stores structured bibliographic data extracted from the uploaded PDF and enriched via PubMed/Crossref APIs:

```json
{
  "article_title": "Effect of Aspirin on Cardiovascular Events",
  "authors": [{"family": "Smith", "given": "JA"}, {"family": "Jones", "given": "B"}],
  "journal_title": "New England Journal of Medicine",
  "journal_abbreviation": "N Engl J Med",
  "year": 2024,
  "publication_date": "2024-03-15",
  "volume": "392",
  "issue": "15",
  "pages": "1432-1440",
  "doi": "10.1056/NEJMoa2401234",
  "pmid": "38765432",
  "pmcid": "PMC11234567",
  "issn": "0028-4793",
  "keywords": ["Aspirin", "Cardiovascular Events", "Myocardial Infarction"],
  "document_type": "journal_article",
  "suggested_filename": "Smith 2024 - Aspirin Cardiovascular Events.pdf"
}
```

### `questions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Question identifier |
| `quiz_id` | UUID | NOT NULL, FK → quizzes (CASCADE) | Parent quiz |
| `position` | INT | NOT NULL | Display order (1-based) |
| `topic` | TEXT | NOT NULL | Short topic label (3–5 words) |
| `section` | TEXT | nullable | Source section reference (e.g., "Section 7.3 — Diuretics") |
| `cor_loe` | TEXT | nullable | Class of Recommendation / Level of Evidence |
| `vignette` | TEXT | NOT NULL | Clinical scenario (3–6 sentences) |
| `question_text` | TEXT | NOT NULL | The lead-in question |
| `options` | JSONB | NOT NULL | Array of `{ letter, text }` (always 5 options, A–E) |
| `correct_answer` | TEXT | NOT NULL | Letter of the correct option ("A"–"E") |
| `explanation` | TEXT | NOT NULL | 3–5 sentence explanation |
| `nuggets` | JSONB | NOT NULL | Array of 2–4 key pearl strings |
| `organ_systems` | JSONB | NOT NULL, DEFAULT '[]' | Classification: organ systems |
| `physician_tasks` | JSONB | NOT NULL, DEFAULT '[]' | Classification: physician tasks |
| `disciplines` | JSONB | NOT NULL, DEFAULT '[]' | Classification: disciplines |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

### `question_comments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `question_id` | UUID | NOT NULL, FK → questions (CASCADE) | |
| `commenter_name` | TEXT | nullable | Optional name (anonymous if null) |
| `comment_text` | TEXT | NOT NULL | The comment content |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

### `question_votes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `question_id` | UUID | NOT NULL, FK → questions (CASCADE) | |
| `visitor_id` | TEXT | NOT NULL | Browser-generated anonymous ID |
| `vote` | SMALLINT | NOT NULL, CHECK (vote IN (-1, 1)) | -1 = thumbs down, 1 = thumbs up |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| | | UNIQUE(question_id, visitor_id) | One vote per visitor per question |

### `site_feedback`

General site feedback submitted by educators via the floating feedback widget.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `educator_id` | UUID | FK → educators (SET NULL on delete) | Submitting educator |
| `page_url` | TEXT | NOT NULL | URL of the page the feedback was submitted from |
| `feedback_type` | TEXT | NOT NULL, CHECK IN ('bug','suggestion','question','other') | Category of feedback |
| `message` | TEXT | NOT NULL | Feedback content |
| `email` | TEXT | nullable | Educator's email (captured at submission time) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

## Indexes

| Index | Table | Column(s) | Type |
|-------|-------|-----------|------|
| `idx_quizzes_educator_id` | quizzes | educator_id | B-tree |
| `idx_quizzes_share_token` | quizzes | share_token | B-tree |
| `idx_questions_quiz_id` | questions | quiz_id | B-tree |
| `idx_questions_position` | questions | (quiz_id, position) | B-tree |
| `idx_questions_organ_systems` | questions | organ_systems | GIN |
| `idx_questions_physician_tasks` | questions | physician_tasks | GIN |
| `idx_questions_disciplines` | questions | disciplines | GIN |
| `idx_question_comments_question_id` | question_comments | question_id | B-tree |
| `idx_question_votes_question_id` | question_votes | question_id | B-tree |
| `idx_site_feedback_created_at` | site_feedback | created_at DESC | B-tree |
| `idx_site_feedback_type` | site_feedback | feedback_type | B-tree |
| `idx_site_feedback_educator_id` | site_feedback | educator_id | B-tree |

## Row-Level Security (RLS)

All core tables have RLS enabled. Policies ensure data isolation between educators.

### `educators`

| Policy | Operation | Rule |
|--------|-----------|------|
| `educators_select_own` | SELECT | `auth.uid() = id` |
| `educators_insert_own` | INSERT | `auth.uid() = id` |
| `educators_update_own` | UPDATE | `auth.uid() = id` |

### `quizzes`

| Policy | Operation | Rule |
|--------|-----------|------|
| `quizzes_select_own` | SELECT | `educator_id = auth.uid()` |
| `quizzes_insert_own` | INSERT | `educator_id = auth.uid()` |
| `quizzes_update_own` | UPDATE | `educator_id = auth.uid()` |
| `quizzes_delete_own` | DELETE | `educator_id = auth.uid()` |

### `questions`

| Policy | Operation | Rule |
|--------|-----------|------|
| `questions_select_own` | SELECT | `quiz_id IN (SELECT id FROM quizzes WHERE educator_id = auth.uid())` |
| `questions_insert_own` | INSERT | Same subquery check |
| `questions_update_own` | UPDATE | Same subquery check |
| `questions_delete_own` | DELETE | Same subquery check |

### `site_feedback`

| Policy | Operation | Rule |
|--------|-----------|------|
| `site_feedback_insert_own` | INSERT | `educator_id = auth.uid()` |

Educators can only insert feedback for themselves. No SELECT/UPDATE/DELETE policies — feedback is write-only from the educator's perspective.

### `question_comments` and `question_votes`

These tables do **not** have RLS policies because they are accessed via the **service role client** in public API routes. The service role bypasses RLS entirely. This is intentional — learners are anonymous and have no auth session.

## Database Trigger

### `handle_new_user()`

Defined in migration `00002`. This trigger fires `AFTER INSERT ON auth.users` and automatically creates a corresponding row in the `educators` table. This solves a chicken-and-egg problem: the RLS policies on `educators` require `auth.uid() = id`, but the user hasn't confirmed their email yet when the profile needs to be created.

The function runs as `SECURITY DEFINER`, meaning it executes with the privileges of the function owner (superuser), bypassing RLS.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.educators (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migration History

| # | File | What It Does |
|---|------|-------------|
| 1 | `00001_create_tables.sql` | Creates `educators`, `quizzes`, `questions` tables with RLS |
| 2 | `00002_educator_trigger.sql` | Adds auto-create trigger for educator profiles on signup |
| 3 | `00003_add_classification_dimensions.sql` | Adds `organ_systems`, `physician_tasks`, `disciplines` columns with GIN indexes |
| 4 | `00004_add_source_reference.sql` | Adds `source_reference` column to quizzes |
| 5 | `00005_add_feedback_and_doi.sql` | Adds `doi` to quizzes, creates `question_comments` and `question_votes` tables |
| 6 | `00006_add_ai_provider.sql` | Adds `ai_provider` column to educators |
| 7 | `00007_add_site_feedback.sql` | Creates `site_feedback` table with RLS for educator feedback |
| 8 | `00008_add_educator_role.sql` | Adds `role` column to educators (`educator` or `admin`) |
| 9 | `00009_add_source_metadata.sql` | Adds `source_metadata` (JSONB) and `suggested_filename` columns to quizzes |
| 10 | `00010_add_pmid_pmcid_columns.sql` | Adds dedicated `pmid` and `pmcid` TEXT columns to quizzes |
| 11 | `00011_storage_rls_policies.sql` | Adds RLS policies on `storage.objects` and `storage.buckets` for browser-side PDF upload |
