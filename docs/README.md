# QuizForge — USMLE Step 2 CK Question Generator

**Built by Medmastery & LITFL (Life in the Fast Lane)**

QuizForge is a full-stack web application that transforms clinical PDFs — guidelines, textbook chapters, journal articles — into high-quality USMLE Step 2 CK practice questions using AI.

## What It Does

### For Educators
1. **Upload a PDF** (clinical guideline, textbook chapter, research paper).
2. **AI generates** realistic, vignette-based USMLE-style questions from the source material.
3. **Review & edit** every question before publishing — fix wording, adjust options, update metadata.
4. **Publish & share** a link that learners can open in any browser — no login required for them.
5. **View learner feedback** — see thumbs-up/down votes and comments on each question.

### For Learners
1. **Open a quiz link** (no account needed).
2. **Answer questions** one at a time, with immediate feedback after each answer.
3. **See explanations**, key pearls, source references, and COR/LOE evidence levels.
4. **Vote and comment** on questions to help educators improve quality.
5. **Retry incorrect questions** and view final score breakdown.

## Tech Stack Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | React 18, Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude (primary), OpenAI GPT-4o, Google Gemini (alternatives) |
| PDF Parsing | pdf-parse |
| Validation | Zod |
| Testing | Vitest (unit), Playwright (E2E) |

## Documentation Index

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Project structure, component hierarchy, data flow |
| [SETUP.md](./SETUP.md) | How to set up the development environment |
| [DATABASE.md](./DATABASE.md) | Database schema, migrations, RLS policies |
| [API.md](./API.md) | Complete API endpoint reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How to deploy to Vercel + Supabase |

## Key Concepts

### Quiz Lifecycle

A quiz moves through four statuses:

```
draft → generating → review → published
```

1. **Draft** — Educator creates a quiz and uploads a PDF. The app extracts text from the PDF, extracts a structured bibliographic citation (authors, title, journal, DOI) using a lightweight AI call, and enriches the metadata by looking up PubMed (PMID, PMCID, MeSH terms) and Crossref (bibliographic data).
2. **Generating** — The AI generates questions from the extracted text. This can take 30–120 seconds depending on question count (3–30 questions per quiz).
3. **Review** — Educator reviews, edits, deletes, or approves the AI-generated questions. Each question includes a clinical vignette, five answer options, an explanation, key pearls, and metadata (organ system, physician task, discipline, COR/LOE). Source reference fields (authors, article title, journal, publication info) are individually editable; DOI, PMID, and PMCID are displayed as read-only identifiers with clickable links.
4. **Published** — A unique share token is generated. Anyone with the link `/q/{token}` can take the quiz.

### Question Format

Every question follows the USMLE one-best-answer format:
- A 3–6 sentence **clinical vignette** with a fictional patient
- A **closed lead-in** question (e.g., "Which of the following is the most appropriate next step?")
- **Five answer options** (A–E), all from the same category (all diagnoses, all treatments, etc.)
- An **explanation** connecting the vignette to the correct answer and explaining why distractors are wrong
- **2–4 key pearls** — standalone memorable facts
- **Classification metadata**: organ system, physician task, discipline, COR/LOE, source section

### Three User Roles

| Role | Authentication | What They Can Do |
|------|---------------|-----------------|
| **Educator** | Email/password via Supabase Auth | Create quizzes, upload PDFs, generate & edit questions, publish, view feedback, submit site feedback |
| **Admin** | Email/password + `role = 'admin'` in DB | Everything an educator can do, plus a read-only admin dashboard to view all educators, quizzes, and questions across the platform |
| **Learner** | None (anonymous) | Take published quizzes, vote, comment. Progress saved in browser localStorage |

### AI Provider Support

Educators can choose their preferred AI provider in Settings and provide their own API key:

| Provider | Generation Model | Light-task Model | Use Case |
|----------|-----------------|-----------------|----------|
| Anthropic (default) | Claude Sonnet 4.5 | Claude Haiku 4.5 | Best question quality |
| OpenAI | GPT-4o | GPT-4o-mini | Alternative |
| Google | Gemini 2.0 Flash | Gemini 2.0 Flash Lite | Alternative |

API keys are encrypted at rest using AES-256-GCM before being stored in the database.

## Project History

The project was built iteratively, feature by feature. Here is the chronological development history:

