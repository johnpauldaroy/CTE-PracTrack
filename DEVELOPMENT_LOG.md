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

---

## 2026-09-11 (cont'd) — Login flow, admin shell, full Schools module

**Context:** User sent the Supabase project URL and publishable/anon key. Still missing the DB connection string(s) and service role key, so continued building UI-independent-of-live-data modules while waiting.

**Did:**
- Saved the Supabase URL/anon key to `.env`; asked for and am still waiting on the DB connection string(s) (pooled + direct) and service role key.
- Installed the shadcn component set needed across the admin surface (button, input, card, table, tabs, dialog, sheet, dropdown-menu, avatar, select, slider, sonner, skeleton, etc.) — discovered this shadcn install is built on `@base-ui/react`, not Radix, so polymorphism uses `render={<Link/>}` instead of `asChild`. Saved this as a persistent memory (`practrack_baseui_shadcn.md`) since it'll recur constantly across the rest of the build.
- Built the login flow: a shared `LoginForm` client component (role-tab variant for mobile, plain for admin), `BrandCrest`, admin login at `/login`, mobile role-tabbed login at `/m/login`, and CT self-registration at `/m/register` (with a public, unauthenticated `/api/ct-registration` + `/api/public/schools` for the school picker — the one intentionally-unauthenticated write in the app).
- Flagged and left unresolved rather than silently inventing: the CT registration mockup has no password field and PRD §6.1 doesn't specify one; a random password is generated server-side but nothing currently delivers it to the registrant. Documented in `PROGRESS.md` module 8.
- Hit and fixed a real architectural bug: `middleware.ts` (Edge Runtime) was importing `auth.ts`, which pulls in the Prisma client — Prisma needs Node.js APIs (`node:path`, `node:process`, native bindings) that don't exist on the Edge Runtime, so the build failed. Fixed by splitting NextAuth config into `auth.config.ts` (edge-safe: session/JWT callbacks only, no providers) and `auth.ts` (full config, adds the Prisma-backed Credentials provider) — middleware now imports only the edge-safe config. This is the standard NextAuth v5 + Prisma + Edge middleware pattern.
- Also hit and fixed: passing an inline arrow function as a prop from a Server Component page into the client `LoginForm` component, which Next.js correctly rejects (functions aren't serializable across the server/client boundary). Changed `LoginForm` to take a plain `roleHomeMap: Record<string, string>` object instead of a `redirectTo` function.
- Renamed `middleware.ts` -> `proxy.ts` (Next.js 16 deprecated the `middleware` file convention in favor of `proxy`; the codemod found nothing to transform so did it manually — just a file rename, `export default auth(...)` unchanged).
- Built the full Schools module end-to-end: Zod schemas (`validation/school.ts`), a service layer (`services/school-service.ts`) with create/update/delete (blocked when interns are still assigned, per PRD §6.2), supervisor assign/reassign (logged to `SchoolSupervisorHistory`, enforces one-supervisor-per-school by clearing the previous assignment), and a check-in override updater — every mutation audit-logged inside a transaction. API routes under `/api/schools`. Admin UI: `/schools` list (Secondary/Elementary tables, "Not yet assigned" in warning amber per the mockup), an Add School slide-over drawer (type toggle, municipality, a labeled map-picker placeholder since no map integration exists yet, manual lat/long fallback, geofence radius slider defaulting to 75m), and `/schools/[id]` detail with Overview (stat cards, supervisor assignment picker, location card, check-in cascade display showing "using global default" when unset)/Interns (table with View Profile/Unassign — stubbed, no handler yet since accounts module isn't built)/Resolved Alerts (reads real `Alert` rows even though the alerts-raising feature itself isn't built yet, so it'll just show empty until then) tabs.
- Added supporting read services/routes needed across modules: `intern-service.ts` (interns-for-school with per-shifting session/absence counts), `shifting-service.ts` (`getActiveShifting()` — the "one active shifting system-wide" read, needed everywhere), `alert-query-service.ts` (resolved-alerts-for-school), plus `/api/supervisors` and `/api/shiftings/active`.
- Verified the whole thing two ways: `npx tsc --noEmit` and `npm run build` both clean, AND actually ran the dev server + drove it with Playwright (installed temporarily, not committed) to screenshot `/login`, `/m/login`, `/m/register` — all three visually match the mockup deck (navy/amber crest, role tabs, correct button color conventions including the inverted navy/amber "Submit Registration" button per UI_FLOW_SPEC.md §6.7). This is real browser verification, not just a successful compile.

**Still blocked on:** Supabase DB connection string(s) + service role key. Nothing built so far has touched a real database yet.

**Next:** Account management (step 8) — admin CRUD for interns/supervisors, CT approval UI (which will also need to resolve the password-delivery gap), and wiring the stubbed View Profile/Unassign buttons on the Schools > Interns tab.

---

## 2026-09-11 (cont'd) — Account management module

**Did:**
- Built the full account-management module per PRD §6.3/§6.4 and UI_FLOW_SPEC.md §2.7-2.9: `validation/account.ts`, `services/account-service.ts` (admin intern edit/delete — deliberately no admin intern *create*, since PRD §6.3's helper copy is explicit that only a supervisor creates intern accounts; supervisor full CRUD; `createInternBySupervisor` which hardcodes `assignedSchoolId` to the acting supervisor's own `supervisorSchoolId` from the session and never reads it from the request body), and `services/ct-approval-service.ts` (pending/active lists, a `getCtDetail` that computes each assigned intern's session/absence counts against the active shifting, approve, delete/reject).
- While writing `ct-approval-service.ts` noticed and fixed a design inconsistency: I'd started using `requireRole("ADMIN")` (which re-fetches the session internally) inside functions that also took an already-resolved `user: SessionUser` parameter — meaning the parameter went unused and every call did a redundant second session fetch. Standardized on the `school-service.ts`/`account-service.ts` pattern instead: a local `requireAdmin(user)` guard that checks the already-resolved actor.
- API routes under `/api/accounts/*` (interns, supervisors, CT pending/active/approve/delete) plus `/api/supervisor/interns` (list + create, scoped to the caller's own school) — the latter isn't wired into any UI yet since the mobile Supervisor surface doesn't exist, but the backend is ready for it.
- Admin UI: `/accounts` with three tabs matching the mockup exactly — Interns (debounced search, Edit drawer explicitly labeled "for corrections only" per the mockup's own copy, a 4-tab View detail drawer whose DTR/Sessions/Evaluations/Documents sub-tabs currently render an explicit "not yet available" placeholder rather than fake data, since those modules don't exist yet), Supervisors (Add/Edit share one form sheet component, keyed by mode), Cooperating Teachers (Pending Approval table with amber row tint and stacked Approve/Delete text actions matching the mockup, Active table with a CT detail drawer showing "Name — Course · x/15 sessions · n absences" per assigned intern exactly as specced).
- Wired the Schools > Interns tab's previously-stubbed "View Profile" button to the same intern detail sheet (shared component, not duplicated). Left "Unassign" disabled with an explanatory comment and tooltip rather than inventing behavior — PRD §6.4 fixes an intern's school at account-creation time and no document defines a separate "unassign" action distinct from editing or deleting the account.
- `tsc --noEmit` and `npm run build` both clean (26 routes now).

**Still blocked on:** Supabase DB connection string(s) + service role key — nothing has touched a live database yet. Disk space is down to ~4.4GB free; worth monitoring before further large installs.

**Next:** Geofenced attendance (step 9) — the core thesis feature. Time-in/time-out endpoints with server-side haversine distance check and status derivation, the DTR query, supervisor excuse marking, and the intern attendance UI. This unblocks wiring real data into the Intern Detail DTR tab and School/CT stat cards that are currently showing placeholder "—" or zero values.

---

## 2026-09-11 (cont'd) — Academic period module (Semesters)

**Did:**
- Built `services/academic-period-service.ts`: `createSemester` (upserts the AcademicYear by label, creates a Semester with both FIRST/SECOND Shiftings fixed at UPCOMING status, per the mockup's own helper text "Each semester is created with two fixed shiftings"), `configureShifting` (dates + requiredTeachingSessions/requiredFinalDemos, audit-logged with before/after), and `activateShifting` — the single-active-shifting invariant as one transaction: find the currently-ACTIVE shifting (if any), flip it to COMPLETED with a timestamp, flip the target to ACTIVE with a timestamp, audit-log both sides.
- Documented directly in the code why "activation resets displayed counters" required no counter-reset code: every attendance/session/document/alert query in the app is already scoped by `shiftingId` (enforced by the schema and the service layer throughout), so a newly-activated shifting simply has zero rows under it and every count reads as zero automatically. Historical shiftings stay fully intact and queryable — there was never anything to zero out at the database level, only a status flip.
- API routes: `/api/semesters` (list nested academic years/semesters/shiftings + create), `/api/shiftings/[id]/configure`, `/api/shiftings/[id]/activate`, `/api/academic-years/archived`.
- Admin UI at `/semesters` matching UI_FLOW_SPEC.md §2.10 closely: academic year cards containing First/Second Shifting sub-cards with status pills (Active/Completed/Upcoming), the exact activation warning banner copy from the mockup, an inline (not drawer) Add Semester form that toggles open, a centered Configure Shifting modal (2x2 field grid: dates + requirements), and a collapsible Archived Academic Years section that only fetches its data once expanded (avoids an unnecessary query on every page load).
- `tsc --noEmit` and `npm run build` both clean (30 routes now).

**Still blocked on:** Supabase DB connection string(s) + service role key.

**Next:** Geofenced attendance (step 9) — the load-bearing thesis feature. Time-in/time-out endpoints with server-side haversine + cutoff derivation, DTR query, supervisor excuse marking, intern attendance UI. After that, likely a quick pass on Settings (Flagging Rules + Check-in config screens) since the resolvers already exist and just need a UI, before tackling sessions/evaluation.
