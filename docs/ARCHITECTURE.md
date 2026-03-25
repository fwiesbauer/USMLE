# Architecture

## Directory Structure

```
src/
├── app/                              # Next.js App Router (pages + API routes)
│   ├── (auth)/                       # Auth pages (login, signup, forgot/reset password)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── api/                          # Server-side API routes
│   │   ├── auth/
│   │   │   ├── callback/route.ts     # Email confirmation callback
│   │   │   └── logout/route.ts       # Sign out (server-side, 303 redirect)
│   │   ├── feedback/route.ts         # Submit site feedback (educator only)
│   │   ├── public/
│   │   │   ├── quizzes/[token]/route.ts        # Fetch public quiz
│   │   │   └── questions/[id]/
│   │   │       ├── votes/route.ts              # Vote on question
│   │   │       └── comments/route.ts           # Comment on question
│   │   ├── quizzes/[id]/
│   │   │   ├── route.ts              # Update quiz metadata
│   │   │   ├── upload/route.ts       # Upload PDF + extract text
│   │   │   ├── generate/route.ts     # Generate questions with AI
│   │   │   ├── publish/route.ts      # Publish quiz + create share token
│   │   │   ├── status/route.ts       # Check generation status
│   │   │   └── feedback/route.ts     # Get vote/comment stats
│   │   ├── questions/[id]/route.ts   # Edit/delete individual question
│   │   └── settings/api-key/route.ts # Save AI provider API key
│   ├── admin/
│   │   ├── page.tsx                  # Admin dashboard (users + all questions tabs)
│   │   └── educators/[id]/
│   │       ├── page.tsx              # Individual educator detail view
│   │       └── quizzes/[quizId]/page.tsx  # Admin quiz detail with all questions
│   ├── auth/
│   │   ├── callback/page.tsx         # Email verification landing
│   │   └── confirmed/page.tsx        # "Email confirmed" success page
│   ├── admin/
│   │   ├── page.tsx                  # Admin dashboard (users + all questions tabs)
│   │   └── educators/[id]/
│   │       ├── page.tsx              # Educator detail (their quizzes)
│   │       └── quizzes/[quizId]/page.tsx  # Quiz detail (all questions)
│   ├── dashboard/
│   │   ├── page.tsx                  # Educator quiz list
│   │   └── settings/page.tsx         # API key + provider settings
│   ├── quizzes/
│   │   ├── new/page.tsx              # Create quiz + upload PDF
│   │   └── [id]/
│   │       ├── review/page.tsx       # Review + edit generated questions
│   │       └── settings/page.tsx     # Quiz-level settings
│   ├── q/[token]/page.tsx            # Public learner quiz page
│   ├── layout.tsx                    # Root layout (fonts, metadata, icons)
│   ├── page.tsx                      # Landing page
│   ├── favicon.ico                   # Browser tab icon
│   └── globals.css                   # Tailwind CSS directives
│
├── components/
│   ├── editor/
│   │   ├── QuestionEditor.tsx        # Full question edit form (all fields)
│   │   └── QuestionCard.tsx          # Question list item in sidebar
│   ├── quiz/
│   │   ├── QuizQuestion.tsx          # Single question display (answer, vote, comment)
│   │   ├── QuizWelcome.tsx           # Quiz intro screen + resume prompt
│   │   ├── QuizResults.tsx           # Final score + question breakdown
│   │   └── RetrySection.tsx          # Retry only incorrect questions
│   ├── admin/
│   │   ├── AdminHeader.tsx           # Admin header with breadcrumbs + sign out
│   │   └── CategoryBadges.tsx        # Colored badges for organ system/task/discipline
│   └── ui/
│       ├── Button.tsx                # Primary/secondary/danger variants
│       ├── Input.tsx                 # Text input with label
│       ├── Card.tsx                  # Container card
│       ├── FeedbackWidget.tsx        # Floating feedback button (Intercom-style)
│       ├── Logo.tsx                  # App logo with link to landing page
│       ├── MultiSelect.tsx           # Dropdown for classification tags
│       ├── SignOutButton.tsx          # Client-side sign out button
│       └── Tooltip.tsx               # Hover info text
│
├── lib/
│   ├── ai/
│   │   ├── generate.ts              # Calls AI provider, parses + validates JSON response
│   │   ├── prompt.ts                # The full USMLE question generation prompt
│   │   ├── providers.ts             # AI provider abstraction (Anthropic/OpenAI/Google)
│   │   └── extract-source-reference.ts  # LLM + regex extraction of bibliographic metadata
│   ├── crypto/
│   │   └── encrypt.ts               # AES-256-GCM encrypt/decrypt for API keys
│   ├── metadata/
│   │   ├── enrich.ts                # Orchestrates PubMed + Crossref enrichment
│   │   ├── pubmed.ts                # PubMed E-utilities API (PMID lookup, DOI→PMID, title search)
│   │   └── crossref.ts             # Crossref REST API (DOI → bibliographic data)
│   ├── pdf/
│   │   └── extract-text.ts          # Extract text from uploaded PDF (pdf-parse)
│   ├── supabase/
│   │   ├── client.ts                # Browser-side Supabase client
│   │   ├── server.ts                # Server-side Supabase client (cookie-based auth)
│   │   └── service.ts               # Service-role client (bypasses RLS)
│   ├── progress.ts                  # localStorage helpers for learner progress
│   └── visitor.ts                   # Generate anonymous visitor ID for voting
│
├── types/
│   ├── quiz.ts                      # All TypeScript interfaces (Quiz, Question, etc.)
│   └── supabase.ts                  # Auto-generated Supabase DB types
│
└── middleware.ts                     # Protects /dashboard and /quizzes routes

supabase/
└── migrations/                       # SQL migration files (run in order)
    ├── 00001_create_tables.sql       # Core tables: educators, quizzes, questions
    ├── 00002_educator_trigger.sql    # Auto-create educator on signup
    ├── 00003_add_classification_dimensions.sql  # organ_systems, physician_tasks, disciplines
    ├── 00004_add_source_reference.sql           # Bibliographic citation field
    ├── 00005_add_feedback_and_doi.sql           # Comments, votes, DOI
    ├── 00006_add_ai_provider.sql                # Multi-provider support
    ├── 00007_add_site_feedback.sql              # Site feedback table
    ├── 00008_add_educator_role.sql              # Admin role for educators
    ├── 00009_add_source_metadata.sql            # Structured metadata JSONB + suggested_filename
    └── 00010_add_pmid_pmcid_columns.sql         # Dedicated PMID/PMCID columns

.github/
└── workflows/
    └── auto-merge-to-main.yml        # Auto-merges claude/* branches into main

public/                               # Static assets
├── apple-touch-icon.png              # 180x180 iOS icon
├── favicon-32x32.png                 # 32x32 browser favicon
└── favicon-192x192.png               # 192x192 Android/PWA icon
```

