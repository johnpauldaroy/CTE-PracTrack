# PracTrack Build Progress

Tracks status against the `MASTER_PROMPT.md` build order. Update this file (status + notes) whenever a module's state changes — this is what the next session/agent reads to know where to pick up.

Status values: **Not started** / **In progress** / **Blocked** / **Done**

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Scaffold (Next.js + TS + Tailwind + shadcn/ui + Prisma + PWA shell) | In progress | Next.js 16.3.4 / React 19.2.8 / Tailwind v4 scaffolded, shadcn/ui initialized (style: base-nova, navy+amber theme pending). Prisma installed & pinned to 6.19.3 (matched CLI+client) after `latest` resolved to an unstable 8.0.0-rc with broken transitive deps. PWA manifest + service worker not yet added. |
| 2 | Full Prisma schema (all PRD §8 entities + AuditLog/Notification/config singletons) | Done | `prisma/schema.prisma` written covering every entity in PRD §8 plus `SchoolSupervisorHistory` (reassignment logging per PRD §6.2). Validated with `prisma validate`. **Not yet migrated — blocked on DATABASE_URL (see Blocked section).** |
| 3 | Auth and role scoping (`requireSession()`, `scopeToRole()`) | In progress | `src/lib/auth.ts` (NextAuth v5 beta, Credentials provider, JWT session carrying role + scope ids), `src/lib/session.ts` (`requireSession`/`requireRole`), `src/lib/scope.ts` (`scopeToRole` fragments per entity: intern/attendance/session/sessionDocument/endOfTermSubmission/alert/school). NextAuth route handler wired. Login UI not yet built. Not yet tested against a live DB. |
| 4 | Audit-log writer | Done | `src/lib/audit.ts` — `writeAuditLog()`, callable inside a transaction. Not yet wired into any mutation (none exist yet). |
| 5 | Config + seed data (CheckInConfig, FlaggingRuleConfig, EvaluationCriterion/Item, effective-check-in resolver) | Not started | Schema has both config singletons + criterion/item tables. Resolver helper and seed script not yet written. |
| 6 | Academic period module (AcademicYear/Semester/Shifting CRUD + activation transition) | Not started | |
| 7 | School management (admin CRUD + haversine helper) | In progress | `src/lib/geofence.ts` (haversine + `checkGeofence`) done, unit tests pending. CRUD UI/API not started. |
| 8 | Account management (admin CRUD, CT self-reg + approval, supervisor-scoped intern creation) | Not started | |
| 9 | Geofenced attendance | Not started | `src/lib/timezone.ts` (Manila day-boundary/cutoff helpers) done ahead of schedule since attendance depends on it. |
| 10 | Teaching sessions & evaluation | Not started | |
| 11 | Documents (Supabase Storage) | Not started | Supabase client not yet initialized — waiting on Supabase credentials. |
| 12 | At-risk detection & alerts | Not started | |
| 13 | Dashboards | Not started | |
| 14 | Reports + CSV export | Not started | |
| 15 | Notifications (in-app + Web Push) | Not started | VAPID keys generated and in `.env` (not committed) / documented in `.env.example`. |
| 16 | Admin ops screens (audit log viewer, config settings UI) | Not started | |
| 17 | Seeding, testing, docs | Not started | |

## Blocked

- **DATABASE_URL / DIRECT_URL** — user chose Supabase Postgres as the database (2026-09-11) but hasn't sent the project's connection string / API keys yet. `.env` has empty placeholders; `.env.example` documents the expected shape (`DATABASE_URL`, `DIRECT_URL` for Prisma Migrate, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Until this arrives: no migration can run, so nothing that needs a live query can be verified end-to-end. Work in the meantime: schema, lib helpers, UI that doesn't require live data, static config/seed scripts (runnable once unblocked).
- Local disk was completely full (0 bytes free) at session start; `npm cache clean --force` recovered ~13GB. Worth rechecking before any large install.

## Open PRD §10 questions still unresolved (do not silently pick an answer — see CLAUDE.md / skill guidance)

See `PRD.md` §10 in full. Flagged again here because they gate specific modules:
- Q1 Time Out rule (clock time vs minimum-hours) — gates attendance module (#9). Drafted default: configurable clock time, global + per-school override — implementing this drafted default behind config, but the real rule needs CTE confirmation.
- Q4 Excused-day counting toward thresholds — gates alerts module (#12). Drafted default: excluded from all three counts.
- Q5 INCOMPLETE day counting — gates attendance rate calc (#9/#13/#14). Drafted default: counted for pace, excluded from "present" rate.
- Q6 GPS failure manual override — gates attendance module (#9). Schema now includes `AttendancePunchSource` (`DEVICE`/`MANUAL_SUPERVISOR`) to support a supervisor-recorded manual punch, but the UI/API for it isn't built and the PRD doesn't confirm this is wanted — flagging for confirmation before building it.
- Q7 CT↔intern assignment mechanism — gates sessions module (#10) and account management (#8). UI_FLOW_SPEC.md confirms the deck never shows a screen that performs this assignment either. Schema puts `cooperatingTeacherId` on `InternProfile` (nullable), assignable by supervisor or admin — needs confirmation of who.
- Q8 Behind-on-pace formula — gates alerts (#12). `FlaggingRuleConfig.behindPaceTolerance` added to schema to hold whatever tolerance is confirmed.
- Q10 Document type/size constraints — gates documents module (#11).
- Q12 Geolocation spoofing — recommended mitigation (impossible-travel check) not yet designed.

## UI reference

`UI_FLOW_SPEC.md` (repo root) is the full transcription of `CTE-PPT-FLOW.pdf`'s 44 slides — read this instead of the PDF for screen layout/copy/navigation. Section 7 of that doc lists 10 PPT-vs-PRD discrepancies.
