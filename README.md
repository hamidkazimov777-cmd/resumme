<div align="center">

# Resumee

**AI engine for ATS-optimized resumes & cover letters, tailored to a specific job.**

Fill your professional profile once. Paste a vacancy. Get a market-, language- and
seniority-aware resume + cover letter, exported to clean PDF.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)
![SQLite](https://img.shields.io/badge/SQLite-local-003b57)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## How it works

1. **Profile once** — fill your Candidate Profile; an AI pass builds a reusable *Candidate Intelligence Profile*.
2. **Analyze a job** — paste the vacancy → market, language, seniority, ATS keywords and a **0–100 match score** with strong / weak / gaps.
3. **Generate** — a resume and cover letter **tailored to that job**, one page, ATS-parseable.
4. **Export** — clean PDF (A4 / US Letter). Everything is versioned in **History**.

> Facts only: the engine rewrites and re-prioritizes *your real profile* for each job — it never invents experience. Missing requirements land honestly in **Gaps**.

## Features

- Provider-agnostic AI — **OpenRouter, TokenRouter, Anthropic, Moonshot** (bring your own key; models auto-loaded).
- Hidden **master prompt system** — ATS rules, resume/cover-letter craft, recruiter expectations, per-country conventions.
- **ATS-friendly PDF** — real text, single linear column, no tables/graphics.
- One-page-first layout, photo validation, operation history.

## Quick start

Requires **Node 18+**.

```bash
git clone https://github.com/hamidkazimov777-cmd/resumme.git
cd resumme
npm install
cp .env.example .env
npm run db:push        # creates the local SQLite database
npm run dev            # http://localhost:3000
```

Then in the app:

1. **Settings** → paste a provider API key → **Load models** → pick one → **Set active**.
2. **Candidate Profile** → fill in → **Save** → run **Intelligence**.
3. **Job Analyzer** → paste a vacancy → **Generate** → open / download the PDF.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 6 + SQLite · `@react-pdf/renderer`.

## Project layout

```
src/lib/ai/        provider abstraction (OpenAI-compatible + Anthropic)
src/lib/prompts/   hidden master prompt system + task builders
src/lib/pdf/        ATS-friendly PDF documents
src/server/        profile + AI orchestration
src/app/api/        route handlers
src/app/           pages   ·   src/components/   UI
```

## Notes

- **MVP:** runs locally, single user, no auth/payments. Architected to migrate to PostgreSQL + multi-tenant SaaS (`ownerId` on every table).
- Your data stays local: profile, generations and API keys live in `prisma/dev.db`; the DB, uploads and `.env` are git-ignored.

## License

MIT
