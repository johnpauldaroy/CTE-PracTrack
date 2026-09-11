# Development Log

Append-only. One entry per work session, most recent first.

---

## 2026-09-11 — Project scaffold + foundation layer

**Context:** First build session. PRD.md, CLAUDE.md, MASTER_PROMPT.md, and the two project skills (`practrack-backend-builder`, `practrack-frontend-builder`) were already present. User asked to start building from the uploaded requirements and UI flow guide (`CTE-PPT-FLOW.pdf`).

**Did:**
- Rendered all 44 pages of `CTE-PPT-FLOW.pdf` to PNG (via Ghostscript, since poppler wasn't installed) and had a subagent read every page to produce `UI_FLOW_SPEC.md` — a full written transcription of every screen (layout, fields, copy, navigation, palette) plus 10 explicitly flagged PPT-vs-PRD discrepancies. This replaces the need to re-read the PDF for any future frontend work.
- Discovered the local C: drive was completely full (0 bytes free), blocking npm/file writes. User chose "clean safe caches only"; `npm cache clean --force` recovered ~13GB, enough to proceed.
- Scaffolded Next.js (16.3.4, App Router, TypeScript, Tailwind v4, `src/` dir, `@/*` alias) via `create-next-app` into a temp subfolder (it refuses non-empty dirs) then merged into the project root, discarding its stub `CLAUDE.md` in favor of the project's real one.
- Initialized shadcn/ui (style `base-nova`, neutral base color — navy+amber theme still to be applied to `globals.css`).
- Installed Prisma. `npm install prisma` / `@prisma/client` with no version pin resolved `latest` to `8.0.0-rc.13`, an unstable prerelease with a broken transitive dependency (`@effect/vitest` requiring a nonexistent `effect` version) — install failed outright. Pinned both packages to `6.19.3` (latest true stable) instead. Also ran `npm audit fix`, which mismatched CLI/client versions (6.19.3 vs was pointing older); re-pinned both explicitly to `6.19.3` to keep them matched. Remaining `npm audit` flag (`deepmerge-ts` stack exhaustion via `@prisma/config`) is a dev-time-only transitive dependency of the Prisma CLI, not reachable in the deployed app — left as-is rather than downgrading Prisma further.
- Wrote the full Prisma schema (`prisma/schema.prisma`) covering every entity in PRD §8, plus `SchoolSupervisorHistory` (not in §8's list but required by §6.2's "reassignment is logged" rule). Used `directUrl` in the datasource for Supabase's pooled-connection + migration split. Validated clean.
- User chose Supabase as the Postgres provider; connection details to follow later. Wrote `.env.example` (documents the full secret shape: `DATABASE_URL`, `DIRECT_URL`, Supabase URL/anon/service-role keys, `AUTH_SECRET`, VAPID keys) and a local `.env` with `AUTH_SECRET` and VAPID keys already generated (harmless to generate locally; DB-dependent values left blank). Fixed `.gitignore` so `.env.example` isn't swept up by the `.env*` ignore rule.
- Ran `prisma generate` against a placeholder `DATABASE_URL` (generation doesn't need a live connection) to get typed client output at `src/generated/prisma`.
- Built the pre-feature foundation layer MASTER_PROMPT.md calls for before any module:
  - `src/lib/prisma.ts` — singleton client (dev hot-reload safe).
  - `src/lib/timezone.ts` — Asia/Manila day-boundary and cutoff-comparison helpers (`todayManilaDateOnly`, `manilaTimeOnDateToUtc`, `isAtOrAfterManilaCutoff`, etc.), since CLAUDE.md flags UTC-day comparisons as a real bug, not a rounding detail.
  - `src/lib/geofence.ts` — the one haversine implementation (`checkGeofence`), used for every attendance punch.
  - `src/lib/auth.ts` — NextAuth v5 beta, Credentials provider (email + password + role selector matching PRD §6.1's mobile login), JWT session carrying `role` + `supervisorSchoolId` / `cooperatingTeacherProfileId` / `internProfileId` so every scoped query can derive scope from the session alone.
  - `src/lib/session.ts` — `requireSession()` / `requireRole()`, throwing typed `UnauthorizedError`/`ForbiddenError`.
  - `src/lib/scope.ts` — `scopeToRole`, one fragment builder per entity (intern/attendance/session/sessionDocument/endOfTermSubmission/alert/school), each deriving entirely from the session — the single shared scoping helper CLAUDE.md requires.
  - `src/lib/audit.ts` — `writeAuditLog()`, transaction-aware.
  - `src/lib/api-error.ts` — converts thrown errors (ZodError → 422 with per-field messages, Unauthorized → 401, Forbidden → 403) into `NextResponse`s.
  - NextAuth route handler at `src/app/api/auth/[...nextauth]/route.ts`.
- Created `PROGRESS.md` and this log per the two project skills' Step 3 requirement.

**Blocked on:** Supabase `DATABASE_URL`/`DIRECT_URL` and API keys — nothing that needs a live query (migration, seed, any CRUD) can run or be verified until these arrive. Continuing with schema-independent work (config/seed scripts that don't need to execute yet, PWA shell, static UI) in the meantime.

**Next:** PWA manifest + service worker registration (still scaffold-phase, MASTER_PROMPT step 1). Then config/seed data module (step 5) written so it's ready to run the moment the DB is connected. Apply the navy+amber theme to `globals.css` per `UI_FLOW_SPEC.md` §6.9.
