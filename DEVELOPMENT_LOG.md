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

---

## 2026-09-11 (cont'd) — PWA shell, theme, config + seed data

**Did:**
- Applied the navy+amber theme to `globals.css` (`:root`/`.dark` tokens) matching `UI_FLOW_SPEC.md` §6.9's confirmed palette exactly — navy `oklch(0.205 0.03 265)`-family for structural/brand, amber `oklch(0.75 0.15 75)`-family for primary CTA/accent, plus explicit `--success`/`--warning` semantic tokens since the app leans heavily on status-color coding (present/absent/incomplete pills, warning banners). Added a Lora (serif) `--font-heading` variable for the display headings the deck shows on "Dashboard", "Schools", etc., keeping Geist Sans for body/table text.
- Built the PWA shell: `manifest.webmanifest`, a service worker (`public/sw.js`) that caches the app shell for GET requests only and explicitly never intercepts non-GET requests — CLAUDE.md is emphatic that time-in/out, evaluation submission, and uploads must fail loudly offline, never queue. Generated icon/favicon assets via `sharp` (already a transitive Next.js dependency; no new install needed) since no PDF/image conversion tool was available on this machine (poppler and ImageMagick both absent — Ghostscript, already installed, was used instead to rasterize the flow deck).
- Wired a client-side `ServiceWorkerRegistration` component into the root layout.
- Fixed the Prisma-generated client import path: the new `prisma-client` generator (Prisma 6.19, replacing the old `prisma-client-js`) has no `index.ts` — its entry point is `client.ts`. Every internal import now uses `@/generated/prisma/client`, not `@/generated/prisma`. Also fixed a NextAuth v5 beta type mismatch in the `authorize`/`session` callbacks (return type needed a cast through `next-auth`'s own `User` type, not a hand-rolled `{ id: string }`).
- Verified `npx tsc --noEmit` and `npm run build` both pass clean end-to-end (Turbopack build, 3 routes).
- Committed the scaffold + foundation layer as the first commit (52 files).
- Built step 5 (config + seed data) fully in code, matching CLAUDE.md's resolver requirements:
  - `src/lib/check-in-config.ts` — the one school-override→global cascade resolver, plus singleton getters that create-on-first-read.
  - `src/lib/evaluation-score.ts` — the one weighted-scoring implementation (criterion mean ÷ 5 × weight, summed), throwing on any missing item rating rather than silently treating it as zero.
  - `prisma/seed/` — a seed script assembled from real mockup data: 15 partner schools (names, municipalities, types, and approximate town-center coordinates — explicitly documented as unsurveyed placeholders), one admin + 4 supervisors + 1 active/1 pending CT + 13 interns all matching the names/emails shown in `UI_FLOW_SPEC.md`, one academic-year/semester with a completed First Shifting and active Second Shifting, and the full six-criterion evaluation instrument. Weights are asserted to sum to 100 at seed time (throws otherwise). The four criteria whose item wording PRD §10 Q2 leaves open (Content, Teaching Methods, Classroom Management, Questioning Skills) are seeded with one explicit `PLACEHOLDER` item each plus a `console.warn`, rather than inventing plausible-sounding item text.
  - Wired `prisma.config.ts`'s `migrations.seed` and added `db:generate`/`db:migrate`/`db:seed`/`db:studio` npm scripts.
  - Confirmed `tsx` resolves the project's `@/*` tsconfig path alias natively (no `tsconfig-paths` package needed) and dry-ran the seed script against a placeholder `DATABASE_URL` — it runs every line of business logic (including the weights-sum check) and fails only at the actual network call, confirming it's ready to go the moment Supabase credentials land.

**Still blocked on:** Supabase `DATABASE_URL`/`DIRECT_URL`/API keys.

**Next:** Continue toward step 6 (academic period module) and step 7 (school management) — build the CRUD API routes and admin UI now, since those don't strictly require a live DB to write correctly, then run the first real migration + seed the moment credentials arrive.
