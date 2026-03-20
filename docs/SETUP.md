# Development Setup Guide

## Prerequisites

- **Node.js** 18.17 or later
- **npm** (comes with Node.js)
- A **Supabase** project (free tier works)
- An **AI provider API key** (Anthropic, OpenAI, or Google)

## 1. Clone the Repository

```bash
git clone <repository-url>
cd USMLE
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Set Up Supabase

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **API keys** from Settings → API.

### Run Database Migrations

Run the SQL migrations in order against your Supabase database. Go to the **SQL Editor** in the Supabase dashboard and execute each file in `supabase/migrations/`:

```
00001_create_tables.sql        — Core tables (educators, quizzes, questions)
00002_educator_trigger.sql     — Auto-create educator profile on signup
00003_add_classification_dimensions.sql — Organ systems, physician tasks, disciplines
00004_add_source_reference.sql — Bibliographic citation field
00005_add_feedback_and_doi.sql — Comments, votes, DOI
00006_add_ai_provider.sql      — Multi-provider AI support
00007_add_site_feedback.sql    — Site feedback table for educator feedback widget
00008_add_educator_role.sql    — Admin role column on educators
```

Run them **in numerical order** — each migration builds on the previous one.

### Create a Storage Bucket

1. In the Supabase dashboard, go to **Storage**.
2. Create a new bucket called `pdfs`.
3. Set it to **private** (only authenticated users can upload).

### Configure Auth

1. In the Supabase dashboard, go to **Authentication → Settings**.
2. Under **Site URL**, set it to your deployment URL (e.g., `https://your-app.vercel.app`).
3. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/api/auth/callback`
   - `https://your-app.vercel.app/reset-password`
   - `http://localhost:3000/api/auth/callback` (for local dev)
   - `http://localhost:3000/reset-password` (for local dev)

## 4. Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Encryption (generate a random 32-character string)
ENCRYPTION_KEY=your-32-character-random-string

# App URL (used for share links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### How to Generate an Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

This produces a 32-character hex string suitable for the `ENCRYPTION_KEY`.

### Environment Variable Reference

| Variable | Required | Where Used | Description |
|----------|----------|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase service role key (bypasses RLS) |
| `ENCRYPTION_KEY` | Yes | Server only | 32-char key for encrypting API keys at rest |
| `NEXT_PUBLIC_APP_URL` | Yes | Server only | Base URL for shareable quiz links |

**Important**: `NEXT_PUBLIC_` prefixed variables are exposed to the browser. Only the Supabase URL and anon key should have this prefix. The service role key and encryption key must **never** be prefixed with `NEXT_PUBLIC_`.

## 5. Run the Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## 6. Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server with hot reload |
| `build` | `npm run build` | Create production build |
| `start` | `npm run start` | Start production server |
| `lint` | `npm run lint` | Run ESLint |
| `typecheck` | `npm run typecheck` | Run TypeScript type checking |
| `test` | `npm run test` | Run unit tests (Vitest) |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:coverage` | `npm run test:coverage` | Run tests with coverage report |
| `test:e2e` | `npm run test:e2e` | Run end-to-end tests (Playwright) |

## 7. First-Time Usage

1. Start the dev server (`npm run dev`).
2. Go to `http://localhost:3000` and click **Get Started**.
3. **Sign up** with an email and password. The database trigger will auto-create your educator profile.
4. Go to **Settings** (from the dashboard) and enter your AI provider API key (e.g., your Anthropic API key).
5. Click **New Quiz**, enter a title, and upload a PDF.
6. Choose the number of questions and click **Generate**.
7. Review the generated questions, make edits if needed, and click **Publish**.
8. Share the generated link with learners.

## Project Configuration Files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js config — marks `pdf-parse` as external server package |
| `tailwind.config.ts` | Custom brand colors, content paths |
| `tsconfig.json` | TypeScript strict mode, `@/*` path alias |
| `postcss.config.js` | PostCSS plugins (Tailwind + Autoprefixer) |
| `vitest.config.ts` | Test runner config (jsdom environment, path aliases) |
| `.eslintrc.json` | ESLint with Next.js core-web-vitals rules |

## Common Issues

### "pdf-parse" Errors

If you see errors related to `pdf-parse` during build, make sure `next.config.js` includes:

```js
experimental: {
  serverComponentsExternalPackages: ['pdf-parse'],
}
```

This tells Next.js to load `pdf-parse` as a native Node.js module rather than trying to bundle it.

### Signup Creates No Educator Profile

The database trigger in migration `00002` must be applied. Without it, the `educators` table row is never created, and the user cannot create quizzes.

### Share Links Show "localhost"

Set `NEXT_PUBLIC_APP_URL` to your actual deployment URL (e.g., `https://your-app.vercel.app`), not `http://localhost:3000`.