## Data Flow

### Quiz Creation Flow (Educator)

```
Educator signs in
    │
    ▼
Dashboard (/dashboard)
    │ clicks "New Quiz"
    ▼
New Quiz Page (/quizzes/new)
    │
    ├─ 1. Enter quiz title
    ├─ 2. Upload PDF ──────────► POST /api/quizzes/[id]/upload
    │      │                         │
    │      │                         ├─ Extract text (pdf-parse, max 100k chars)
    │      │                         ├─ Extract structured metadata (AI + regex)
    │      │                         │    └─ DOI, PMID, PMCID, authors, title, journal...
    │      │                         ├─ Enrich via PubMed/Crossref APIs
    │      │                         │    ├─ NCBI ID Converter (DOI → PMID + PMCID)
    │      │                         │    ├─ Crossref (DOI → bibliographic data)
    │      │                         │    ├─ PubMed ESearch (title search fallback)
    │      │                         │    └─ PubMed ESummary/EFetch (MeSH, keywords)
    │      │                         ├─ Upload PDF to Supabase Storage
    │      │                         └─ Return text preview + metadata + identifiers
    │      │
    ├─ 3. Choose question count (3–30)
    └─ 4. Click "Generate" ───► POST /api/quizzes/[id]/generate
           │                         │
           │                         ├─ Decrypt educator's API key
           │                         ├─ Build prompt (source text + rules)
           │                         ├─ Call AI provider (Claude/GPT/Gemini)
           │                         ├─ Parse JSON response
           │                         ├─ Validate with Zod schema
           │                         ├─ Bulk insert questions into DB
           │                         └─ Set quiz status = 'review'
           │
           ▼
Review Page (/quizzes/[id]/review)
    │
    ├─ Left sidebar: question list (QuestionCard)
    ├─ Right panel: question editor (QuestionEditor)
    │     └─ Edit: vignette, options, correct answer, explanation,
    │        pearls, organ system, physician task, discipline, COR/LOE
    │
    └─ Click "Publish" ──────► POST /api/quizzes/[id]/publish
           │                         │
           │                         └─ Generate UUID share_token
           ▼                              Return link: /q/{token}
    Share link with learners
```

### Quiz Taking Flow (Learner)

```
Learner opens /q/{token}
    │
    ▼
GET /api/public/quizzes/{token}
    │
    └─ Returns quiz + questions (WITHOUT answers/explanations)
    │
    ▼
QuizWelcome screen
    │ (checks localStorage for previous progress → offers resume)
    │
    ▼
QuizQuestion (one at a time)
    │
    ├─ Learner selects option (A–E)
    │
    ├─ POST /api/public/quizzes/{token}/reveal
    │      body: { question_id, selected_answer }
    │      returns: { correct_answer, is_correct, explanation,
    │                 nuggets, cor_loe, section, source_reference,
    │                 doi, pmid, pmcid }
    │
    ├─ Show correct/incorrect feedback + explanation + pearls
    │
    ├─ Optional: vote (thumbs up/down) → POST /api/public/questions/{id}/votes
    ├─ Optional: comment → POST /api/public/questions/{id}/comments
    │
    ├─ Save attempt to localStorage
    │
    └─ Next question → repeat
           │
           ▼
QuizResults
    │
    ├─ Show score (correct / total)
    ├─ List each question with result
    └─ Offer "Retry incorrect" → RetrySection
```

