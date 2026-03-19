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
Body: FormData with 'file' field (PDF, max ~100k chars of text)
Response: {
  text_preview: string,    // first 500 chars
  word_count: number,
  source_reference: string | null,  // auto-extracted citation
  doi: string | null                // auto-extracted DOI
}
```

Extracts text from the uploaded PDF using `pdf-parse`. Optionally uses a lightweight AI call (Claude Haiku / GPT-4o-mini / Gemini Flash Lite) to extract a bibliographic citation and DOI from the first page. Uploads the PDF file to Supabase Storage.

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
Body: { source_reference?: string, doi?: string }
Response: { success: true }
```

Updates the quiz's bibliographic citation and/or DOI.

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

### Logout

```
POST /api/auth/logout
Response: redirects to /login
```

Signs the user out and clears the session cookie.

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
  doi: string
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
