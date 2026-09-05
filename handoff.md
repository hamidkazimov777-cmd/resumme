# Handoff — Resumee

## Current state
Working local MVP. End-to-end vertical slice is functional:
Profile → Intelligence analysis → Job analysis + match score → Resume & Cover Letter generation → PDF export → History.

Run:
```bash
npm install
npm run db:push      # creates prisma/dev.db
npm run dev          # http://localhost:3000
```
Then: **Settings** → add a provider API key → **Load models** → pick a model → **Set active**. Fill **Candidate Profile** → Save → **Analyze** (Intelligence). Then **Job Analyzer** → paste vacancy → generate documents.

## Completed
- [x] Data model (SQLite/Prisma), designed SaaS-ready (`ownerId` everywhere).
- [x] Provider abstraction: OpenRouter, TokenRouter, Anthropic, Moonshot (key → model list → active).
- [x] Master prompt system (hidden) + task prompt builders.
- [x] Candidate Intelligence Profile (computed once, cached by source-hash).
- [x] Job analyzer: market, language, seniority, ATS requirements, keywords, 0–100 match with strong/weak/gaps.
- [x] Resume + Cover Letter generation (versioned), tailored via profile + analysis + master prompts.
- [x] ATS-friendly PDF export (A4 / Letter), real text, single column.
- [x] Photo upload with type/size/aspect-ratio validation.
- [x] Dashboard, Profile, Settings, Analyzer, Job detail, History pages.
- [x] `next build` green.

## Open tasks
- [ ] Photo embedding into the resume PDF for markets that expect it (currently `includePhoto` is computed but the image is not yet drawn into the PDF).
- [ ] Job detail: render the raw generated document as an on-page preview (currently PDF-only via `/api/pdf/[id]`).
- [ ] Delete/manage generations & jobs from the UI (API `DELETE /api/jobs/[id]` exists; no UI button yet).
- [ ] Loading/skeleton states + toasts (using inline badges for now).
- [ ] Streaming generation feedback (long AI calls block until complete).
- [ ] Tests (unit for prompts/serialization, integration for routes).

## Architectural decisions
- **Single-owner MVP**: `OWNER_ID = "owner"` constant. SaaS: replace with session user id; add `User` table + relations. No table reshape required.
- **Provider layer** is the only place that knows wire protocols (`src/lib/ai/client.ts`). Adding a provider = extend `PROVIDERS` in `src/lib/constants.ts`.
- **Master prompts** are server-only (`src/lib/prompts/`), never exposed to the client or editable by the user.
- **PDF** via `@react-pdf/renderer` for ATS parseability (no headless browser).
- **Arrays** stored as JSON strings in SQLite; `parseArray`/serialization isolate this for a clean Postgres array migration.

## Technical debt / risks
- API keys stored in plaintext in SQLite (acceptable for local single-owner MVP; **must** be encrypted / moved to a secret store before SaaS).
- URL job-fetch is best-effort HTML strip; many boards block bots — pasting text is the reliable path.
- No auth/rate-limiting/multi-tenant isolation yet (by design for MVP).
- Prisma pinned to 6.x; upgrading to 8.x requires migrating to the new Platform CLI.
- SQLite `$transaction` used for profile save; fine locally, revisit for Postgres connection pooling under load.

## Migration to SaaS (PostgreSQL) checklist
1. `datasource db { provider = "postgresql" }`, set `DATABASE_URL`.
2. Add `User` model; convert `ownerId` fields to FKs; add auth (session → ownerId).
3. Optionally convert JSON-string array columns to native `String[]`.
4. Encrypt `ProviderSetting.apiKey` at rest.
5. Move uploads from `/public/uploads` to object storage (S3/R2).
