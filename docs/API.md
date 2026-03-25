# API Reference

All API routes are in `src/app/api/`. They are Next.js Route Handlers (App Router).

## Authentication

Protected endpoints require a valid Supabase session cookie. The middleware redirects unauthenticated users to `/login` for page routes. API routes check the session internally and return `401 Unauthorized` if missing.

Public endpoints (under `/api/public/`) require no authentication.

---

## Educator Endpoints (Auth Required)

### Create Quiz

```
POST /api/quizzes
Body: { title: string, question_count_requested: number }
Response: { id: string }
```

Creates a new quiz in `draft` status.

### Upload PDF

```
POST /api/quizzes/[id]/upload
Body: FormData with 'file' field (PDF, max 20 MB / ~100k chars of text)
Max Duration: 60 seconds
Response: {
  pdf_storage_path: string,
  source_text_preview: string,          // first 500 chars
  word_count: number,
  page_count: number,
  source_reference: string | null,      // formatted NEJM-style citation
  source_metadata: SourceMetadata | null, // structured bibliographic metadata (JSONB)
  suggested_filename: string | null,    // AI-suggested filename (e.g. "Smith 2024 - Cardiac Outcomes.pdf")
  doi: string | null,
  pmid: string | null,
  pmcid: string | null,
  warning: string | null
}
```

Processing pipeline:
1. Extracts text from the PDF using `pdf-parse` (min 50 chars, max 100k chars).
2. Extracts structured bibliographic metadata using a lightweight AI call (Claude Haiku / GPT-4o-mini / Gemini Flash Lite) plus regex extraction for DOI, PMID, and PMCID.
3. Enriches metadata via external APIs (best-effort, non-blocking):
   - **NCBI ID Converter**: Maps DOI → PMID + PMCID in a single call.
   - **Crossref**: Fetches bibliographic data from DOI.
   - **PubMed ESearch**: Searches by DOI or article title to discover PMID.
   - **PubMed ESummary/EFetch**: Retrieves full metadata, MeSH terms, and author keywords.
4. Uploads the PDF to Supabase Storage with the AI-suggested filename.
5. Saves extracted text, identifiers (DOI, PMID, PMCID), source reference, and structured metadata to the database.

### Generate Questions

```
POST /api/quizzes/[id]/generate
Body: { question_count: number }
Response: { success: true, question_count: number }
Max Duration: 300 seconds (Vercel Pro)
```

The core AI endpoint. Steps:
1. Sets quiz status to `generating`
2. Decrypts the educator's API key
3. Builds the full prompt with the source text
4. Calls the AI provider (Claude Sonnet 4.5 / GPT-4o / Gemini 2.0 Flash)
5. Parses the JSON response and validates each question with Zod
6. Bulk inserts questions into the database
7. Sets quiz status to `review`

### Update Quiz Metadata

```
PATCH /api/quizzes/[id]
Body: {
  title?: string,
  source_reference?: string,
  source_metadata?: SourceMetadata,
  doi?: string,
  pmid?: string,
  pmcid?: string
}
Response: Quiz (full updated quiz object)
```

Updates the quiz's title, bibliographic citation, structured metadata, and/or identifiers. The `source_metadata` field accepts a partial `SourceMetadata` object (article_title, authors, journal_title, journal_abbreviation, year, volume, issue, pages, doi, pmid, pmcid, issn, keywords, document_type, suggested_filename).

### Check Generation Status

```
GET /api/quizzes/[id]/status
Response: { status: 'draft' | 'generating' | 'review' | 'published' }
```

Used by the frontend to poll during question generation.

### Publish Quiz

```
POST /api/quizzes/[id]/publish
Response: { share_token: string, share_url: string }
```

Generates a UUID share token and sets quiz status to `published`. Returns the shareable URL (`/q/{token}`).

### Edit Question

```
PUT /api/questions/[id]
Body: Partial<Question> (any editable fields)
Response: { success: true }
```

