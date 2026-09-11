---
name: practrack-backend-builder
description: Implements backend modules — Prisma schema changes, API routes, service-layer logic — for CTE PracTrack (the University of Antique College of Teacher Education practice-teaching monitoring system) specifically. Use whenever the user asks to build, implement, or continue the backend/API/database side of a module in this project (e.g. "build the geofenced time-in endpoint", "implement the evaluation scoring service", "add the at-risk flagging rules", "build the shifting activation logic"), or says a PRD module is ready to build. This skill is scoped to this one project only — it reads and depends on this repo's CLAUDE.md, PRD.md, MASTER_PROMPT.md, and PROGRESS.md, and is not meant to generalize to other codebases.
---

# PracTrack Backend Builder

Implements one backend module at a time for CTE PracTrack, in the order `MASTER_PROMPT.md` lays out, following the conventions `CLAUDE.md` already commits the project to. The goal is that every module looks like it was written by the same careful engineer, not reinvented per module.

## Step 1: Orient before writing code

Read, in this order: `CLAUDE.md` (conventions — don't skip this even if you think you remember them, they get refined as the project evolves), `PROGRESS.md` (what's done, what's next), the `MASTER_PROMPT.md` build order (confirms the dependency this module needs is actually built), and the relevant `PRD.md` functional-requirements subsection.

Dependencies in this project are unusually strict, so check them before writing a line: attendance needs `School` coordinates and an active `Shifting`; sessions need the intern↔CT assignment; alerts need attendance, sessions, *and* documents; reports and dashboards need everything upstream of them. If the module the user asked for depends on something `PROGRESS.md` still shows as "Not started", say so before writing code that silently assumes it exists.

Then look at what's already in `src/lib/` and under `src/app/api/`. New code should match the shape of what's there, not introduce a second way of doing the same thing — a second scoping helper, a second audit-log call pattern, a second distance calculation.

Check `PRD.md` §10 too. If the module you're about to build depends on a question that's still open there (the Time Out rule, the excused-absence counting rule, the behind-pace formula, the GPS-failure fallback), don't quietly pick an answer and bury it in code — surface it, implement the drafted default behind config if you can, and note it in your reply.

## Step 2: Build following the house rules

These are non-negotiable per `CLAUDE.md` — treat any of them as a bug if missing, not a style preference:

- **Scope comes from the session, never the request.** Every query touching interns, attendance, sessions, documents, or alerts spreads `scopeToRole(session.user)` into its `where` clause. A supervisor's `schoolId`, a CT's assigned-intern list, and an intern's own id are derived from `requireSession()` — if the client sends one, ignore it. An admin-only route checks role server-side; don't rely on the route not being linked in the UI.
- **Geofence math is server-side and lives in one helper.** Time-in/time-out endpoints receive raw coordinates, compute haversine distance against the school's `latitude`/`longitude` and `geofenceRadiusMeters`, and decide. Reject any payload carrying a precomputed in-range boolean. Persist the punch coordinates on the record — they're the dispute-resolution evidence.
- **Derived fields are computed, never accepted from the client.** Attendance status (`PRESENT`/`ABSENT`/`INCOMPLETE`/`LATE`), the weighted evaluation score, on-track/behind status, compliance counts, and attendance rates are all computed server-side even if the request body contains them.
- **Config drives behavior, not code branches.** Flagging thresholds, `requiredTeachingSessions`/`requiredFinalDemos`, geofence radius, check-in cut-offs, and evaluation criteria/weights all come from config rows (`FlaggingRuleConfig`, `Shifting`, `School`, `CheckInConfig`, `EvaluationCriterion`). If you catch yourself writing `if (absences >= 3)` or `/ 15` or `=== 75`, stop — that value belongs in config.
- **Check-in cut-offs resolve through the shared cascade helper**: school override → global default. Never re-implement the fallback inline.
- **Every write carries a `shiftingId`**, and shifting activation is a transaction that flips statuses and recomputes displayed counters without mutating or deleting a single historical row.
- **Evaluations are insert-only.** Submission writes the score, CT identity, and timestamp; there is no update path. A correction is a new record or an admin-logged amendment.
- **Audit logging is not optional.** Every create/edit/delete, plus time-in/out, excuse marking, alert resolution, CT approval, shifting activation, document upload, and config change calls `writeAuditLog()` from the service function performing the mutation — not from the route handler, so nothing can call the mutation and skip it.
- **Validate with Zod at the route boundary** and return per-field errors, not a generic 400. Attendance and evaluation payloads especially: an out-of-range rating or a missing coordinate should be a named field error.
- **Timestamps are UTC in storage, Asia/Manila for every comparison.** Day boundaries, cut-off comparisons, and "today" in any dashboard query are Manila-relative. A UTC-day query here is a real bug, not a rounding detail.
- **Fail loudly, never queue.** No offline write buffering for punches, evaluations, or uploads.

## Step 3: Update the project's own tracking

Before finishing, update `PROGRESS.md` (flip the module's status, and the milestones checklist if this closes one) and append an entry to `DEVELOPMENT_LOG.md` in the existing format. These aren't optional cleanup — `PROGRESS.md` is what the next session reads to know where to pick up, including your own next invocation.

If you hit something `PRD.md`/`CLAUDE.md` doesn't answer, don't silently invent a rule — name it in your reply, and if it's a decision worth writing down, propose adding it to `PRD.md` §10 (if it's a requirements question) or `LEARNINGS.md` (if it's an implementation discovery).

## What good output looks like

- A reviewer who only read `CLAUDE.md` first would find nothing in the new code that surprises them.
- Every mutation has exactly one code path, and that path always audit-logs — not "audit-logs in the common case."
- Nothing in the new module hardcodes a threshold, session count, radius, or cut-off that should have come from config.
- Attendance edge cases are handled explicitly, not by accident: outside the geofence, after the cut-off, second punch of the day, time-out before time-in, punch on a date outside the active shifting.
- `PROGRESS.md` and `DEVELOPMENT_LOG.md` reflect the work by the time you're done, not left for the user to update by hand.
