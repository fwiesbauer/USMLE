# Deployment Guide

QuizForge is designed to deploy on **Vercel** (Next.js hosting) with **Supabase** (database + auth + storage).

## Architecture Overview

```
┌─────────────┐         ┌──────────────────┐
│   Vercel    │         │    Supabase      │
│             │         │                  │
│  Next.js    │────────▶│  PostgreSQL DB   │
│  App Router │         │  Auth            │
│  API Routes │         │  Storage (PDFs)  │
│             │         │                  │
└─────────────┘         └──────────────────┘
       │
       │ API calls
       ▼
┌─────────────────┐
│  AI Provider    │
│  (Claude /      │
│   GPT / Gemini) │
└─────────────────┘
```

## Step 1: Set Up Supabase

If you haven't already:

1. Create a project at [supabase.com](https://supabase.com).
2. Run all migrations from `supabase/migrations/` in the SQL Editor (in order).
3. Create a `pdfs` storage bucket (private).
4. Configure auth redirect URLs (see [SETUP.md](./SETUP.md#configure-auth)).

## Step 2: Deploy to Vercel

### Option A: Deploy from GitHub

1. Push your code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and click **Import Project**.
3. Select your GitHub repository.
4. Vercel auto-detects Next.js — no build settings changes needed.
5. Add environment variables (see below).
6. Click **Deploy**.

### Option B: Deploy from CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Add environment variables via the Vercel dashboard or CLI.

## Step 3: Environment Variables

Set these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | From Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | From Supabase Settings → API (keep secret!) |
| `ENCRYPTION_KEY` | 32-char random string | For encrypting stored API keys |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |

Generate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Step 4: Configure Supabase Auth URLs

After deployment, update Supabase auth settings:

1. Go to Supabase Dashboard → **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL: `https://your-app.vercel.app`
3. Add **Redirect URLs**:
   - `https://your-app.vercel.app/api/auth/callback`
   - `https://your-app.vercel.app/reset-password`

## Step 5: Verify

1. Visit your Vercel URL.
2. Sign up for an account.
3. Check the Supabase dashboard → **Table Editor → educators** to confirm the trigger created your profile.
4. Go to Settings and add your AI API key.
5. Create a quiz, upload a PDF, generate questions, and publish.
6. Open the share link in an incognito window to test the learner experience.

## Important Vercel Settings

### Function Timeout

Two endpoints have extended timeouts configured:

| Endpoint | `maxDuration` | Purpose |
|----------|---------------|---------|
| `/api/quizzes/[id]/generate` | 300s | AI question generation (30–120+ seconds) |
| `/api/quizzes/[id]/upload` | 60s | PDF processing + PubMed/Crossref enrichment |

- **Vercel Hobby plan**: Max 60 seconds. May time out for large question counts during generation.
- **Vercel Pro plan**: Max 300 seconds. Recommended for production.

If generation times out, reduce the question count (3–10 questions work well on Hobby).

### Serverless Function Size

The `pdf-parse` library is marked as an external package in `next.config.js` to avoid bundling issues:

```js
experimental: {
  serverComponentsExternalPackages: ['pdf-parse'],
}
```

## Custom Domain

1. In Vercel, go to **Settings → Domains**.
2. Add your custom domain.
3. Update `NEXT_PUBLIC_APP_URL` to match.
4. Update Supabase auth redirect URLs to include the custom domain.

## Monitoring & Logs

- **Vercel**: Dashboard → Functions tab shows API route logs and errors.
- **Supabase**: Dashboard → Logs shows database queries and auth events.

## Continuous Deployment (Auto-Merge)

A GitHub Actions workflow (`.github/workflows/auto-merge-to-main.yml`) automatically merges any push to a `claude/**` branch into `main`. This means:

1. Code pushed to the development branch is automatically merged to `main`.
2. Vercel detects the push to `main` and auto-deploys.
3. No manual pull request creation or merging is needed.

The workflow runs with `contents: write` permissions and uses the `github-actions[bot]` identity for merge commits.

## Updating the App

Push to your connected GitHub branch. Vercel auto-deploys on push (either directly from `main`, or via the auto-merge workflow from `claude/**` branches).

For database schema changes, create a new migration file in `supabase/migrations/` and run it in the Supabase SQL Editor. Migration files should be numbered sequentially (e.g., `00011_your_change.sql`).
