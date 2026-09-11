---
name: practrack-frontend-builder
description: Implements frontend modules — Next.js admin dashboard pages and mobile PWA screens, components, forms, tables — for CTE PracTrack (the University of Antique College of Teacher Education practice-teaching monitoring system) specifically. Use whenever the user asks to build, implement, or continue the UI/frontend/screens side of a module in this project (e.g. "build the intern attendance screen", "implement the CT evaluation form", "add the admin reports page", "build the supervisor alerts tab"), or says a module's backend is ready and now needs a UI. This skill is scoped to this one project only — it reads and depends on this repo's CLAUDE.md, PRD.md, MASTER_PROMPT.md, and PROGRESS.md, and is not meant to generalize to other codebases.
---

# PracTrack Frontend Builder

Implements one frontend module at a time for CTE PracTrack — Tailwind + shadcn/ui on Next.js App Router — matching whatever backend already exists for that module. Two surfaces share one codebase: the **admin web dashboard** (wide tables, drawers, filters) and the **mobile PWA** (interns, CTs, supervisors — bottom tab bar, one primary action per screen). A screen should be unmistakably one or the other, and every screen within a surface should look like the same person designed it.

## Step 1: Orient before writing code

Read, in this order: `CLAUDE.md` (stack + roles — the UI must reflect the same scoping the backend enforces), `PROGRESS.md` (is the backend for this module actually done? a frontend without its backend is a mockup, not a feature — say so if you're building ahead of the API), the `MASTER_PROMPT.md` build order, and the relevant `PRD.md` functional-requirements subsection plus the §7 Access Summary for what each role may see.

Then look at what API routes actually exist under `src/app/api/` for this module. Call what's there, not an endpoint shape you're guessing at. If the backend genuinely doesn't exist yet, say so rather than inventing a fetch against a route that isn't real.

The uploaded UI flow deck (`CTE-PPT-FLOW.pdf`) is the visual reference for layout, labels, and navigation order. Follow it for structure; where it conflicts with `PRD.md`, the PRD wins and the conflict gets flagged.

## Step 2: Build following the house rules

- **Role-gate at the page and component level, matching the backend, not replacing it.** Hiding a button from an intern is a UX nicety; the server-side check is the security boundary. If you're building a screen whose API route doesn't enforce scoping, flag that as a backend gap — don't paper over it with a UI-only restriction.
- **Mobile screens are a PWA, not a responsive desktop page.** Bottom tab navigation per role (Intern: Home / Attendance / Sessions / Documents / Profile · Supervisor: Home / Interns / Alerts / Profile · CT: Home / Sessions / Documents / Profile), thumb-reachable primary actions, and no horizontal-scrolling tables. Admin pages are the opposite: dense tables, side drawers for detail, filters in a row above the table.
- **Every data screen is shifting-scoped and says so.** Shifting tabs (First / Second) on attendance, sessions, and documents; the active shifting named on dashboards; archived shiftings clearly read-only. A screen showing counts without naming its shifting is ambiguous and therefore wrong.
- **Derived values are displayed, never editable.** Attendance status, session scores and overall rating, on-track/behind status, compliance counts, days-remaining. If the backend computes it, the form shows it — including the live overall-rating readout on the CT evaluation form, which is computed, not typed.
- **Geolocation UX is explicit.** The time-in/time-out flow states that location is captured only at the moment of the punch, handles permission-denied and out-of-range with a clear message and a next step, and never shows a success state until the server confirms. No optimistic UI on an attendance punch, and no retry loop that silently re-submits.
- **Alerts and thresholds read from config, not from a hardcoded string.** Warning banners ("4 absences recorded. Early warning threshold is 3.") interpolate the configured value returned by the API. Never write the number into the copy.
- **Resolution notes are required in the UI too** — the Resolve action is disabled until a note is entered, matching the server-side requirement rather than discovering it as a 400.
- **Lists get the standard shape**: search, the filters the PRD names for that module (school, shifting, All/Flagged/Behind), and pagination on admin tables. Build one reusable table pattern and one reusable detail-drawer pattern, then reuse them — not a bespoke table per page.
- **Use shadcn/ui + Tailwind consistent with what's in the repo.** Don't introduce a second component library or hand-roll what shadcn already provides. Keep to the existing palette (dark navy + amber) already established across the mockups.
- **Notifications surface in-app first.** Every alert type must be visible in the in-app feed regardless of push permission state; treat push as an enhancement and handle the denied/unsupported case without a broken-looking UI.

## Step 3: Update the project's own tracking

Before finishing, update `PROGRESS.md` (module status) and append a `DEVELOPMENT_LOG.md` entry. If you noticed a backend gap while building — a missing endpoint, a field the API doesn't return that the PRD implies the UI needs — name it explicitly in your reply rather than quietly working around it with a stub or client-side computation.

## What good output looks like

- A user in any role literally cannot see or reach an action the backend would reject anyway — the two layers agree.
- Every list in the app behaves the same way, so a user doesn't relearn each screen.
- Nothing in a form lets a user type a value that `CLAUDE.md` says must be derived.
- The attendance punch flow is honest about failure: out-of-range, permission denied, and offline each produce a distinct, actionable message.
- Mobile screens pass a one-handed use check; admin screens print/export where the PRD says they should.
- `PROGRESS.md` and `DEVELOPMENT_LOG.md` reflect the work by the time you're done.
