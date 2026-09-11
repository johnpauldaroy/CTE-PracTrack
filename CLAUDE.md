# CLAUDE.md

Guidance for Claude (or any AI coding agent) working in this repository.

## Project

**CTE PracTrack** is a practice-teaching monitoring system for the University of Antique — College of Teacher Education. It replaces paper logbooks, DTRs, and printed evaluation rating sheets with GPS-geofenced time-in/time-out, in-app teaching-session assignment and evaluation, internship-document submission tracking, rule-based at-risk flagging, and consolidated reporting across all partner schools. One codebase serves two surfaces: an **admin web dashboard** (CTE office) and an **installable mobile PWA** (interns, cooperating teachers, supervisors). Undergraduate thesis project (BSCS, June 2026); evaluated against ISO 25010 functional suitability, performance efficiency, and usability.

Full requirements: `PRD.md`. Build instructions for a fresh implementation: `MASTER_PROMPT.md`.

## Stack

- Framework: Next.js (App Router, TypeScript) — serves both the admin dashboard and the mobile PWA
- Database: PostgreSQL
- ORM: Prisma
- Auth: session-based (Auth.js / NextAuth credentials provider), role claim in session
- File storage: Supabase Storage (lesson plans, progress reports, narrative reports, teaching portfolios)
- Notifications: Web Push API (VAPID) via service worker + persisted in-app notification feed
- PWA: service worker + manifest (installable, offline shell only — see domain rules)
- UI: Tailwind + shadcn/ui
- Maps/geocoding for school registration: map picker with manual lat/long entry fallback

This stack is a recommendation, not a hard requirement — confirm before large refactors if it changes.

## Roles

Four roles. Admin uses the web dashboard; the other three use the mobile PWA.

- **ADMIN** — CTE office. Full scope across all schools. Manages schools, accounts, semesters/shiftings, global config, and reports.
- **SUPERVISOR** — scoped to the school(s) assigned to them. Every query touching interns, attendance, sessions, documents, or alerts must be filtered to their assigned school — enforce at the query layer, not just the UI.
- **COOPERATING_TEACHER** — scoped to the interns explicitly assigned to them at their school. Sees nothing about interns outside that list.
- **STUDENT_INTERN** — scoped to their own records only. Read-only on evaluations and alerts; write access only to their own time-in/out and document uploads.

Never trust a client-supplied `internId`, `schoolId`, or `role` for a non-ADMIN caller — always derive scope from the session.

## Core domain rules

- **Attendance is derived from GPS, never self-reported.** Time-in/time-out are accepted only when the device's coordinates fall inside the assigned school's geofence (school `latitude`/`longitude` + `geofenceRadiusMeters`). Compute the distance server-side from coordinates sent with the request; never accept a client-computed "inside: true" flag.
- **Attendance status is computed, never stored as free input.** `PRESENT` / `ABSENT` / `INCOMPLETE` (time-in with no time-out) / `LATE` (time-in after the effective cut-off) are derived from the record plus the effective check-in config. `EXCUSED` is the one status a supervisor sets explicitly, and it requires a reason/reference string.
- **Check-in cut-offs cascade: school override → global default.** A school with no override uses the global `CheckInConfig`. Resolve the effective value in one shared helper; don't re-implement the fallback per feature.
- **Flagging rules are config, not constants.** Absence early warning (3), consecutive absences (3), and drop-eligible (12) are the *current values* in the flagging-rules config record — they are examples from the mockups, not system constants. Never hardcode them or branch on them in code.
- **Session and final-demo requirements are per-shifting config.** "15 required teaching sessions, 1 final demo" lives on the `Shifting` row. Progress (`9/15`), on-track/behind status, and completion all read from that row.
- **Evaluation scoring is computed from the instrument, never entered.** A session score is the weighted sum of six criteria (Lesson Planning 15%, Content 20%, Teaching Methods 20%, Classroom Management 15%, Questioning Skills 15%, Teacher's Personality 15%), each the mean of its 1–5 items, expressed as a percentage. Criteria and weights live in a config/seed table so the instrument can change without a code change; a CT submits item ratings only.
- **Evaluations are immutable once submitted.** Submission stamps the CT identity and timestamp ("electronically signed by"). Corrections are a new record or an admin-logged amendment — never a silent overwrite.
- **Everything is scoped to a shifting.** Attendance, sessions, documents, and alerts always carry a `shiftingId`. Activating a new shifting resets *counters shown to users*, it never deletes or rewrites historical rows — prior-shifting data stays queryable and archived.
- **The system does not compute final grades.** It records attendance, sessions, evaluations, and compliance. Any UI showing a grade summary must label it as a reference summary, not an official grade.
- **Offline is not supported for writes.** The PWA service worker may cache the app shell, but time-in/time-out, session assignment, evaluation submission, and uploads all require a live connection and must fail loudly rather than queueing silently — a queued time-in would defeat geofence verification.

## Audit trail

Log every mutation that a stakeholder could later dispute: time-in/time-out, excuse marking, session assignment, evaluation submission, document upload/replace, alert resolution, account create/edit/delete, CT approval, school create/edit, shifting activation, and any config change (flagging rules, check-in times, geofence radius). Each entry records actor, role, action, target entity + id, timestamp, and a diff where applicable. Write it in the service function that performs the mutation, not in the route handler — this is cross-cutting and is the easiest thing to silently skip when adding a new feature. Readable by ADMIN only.

## Conventions

- Validate with Zod at every route boundary; return per-field errors, not a generic 400.
- Store all timestamps in UTC; render in Asia/Manila. Attendance "day" boundaries and cut-off comparisons are evaluated in Asia/Manila — never in server-local or UTC day terms.
- Scores and rates: store item ratings as integers 1–5 and compute percentages on read, or store computed scores as `Decimal` — never floats, and never round before the final display step.
- Uploaded files go to Supabase Storage under a per-intern/per-shifting path; the database stores the object key plus metadata (original filename, size, mime, uploadedAt), never the file bytes.
- One shared `scopeToRole(session)` helper produces the `where` fragment for every scoped query. Don't hand-roll per-module scoping.
- Distance/geofence math lives in one helper (haversine); no second implementation.

## Commands

_To be filled in once the project is scaffolded (dev server, migrations, tests, seed data)._