1. **Initial scaffold** — Next.js 14 app with Supabase auth, educator dashboard, quiz creation, PDF upload, AI question generation, and learner quiz interface.
2. **Quiz UX fixes** — Fixed answer carry-over between questions, improved published quiz styling.
3. **Share URL fix** — Fixed share links using `localhost` instead of the deployment URL.
4. **Generation reliability** — Replaced fire-and-forget pattern with synchronous execution to prevent timeouts.
5. **Signup fix** — Used a database trigger to auto-create educator profiles on signup (bypassing RLS timing issues).
6. **Branding** — Branded as Medmastery & LITFL USMLE Question Generator with custom colors and logo.
7. **Prompt improvements** — Upgraded the AI prompt to focus on Step 2 CK, added detailed question-writing rules.
8. **COR/LOE support** — Added Class of Recommendation / Level of Evidence dropdown with tooltip hints.
9. **Question classification** — Added three classification dimensions: organ system, physician task, discipline.
10. **Source references** — Auto-extract bibliographic citations from uploaded PDFs using AI.
11. **Student feedback** — Added voting (thumbs up/down) and commenting on questions, DOI links.
12. **Prompt refinements** — Added distractor plausibility rules and cognitive skill variety requirements.
13. **Auth improvements** — Email confirmation page, forgot/reset password flow, sign-out redirect fix.
14. **Multi-provider AI** — Added OpenAI and Google Gemini as alternative AI providers.
15. **Bug fixes** — Fixed retry crash, favicon issues, votes/comments server-side errors.
16. **Favicon** — Added LITFL branded favicons in multiple sizes.
17. **Feedback widget** — Intercom-style floating feedback button on educator pages. Educators can submit bugs, suggestions, questions, or general feedback. Stored in a `site_feedback` table.
18. **Editable quiz metadata** — Quiz title, source reference, and DOI are now inline-editable on the review page (click to edit, Enter to save, Escape to cancel).
19. **Admin dashboard** — Read-only admin panel at `/admin` for platform oversight. Shows all educators with quiz/question counts, and a searchable "All Questions" tab. Drill-down pages for individual educators and their quizzes. Admin access is role-based (`educators.role = 'admin'`), enforced in middleware.
20. **Admin improvements** — Added share link and total question count columns to admin tables. Fixed admin link visibility by using service client to bypass RLS for role check.
21. **Share link fix** — Fixed share URLs that broke when using hardcoded absolute URLs. Admin pages now use relative `/q/{token}` paths; publish endpoint constructs URLs from request headers with fallback to `NEXT_PUBLIC_APP_URL`.
22. **Sign-out fix** — Fixed HTTP 405 error on logout. The form POST to `/api/auth/logout` caused a 307 redirect that preserved the POST method on `/login` (a GET-only page). Refactored to a client-side `SignOutButton` component that calls `supabase.auth.signOut()` directly and navigates with `router.push()`.
23. **Structured source metadata** — Replaced free-text citation extraction with structured bibliographic metadata: article title, authors, journal, year, volume, issue, pages, DOI, PMID, PMCID, keywords, and document type. Stored as JSONB in a `source_metadata` column. AI-suggested filenames are generated for uploaded PDFs.
24. **PubMed/Crossref enrichment** — After PDF upload, the app enriches extracted metadata by querying external APIs: Crossref (bibliographic data from DOI), NCBI ID Converter (DOI → PMID + PMCID), PubMed ESearch (DOI/title-based PMID discovery), and PubMed ESummary/EFetch (full metadata, MeSH terms, author keywords). Uses a multi-layered fallback strategy with parallel API calls for speed.
25. **Dedicated PMID/PMCID columns** — Added dedicated `pmid` and `pmcid` columns to the quizzes table for reliable persistence. These identifiers are extracted via regex, LLM, and enrichment APIs, then saved as top-level columns (in addition to being inside `source_metadata` JSONB).
26. **Structured reference editing** — Broke the single "Source reference" edit field into four separately editable fields: Authors, Article title, Journal, and Year/Volume/Issue/Pages. DOI, PMID, and PMCID are displayed as non-editable, clickable identifiers. Changes update both `source_metadata` JSONB and the reconstructed `source_reference` string.
27. **Auto-merge CI** — Added a GitHub Actions workflow (`.github/workflows/auto-merge-to-main.yml`) that automatically merges pushes to `claude/**` branches into `main`, eliminating the need for manual pull request creation and merging. Vercel auto-deploys from `main`.
28. **Certainty-based marking** — Two-step answer flow: learner selects an answer (highlighted but not submitted), then picks a certainty level (Certain/Medium/Uncertain). Six contextual feedback messages combine correctness × certainty (e.g. "You were certain — but this was actually wrong. Confident mistakes are the most important ones to address."). Certainty data stored in `question_attempts` table.
29. **Server-side answer tracking** — New `question_attempts` table records every answer attempt with selected option, correctness, certainty level, visitor ID, and session ID. Replaces the previous localStorage-only approach with server-side persistence for analytics.
30. **Quiz session tracking** — New `quiz_sessions` table tracks each quiz take as a unit: start time, completion time, final score, and visitor. Enables "how many times was this quiz taken?" and abandonment analysis.
31. **Attempt-linked feedback** — Votes (thumbs up/down) and comments now link to the specific `question_attempt` they were made on via `attempt_id`. Enables per-attempt analytics: was this attempt correct, what certainty, did they upvote, did they comment.
32. **Admin analytics dashboard** — Redesigned the admin All Questions table with per-question analytics: times taken, correct/incorrect counts (with %), certainty breakdown (certain/medium/uncertain), thumbs up/down, comment count. All columns sortable.
33. **DOI sanitization** — Fixed corrupted DOIs where PDF extraction concatenated URLs onto DOI strings. Added `cleanDoi()` at extraction, display, and database levels. Migration 00014 cleans existing records.
34. **CI/CD Vercel deploy** — GitHub Actions auto-merge workflow now includes Vercel CLI build and deploy steps, since `GITHUB_TOKEN` pushes don't trigger Vercel's Git integration webhook. Requires `VERCEL_TOKEN` repository secret.
