# Development Journal — Resumee

Reverse-chronological. Every change appends an entry: what, files, why, next.

---

## 2026-09-05 — P0: auth + multi-tenant, encrypted keys, rate limiting

**What** — Turned the single-owner MVP into a real multi-user service (still local,
Postgres-ready).

- **Auth** (built-in, no heavy deps): `User` + `Session` tables; bcrypt password
  hashing; opaque DB session token in an httpOnly cookie (30d). Routes
  `/api/auth/{register,login,logout,me}`; `/login` + `/register` pages; `middleware.ts`
  gates every route (redirect pages → /login, APIs → 401) on cookie presence, with
  real validation in handlers. Sidebar shows the user + Sign out, hidden on auth pages.
- **Multi-tenant** — dropped the `OWNER_ID="owner"` constant; every server fn and route
  now resolves the session user and scopes all reads/writes by `ownerId = user.id`.
  First registered user adopts any legacy `ownerId="owner"` rows (profile / provider /
  jobs / generations) so existing local data carries into the account.
- **Encrypted API keys** — `src/lib/crypto.ts` AES-256-GCM ("v1:" format) via
  `APP_ENCRYPTION_KEY`; keys encrypted on save, decrypted on use; legacy plaintext
  tolerated on read and upgraded on next save. Settings only ever returns a masked hint.
- **Rate limiting** — `RateLimit` table + `enforceRateLimit` (fixed window per user+action:
  analyze 40/h, generate 60/h, intelligence 20/h) → 429 with a friendly message.

**Files** — `prisma/schema.prisma` (User/Session/RateLimit; ownerId defaults dropped),
`src/lib/auth/{password,session}.ts`, `src/server/{auth,ratelimit}.ts`, `src/lib/crypto.ts`,
`src/middleware.ts`, `src/app/api/auth/**`, `src/app/{login,register}/page.tsx`,
`src/components/{auth-form,sidebar}.tsx`, and userId threading through
`src/server/{profile,ai}.ts` + every API route + server page. `.env`/`.env.example`
gained `APP_ENCRYPTION_KEY` + `AUTH_SECRET`.

**Decisions** (user-picked) — SQLite locally + Postgres-ready (flip datasource + URL at
deploy); built-in email+password auth (portable, no framework).

**Verified** — `next build` green (19 routes). Live: unauth `/` → 307 /login, `/login`
200, `/api/profile` 401; register → cookie, and legacy data migrated to the account
(47 skills, 4 projects), provider key decrypted + masked correctly. Test account then
removed and data reassigned back to `owner` so first real registration inherits it.

**Note** — DB session validation can't run in edge middleware (Prisma), so middleware
checks cookie presence only; handlers/server components do the real check.

---

## 2026-09-05 — Design skill: auto-selected resume templates

**What** — Added a design engine with 3 visual templates and automatic selection.
Switching a template is pure layout (re-renders stored content, no AI call).

**Templates** — `ats` (B/W, safest for US/UK ATS), `modern` (accent color, header bar
— product/startup/creative), `photo` (portrait top-right — DACH/Gulf/CIS).

**Auto-selection** (`selectTemplate`) — photo-expecting market + a real photo on file →
`photo`; conservative market (US/UK/CA) or exec seniority → `ats`; creative/product/
startup signals in title/industries → `modern`; else `ats`.

**Files**
- `src/lib/design/templates.ts` — theme registry + `selectTemplate` + `getTheme`.
- `src/lib/pdf/documents.tsx` — theme-driven styles (accent name/section titles, header
  bar, optional embedded photo); header flex fixed so contacts wrap beside the photo.
- `src/server/ai.ts` — `generate()` computes and stores the template per generation.
- `src/app/api/pdf/[id]/route.ts` — uses stored template or `?template=` override; loads
  the candidate photo as a data URI for the photo template.
- `prisma/schema.prisma` — `Generation.template String?` (db push).
- `src/components/generation-studio.tsx` + `analyzer/[id]/page.tsx` — per-generation
  template chips (marks the auto pick), open/download in any template instantly.

**Verified** — all three render for the real Block Labs resume: ats & modern one page,
photo one page with the portrait embedded and contacts wrapping cleanly (QuickLook).
`next build` green.

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