## Component Hierarchy

```
RootLayout
├── LandingPage                    (/)
├── LoginPage                      (/login)
├── SignupPage                     (/signup)
├── ForgotPasswordPage             (/forgot-password)
├── ResetPasswordPage              (/reset-password)
├── EmailConfirmedPage             (/auth/confirmed)
├── AdminPage                      (/admin)
│   ├── AdminHeader (Logo, breadcrumbs, SignOutButton)
│   └── CategoryBadges
├── AdminEducatorPage              (/admin/educators/[id])
│   ├── AdminHeader
│   └── CategoryBadges
├── AdminQuizPage                  (/admin/educators/[id]/quizzes/[quizId])
│   └── AdminHeader
├── DashboardPage                  (/dashboard)
│   └── Logo, Card, Button, SignOutButton, FeedbackWidget
├── SettingsPage                   (/dashboard/settings)
│   └── Input, Button
├── NewQuizPage                    (/quizzes/new)
│   └── Logo, Card, Input, Button
├── ReviewPage                     (/quizzes/[id]/review)
│   ├── QuestionCard (list, sidebar)
│   └── QuestionEditor (main panel)
│       ├── Input, Button, MultiSelect, Tooltip
│       └── (inline editing for vignette, options, explanation, pearls)
└── LearnerQuizPage                (/q/[token])
    ├── QuizWelcome
    ├── QuizQuestion
    │   └── (vote buttons, comment section, explanation display)
    ├── QuizResults
    └── RetrySection
```

## Authentication & Authorization

### How Auth Works

1. **Supabase Auth** manages user accounts. Sessions are stored as HTTP-only cookies.
2. **Middleware** (`src/middleware.ts`) intercepts requests to `/dashboard/*`, `/quizzes/*`, and `/admin/*`. If no valid session exists, the user is redirected to `/login`. For `/admin/*` routes, it additionally checks that the educator has `role = 'admin'` in the database (using the service client to bypass RLS), redirecting non-admins to `/dashboard`.
3. **Row-Level Security (RLS)** on the database ensures educators can only access their own quizzes and questions — even if the API is called directly.
4. **Public quiz endpoints** (`/api/public/*`) use the Supabase **service role** client, bypassing RLS, because learners are anonymous and have no auth session.

### Auth Flow

```
Signup → Supabase creates auth.users row
                │
                └─ DB trigger (handle_new_user) auto-creates educators row
                │
                ▼
       Email confirmation (optional)
                │
                ▼
Login → Session cookie set → Access protected routes
```

## Styling System

- **Tailwind CSS** with a custom color palette defined in `tailwind.config.ts`
- **Font**: Inter (Google Fonts), loaded in the root layout
- **No CSS-in-JS** or CSS modules — purely utility classes

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-dark` | #1F4E79 | Headers, primary buttons |
| `brand-mid` | #2E75B6 | Links, active states |
| `brand-light` | #DEEAF1 | Page backgrounds, cards |
| `brand-border` | #BDD7EE | Borders, dividers |
| `correct-dark` | #375623 | Correct answer text |
| `correct-fill` | #E2EFDA | Correct answer background |
| `wrong-dark` | #C62828 | Wrong answer text |
| `wrong-fill` | #FFEBEE | Wrong answer background |

## State Management

This app does **not** use Redux, Zustand, or any global state library. State is managed through:

| What | Where | How |
|------|-------|-----|
| Component UI state | React `useState` | Local to each component |
| Auth session | Supabase cookies | HTTP-only, managed by middleware |
| Educator data | Supabase PostgreSQL | Fetched per-request via API routes |
| Learner progress | Browser `localStorage` | Saved/loaded by `src/lib/progress.ts` |
| Visitor identity | Browser `localStorage` | UUID generated once by `src/lib/visitor.ts` |

## Security Considerations

1. **API keys** are encrypted with AES-256-GCM before database storage (`src/lib/crypto/encrypt.ts`). The encryption key is an environment variable (`ENCRYPTION_KEY`), never committed to source.
2. **Answers are never sent to learners** in the initial quiz fetch. They are only revealed one at a time via the `/reveal` endpoint after the learner submits an answer.
3. **RLS policies** prevent cross-educator data access at the database level.
4. **Service role key** is only used server-side and never exposed to the browser.
5. **CSRF protection** is handled by Supabase's cookie-based auth and Next.js's built-in protections.