Updates a single question's fields (vignette, options, explanation, classification, etc.).

### Delete Question

```
DELETE /api/questions/[id]
Response: { success: true }
```

Permanently removes a question from a quiz.

### Get Feedback

```
GET /api/quizzes/[id]/feedback
Response: {
  questions: [{
    id: string,
    position: number,
    topic: string,
    thumbs_up: number,
    thumbs_down: number,
    comments: [{ commenter_name, comment_text, created_at }]
  }]
}
```

Returns aggregated vote counts and comments for all questions in a quiz.

### Save API Key

```
POST /api/settings/api-key
Body: { api_key: string, provider: 'anthropic' | 'openai' | 'google' }
Response: { success: true }
```

Encrypts the API key with AES-256-GCM and stores it in the `educators` table along with the selected provider.

### Submit Feedback

```
POST /api/feedback
Body: {
  page_url: string,         // URL of the page the feedback is about (max 500 chars)
  feedback_type: 'bug' | 'suggestion' | 'question' | 'other',
  message: string           // Feedback text (1–5000 chars)
}
Response: { success: true, id: string }
```

Stores site feedback from authenticated educators. The educator's ID and email are captured automatically from the session. Input is validated with Zod.

### Logout

```
POST /api/auth/logout
Response: 303 redirect to /login
```

Signs the user out and clears the session cookie. Returns a 303 (See Other) redirect to ensure the browser follows with a GET request.

**Note**: The recommended approach is the client-side `SignOutButton` component, which calls `supabase.auth.signOut()` directly and navigates with `router.push('/login')`. This avoids HTTP redirect method issues.

---

## Public Endpoints (No Auth)

### Fetch Published Quiz

```
GET /api/public/quizzes/[token]
Response: {
  id: string,
  title: string,
  source_reference: string | null,
  doi: string | null,
  pmid: string | null,
  pmcid: string | null,
  questions: PublicQuestion[]  // NO answers or explanations
}
```

Returns the quiz and its questions **without** correct answers, explanations, or pearls. This prevents learners from seeing answers before attempting.

`PublicQuestion` includes: `id`, `position`, `topic`, `vignette`, `question_text`, `options`.

### Reveal Answer

```
POST /api/public/quizzes/[token]/reveal
Body: { question_id: string, selected_answer: string }
Response: {
  correct_answer: string,
  is_correct: boolean,
  explanation: string,
  nuggets: string[],
  cor_loe: string,
  section: string,
  source_reference: string,
  doi: string,
  pmid: string,
  pmcid: string
}
```

After the learner submits their answer, this reveals the correct answer plus all supplementary information. The `is_correct` flag tells the frontend whether to show green (correct) or red (incorrect) feedback.

### Vote on Question

```
GET /api/public/questions/[id]/votes
Response: { thumbs_up: number, thumbs_down: number }

POST /api/public/questions/[id]/votes
Body: { visitor_id: string, vote: 1 | -1 }
Response: { success: true }
```

Each browser generates a unique `visitor_id` (stored in localStorage) to prevent duplicate votes. A `UNIQUE(question_id, visitor_id)` constraint in the database enforces one vote per visitor per question.

### Comment on Question

```
GET /api/public/questions/[id]/comments
Response: QuestionComment[]

POST /api/public/questions/[id]/comments
Body: { commenter_name?: string, comment_text: string }
Response: { id: string }
```

Comments are free-text feedback from learners. The `commenter_name` is optional (anonymous by default).

---

## Auth Callback

```
GET /api/auth/callback?code=...
```

Handles the redirect after a user clicks the email confirmation link. Exchanges the code for a session and redirects to `/auth/confirmed`.

---

## Error Handling

All endpoints return standard HTTP status codes:
- `200` — Success
- `400` — Bad request (missing/invalid fields)
- `401` — Unauthorized (no valid session)
- `404` — Resource not found
- `500` — Server error

Error response body: `{ error: string }`
