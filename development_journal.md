# Development Journal — Resumee

Reverse-chronological. Every change appends an entry: what, files, why, next.

---

## 2026-09-05 — Resume PDF: one-page + no empty gaps

**What** — (1) A big blank appeared at the bottom of page 1 because each Experience
block used `wrap={false}`, so a block that didn't fit was pushed whole to page 2.
(2) Resumes ran to ~2 pages with wasted space.

**Files**
- `src/lib/pdf/documents.tsx`: denser layout (padding 40/48→30/40, font 10→9.4,
  lineHeight 1.4→1.3, tighter section spacing); Experience blocks now break across
  pages but keep the header together via a `wrap={false}` + `minPresenceAhead={36}`
  sub-view (no orphaned headers, no gaps); Projects compacted to name+description on
  one flow with a single Tech line, URL dropped (links already in contacts).
- `src/lib/prompts/tasks.ts`: resumePrompt now instructs a strict one-page fit —
  cap top role 4-5 bullets, older roles 1-2, 3-4 projects one line each, drop
  irrelevant skills, dense wording.

**Verified** — re-rendered existing generation (free, no model): gap gone, page 1
full. Regenerated for the real Block Labs "AI Engineer" job: bullets 5/1/1, 3 compact
projects → **single A4 page**, clean, complete (QuickLook render confirmed).

**Note** — layout gap-fix is content-independent; one-page fit depends on content
volume but the prompt now pushes hard for it and the wrap fix prevents ugly gaps
either way.

---

## 2026-09-05 — Fix: JSON truncation on job analysis / generation

**What** — Job Analyzer returned "Model did not return valid JSON" with an active
OpenRouter + `anthropic/claude-sonnet-5` provider. Root cause: `max_tokens` was too
low for the verbose analysis/resume JSON, so long outputs were truncated mid-object
and failed to parse (a plain smoke call returned clean JSON, ruling out auth/format).

**Files** — `src/server/ai.ts`: raised limits — job analysis 3000→8000, resume
4096→8000, cover letter 2000→4000, intelligence 3000→4000.

**Verified** — reproduced with the stored key (clean JSON on a short call); end-to-end
on a long Applied-AI-Engineer JD: analysis 200 (match 64, all arrays populated),
resume 200 (headline tailored, `includePhoto:false` per US country rules), PDF renders
(2 pages, valid). Test job deleted afterward.

---

## 2026-09-05 — Milestone 1: Foundation + full MVP vertical slice

**What was done**
- Bootstrapped Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 + Prisma 6 (SQLite).
- Designed and pushed the full data model (Profile aggregate + Language/Skill/Experience/Education/Certification/Project, IntelligenceProfile, ProviderSetting, Job, Generation).
- Built the provider abstraction layer supporting OpenAI-compatible (OpenRouter, TokenRouter, Moonshot) and native Anthropic wire protocols: `listModels` + `chat` + tolerant JSON parsing.
- Implemented the hidden Master Prompt System (ATS, resume craft, recruiter expectations, cover-letter rules, country conventions) and per-task prompt builders (intelligence, job analysis, resume, cover letter).
- Implemented the server AI orchestration: `ensureIntelligence` (cached via profile source-hash), `analyzeJob`, `generate` (versioned).
- Built the ATS-friendly PDF engine with `@react-pdf/renderer` (single linear column, real selectable text, A4/Letter).
- Built all API routes: profile GET/PUT (transactional nested save), photo upload (size/type/ratio validation via `image-size`), settings + model listing, intelligence, analyze, jobs, generate, pdf.
- Built the UI shell (sidebar) and pages: Dashboard, Candidate Profile (full form + photo + intelligence panel), Settings (per-provider key/model/active), Job Analyzer + job detail (match score, requirements, generation studio), History.
- Verified: `next build` passes; dev server renders Dashboard/Settings/Profile; all core endpoints return 200.

**Files changed (high level)**
- `prisma/schema.prisma`, `.env`, config files (`tsconfig`, `next.config.ts`, `postcss`, `package.json`).
- `src/lib/*` (db, constants, utils, types, ai/client, prompts/master, prompts/tasks, pdf/documents).
- `src/server/*` (profile, ai).
- `src/app/api/**` (all routes).
- `src/app/**` pages + `src/components/**` (sidebar, ui primitives, button, repeatable, photo-uploader, intelligence-panel, generation-studio).

**Why key decisions**
- **Prisma pinned to 6.x**: `@latest` resolved to 8.0.0-rc (new Platform CLI without `db push`); pinned stable 6 for a reliable MVP. Migration to Postgres = swap datasource provider + `db push`.
- **ownerId on every row (default "owner")**: single-owner MVP today, but the exact shape needed for multi-tenant SaaS — no schema reshape later, just wire `ownerId` to the authenticated user.
- **Intelligence cached by source-hash**: avoids re-analyzing the candidate on every generation (spec requirement).
- **String[] stored as JSON strings in SQLite**: Postgres can later switch these to native arrays; `parseArray` isolates the concern.
- **@react-pdf/renderer over headless-Chrome**: produces machine-readable text PDFs (ATS-critical) with no native/browser dependency.
- Fixed a first-load race in `getOrCreateProfile` (concurrent create → P2002) by catching the unique violation.

**Next steps** — see `handoff.md` "Open tasks".
