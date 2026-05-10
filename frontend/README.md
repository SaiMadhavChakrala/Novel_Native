# WebNovelHub Frontend

Next.js app for Novel Native.

## Getting Started

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Create a local `.env.local` from `.env.example` before running pages that need Supabase, Google sign-in, or Gemini.

## Vercel Deployment

Import the Git repository in Vercel and set the project Root Directory to `frontend`.

Use these project settings:

- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build:deployment`
- Output Directory: leave empty / Vercel default

Add these Environment Variables in Vercel for Production, Preview, and Development as needed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `EVAL_NOVEL_TITLE`
- `EVAL_CHAPTER_TITLE`
- `EVAL_QUESTION`
- `EVAL_EXPECTED_CONCEPT`
- `EVAL_ALLOW_GEMINI_FAILURES` set to `true` only when the deployment should continue if Gemini credentials, quota, rate limits, or service availability prevent the eval from running
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET`

Auth.js can infer the deployment URL on Vercel. Only set `AUTH_URL` if you have a custom auth base path or a specific proxy setup.

In Google Cloud Console, add the matching OAuth redirect URI:

```text
https://your-project.vercel.app/api/auth/callback/google
```

For local development, also add:

```text
http://localhost:3000/api/auth/callback/google
```

Before deploying, verify locally with:

```bash
npm run lint
npm run build:deployment
```

The deployment eval runs the RAG retrieval and answer-generation path against one configured golden question. It resolves `EVAL_NOVEL_TITLE` to the internal novel ID at runtime, and `EVAL_CHAPTER_TITLE` can be set to verify the expected fixture chapter exists before testing. For multiple golden questions, set `EVAL_CASES_JSON` to a JSON array of `{ "novelTitle": "...", "chapterTitle": "...", "question": "...", "expectedConcept": "..." }` objects. `novelId` is still supported as a fallback when titles are not unique.

`npm run build:deployment` sets `EVAL_ALLOW_GEMINI_FAILURES=true` so Vercel does not fail a build just because Gemini credentials expired, quota ran out, rate limits fired, or Gemini is temporarily unavailable. Retrieval fixture failures and incorrect answers still fail the deployment check when Gemini is usable.
