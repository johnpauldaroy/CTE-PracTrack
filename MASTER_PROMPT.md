# Master Build Prompt — CTE PracTrack

Use this prompt to instruct an AI coding agent (or a dev team) to build the system. It assumes `PRD.md` and `CLAUDE.md` are in the repo root and already approved — PRD.md Section 10 records the decisions still open or already made.

---

Act as a senior full-stack engineer with deep experience in Next.js App Router, Prisma/PostgreSQL data modeling, role-scoped authorization, and installable PWAs with geolocation. Build with production-grade rigor — correct server-side authorization, derived-never-stored fields, and an audit trail that cannot be bypassed — not a prototype. This system produces the official attendance and evaluation record for a university practicum; a record that can be forged or silently edited is a failed build even if every screen renders.

You are building **CTE PracTrack** for the University of Antique — College of Teacher Education: a mobile PWA and admin web dashboard that replaces paper DTRs, logbooks, and printed evaluation sheets with GPS-geofenced attendance, in-app session evaluation, document tracking, at-risk flagging, and consolidated reporting across partner schools.

Read `PRD.md` in full before writing any code — it is the source of truth for scope, fields, roles, and business rules. Read `CLAUDE.md` for stack choices and cross-cutting conventions.

## Build order

1. **Scaffold** — Next.js + TypeScript + Tailwind + shadcn/ui, Prisma + PostgreSQL, env handling. Set up the PWA manifest and service worker registration now, not later: retrofitting PWA install and service-worker scope onto a finished app is far more painful than starting with it.
2. **Full Prisma schema + migrations** for every entity in PRD §8 at once, including `AuditLog`, `Notification`, and the config singletons. Half a schema forces rework in every module that touches the missing half.
3. **Auth and role scoping** — credentials auth, session with role claim, `requireSession()`, and the single shared `scopeToRole(session)` helper that every scoped query will use. Build this before any feature query exists, so no module ever ships an unscoped one.
4. **Audit-log writer** at the service layer, with a helper every mutation calls. Build it *before* the features that call it — retrofitted audit logging is always partial.
5. **Config + seed data** — `CheckInConfig`, `FlaggingRuleConfig`, `EvaluationCriterion` + `EvaluationItem` (weights totalling 100), and the effective-check-in-config resolver (school override → global). Everything downstream reads thresholds and criteria from here, so no later module has an excuse to hardcode a 3, a 15, or a 75.
6. **Academic period module** — AcademicYear / Semester / Shifting CRUD, the single-active-shifting invariant, and the activation transition (previous → Completed, counters recomputed, history untouched). This comes before attendance and sessions because every one of those rows needs a `shiftingId`.
7. **School management** (admin) — CRUD with coordinates, geofence radius, supervisor assignment, per-school check-in overrides. Plus the haversine geofence helper, unit-tested against the stored radius. Attendance depends on this existing.
8. **Account management** — admin CRUD for supervisors and interns, CT self-registration + admin approval flow, supervisor-scoped intern creation. Enforce here that a supervisor creating an intern cannot set `schoolId` from the request body.
9. **Geofenced attendance** — time-in/time-out endpoints (server-side distance check, status derivation, coordinates persisted), the DTR query, supervisor excuse marking, and the intern attendance UI. This is the load-bearing feature of the thesis; test the boundary cases explicitly (just inside/outside radius, punch after cut-off, time-in with no time-out, double punch, punch outside the shifting date range).
10. **Teaching sessions & evaluation** — CT assigns a session; CT submits item ratings; server computes the weighted score from `EvaluationCriterion` config; evaluation stamped immutable with CT identity and timestamp. Sessions depend on intern↔CT assignment from step 8.
11. **Documents** — Supabase Storage upload with signed URLs, per-session lesson plan + progress report, end-of-term submissions, per-session completion state. Compliance reporting later reads from this, so get the "missing" state right here rather than computing it twice.
12. **At-risk detection & alerts** — rule evaluation against `FlaggingRuleConfig`, alert raising/deduplication, supervisor resolution with required note. Built after attendance, sessions, and documents because every rule reads from all three.
13. **Dashboards** — supervisor home and admin home. These only aggregate what steps 9–12 already produce; building them earlier means inventing numbers.
14. **Reports + CSV export** — attendance, session & document compliance, resolved alerts; school filter and shifting filter on every tab, with per-school drill-down. Derive at query time; do not add report tables.
15. **Notifications** — in-app feed first (guaranteed channel), then Web Push subscription + VAPID delivery layered on top. Never make push the only path for a time-critical alert.
16. **Admin ops screens** — audit log viewer, config settings UI (flagging rules, check-in), account and school housekeeping.
17. **Seeding, testing, and documentation** — realistic seed data (15 schools, ~112 interns, one active shifting) for the ISO 25010 evaluation sessions; a user manual per role; and the setup/deploy notes the thesis defense will need.

## Non-negotiables (re-stated from CLAUDE.md — do not skip)

- **Role scope comes from the session, never the request.** A supervisor's `schoolId`, a CT's intern list, and an intern's own id are derived from auth. Ignore any client-supplied scope field even when present.
- **Geofence distance is computed server-side** from raw coordinates. Reject any request that carries a precomputed in-range flag. Persist the coordinates of every punch.
- **Derived fields are computed, never accepted**: attendance status, session score, on-track/behind status, compliance counts, attendance rates. If the client sends one, drop it.
- **Thresholds and the evaluation instrument are config, not code.** 3 / 3 / 12, 15 sessions, 1 final demo, 75 m, 07:30 — every one of these is a default in a config row. If you write `if (absences >= 3)`, you've introduced a bug.
- **Evaluations are immutable after submission**, stamped with CT identity and timestamp.
- **Every mutation audit-logs** from the service layer, including excuse marking, alert resolution, CT approval, shifting activation, and config changes.
- **Everything carries a `shiftingId`**; activating a shifting never mutates historical rows.
- **No offline write queueing.** A failed punch fails loudly.
- **No final grade computation anywhere**, and any grade-like summary is labelled as a reference summary only.
- **Secrets in `.env` only** — VAPID keys, Supabase service key, database URL. Never in the database or an admin screen.

## Definition of done for v1

- Every module in PRD §6 implemented and gated exactly per the §7 Access Summary, with authorization verified at the API layer — not just hidden in the UI.
- A time-in outside the geofence, after the cut-off, on a duplicate day, or outside the active shifting each produces the correct documented outcome, demonstrably.
- Activating a new shifting resets displayed counters while every prior-shifting record remains retrievable and correct.
- Changing a flagging threshold or an evaluation weight in config changes system behavior with no code change.
- Every mutation listed above appears in the audit log with actor, action, target, and diff.
- Reports and CSV exports reconcile exactly with the underlying records for both a single school and system-wide.
- The mobile surface installs to the home screen, and the in-app notification feed delivers every alert type independently of push.
- Seed data, per-role user manual, and setup/deploy documentation complete, and the ISO 25010 questionnaire instrument ready to administer to interns, CTs, supervisors, and administrators.
