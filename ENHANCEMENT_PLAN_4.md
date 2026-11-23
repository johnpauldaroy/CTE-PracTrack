# Enhancement Plan 4: Latest tester / office concerns (Latest-Concern.docx)

Source: `Latest-Concern.docx` (6 screenshots, written in Kinaray-a/Hiligaynon). I checked every item against the code on `master` @ `59f5cba`.
Each item gives the original ask (translated), what the code does today, whether the change is needed, and the planned fix.
See the status section below. Every fix follows `CLAUDE.md`: scope through `scopeToRole`, audit logging inside services, Manila time, config-driven rules.

## Implementation status (2026-11-23)

**All eleven items are coded. Not committed, and the database upgrade has NOT been run.** `tsc`, `eslint` on the changed files and `next build` pass; the helper logic (section label, course normalising, alert grouping, registration schema) was checked with a script. The SQL script could not be run here (no local Postgres), so it is untested against a real database.

Answers used: re-pairing keeps the old CT's read-only history (sessions stay stamped with the CT who ran them); CTs that already had several interns keep the one they ran the most sessions with, the rest are unpaired (listed as NOTICEs when the script runs); SMTP mailbox instead of a verified domain; School ID No. required. Unanswered questions took the recommended default: pairing persists across shiftings, CT approval stays admin-only, course codes are free text normalised by the app, resolution notes need at least 10 characters.

| Item | Status | Where |
|---|---|---|
| A 1:1 pairing | Done | `InternProfile.cooperatingTeacherId` is UNIQUE; `ct-assignment-service.ts` blocks an already-paired CT, maps a race to a field error, notifies both people, audits; new supervisor **Teachers** tab (`/m/supervisor/teachers`); per-intern picker disables taken CTs; deleting a CT or intern frees the pairing; admin CT screens show one intern |
| B + C Course, Year & Section | Done | Unique on (course, year, section); `src/lib/section-label.ts` builds `BSED-MATH 4A`; Settings → Sections has Course / Year / Section and a live preview; registration and staff forms show the label |
| D Reusable email | Done | `softDeleteUser()` moves the email to `deletedEmail` and tombstones it; used by intern, supervisor and CT delete |
| E Merged alerts | Done | `groupAlertsByIntern` + `AlertGroupCard` on admin dashboard, supervisor home and Alerts page; one note resolves all of a student's flags; dashboard tile is now "Students Flagged" |
| F School name | Done | Supervisor home shows the partner school name(s) |
| G Registrations to approve | Done | Supervisor home shows a "registrations waiting for your approval" link; still depends on H for interns to arrive |
| H Email | Done (needs your settings) | SMTP via `nodemailer` (`SMTP_*` + `EMAIL_FROM`), Resend kept as an option; free MX/disposable-domain check on all three registrations. Supervisors and CTs still do not verify by emailed code |
| I School ID No. | Done | Required on intern registration; per-school duplicate check; shown on the enrollment request; freed when an intern is deleted |
| J Resolutions | Done | Admin **Resolutions** page (`/resolutions`) with search, school filter, paging |
| K Department | Done | Removed from forms, validation, tables, notifications and seed; column made nullable |

**To go live:** (1) back up the Supabase DB, (2) run `prisma/sql/2026-11-23_latest-concerns.sql` in the SQL editor and read the NOTICE output for unpaired interns, (3) set the `SMTP_*` and `EMAIL_FROM` variables (see `.env.example`), (4) redeploy. `schema.sql` was not regenerated.

**Known gaps:** a locked (not deleted) account keeps its pairing; the admin intern table still shows the stored course text rather than the generated label; the CT screens still use a list layout (of one intern); old sessions keep the stamped CT, and the old CT sees them only through the session screens.

---

## 1. Summary

| # | Concern | Verdict | Priority | Size |
|---|---|---|---|---|
| A | 1:1 Cooperating Teacher ↔ Intern, paired by the supervisor | **Needed. Biggest gap.** Today it is one CT to many interns, with no uniqueness rule | P0 | L |
| B | Same section letter in different courses (e.g. "A" in BSED-English and BSED-Math) | **Bug.** `Section.name` is globally unique | P0 | S |
| C | Replace "Section" with **Course, Year & Section**, auto-generating options like `BSED-MATH 4A` | Needed, and it fixes B | P0 | M |
| D | Deleted account's email reported as "already used" | **Bug, root cause confirmed.** Soft delete keeps the email in a unique column | P0 | S |
| E | Merge duplicate "Requiring Attention" cards for the same student | Needed | P1 | S |
| F | Supervisor sees the partner school name | Needed (small gap) | P1 | S |
| G | Supervisor sees registered interns to approve or reject | **Already built, but hard to find, and likely blocked by item H** | P1 | S |
| H | Free email validation API | Partly needed. Code verification already exists but cannot deliver in production | P0 (ops) | S–M |
| I | Add School ID No. to intern registration | Needed. Field exists, form does not ask | P1 | S |
| J | Admin "Resolution" tab showing supervisors' notes on resolved alerts | Needed. Only a per-school tab exists | P1 | S |
| K | Remove "Department" from supervisors | Needed | P2 | S |

Suggested order: **D → B+C → A → H → E → G+F+I → J → K.** D, B and C are quick bug fixes. A is the largest change and touches the data model, so do it once those are in.

---

## 2. Detailed analysis per item

### A. 1:1 Cooperating Teacher ↔ Intern, assigned by the supervisor: P0

**Ask.** The supervisor views the cooperating teacher (CT) accounts of their partner school, picks one, and pairs them with an intern. One CT has exactly one intern and one intern has exactly one CT. The CT can act only for the paired intern.

**What the code does today**
- `InternProfile.cooperatingTeacherId` is a plain nullable foreign key (`prisma/schema.prisma`). Nothing stops two interns pointing at the same CT. The data model is **one CT to many interns**: `CooperatingTeacherProfile.assignedInterns InternProfile[]`.
- `assignCt()` in `src/lib/services/ct-assignment-service.ts` checks that the CT is active and at the intern's school. It does **not** check whether that CT already has an intern. The dropdown in `src/components/mobile/supervisor/ct-assignment.tsx` lists every CT at the school with no "already paired" marker.
- The supervisor has no CT list. The only place a supervisor sees CTs is the dropdown inside one intern's detail page (`/m/supervisor/interns/[id]`). The ask is the reverse flow: CT first, then intern.
- CT approval and deletion are admin-only (`ct-approval-service.ts`). Deleting a CT does not unpair their intern, so the intern keeps a dangling pairing.
- What is already right: CT access is scoped through `scopeToRole` (`intern`, `session`, `sessionDocument`, `endOfTermSubmission`), and `assignSession` rejects interns outside the CT's scope. "CT can only manage the paired intern" is therefore mostly enforced. It just needs the 1:1 guarantee underneath it.

**Plan**
1. **Database rule.** Add `@unique` to `InternProfile.cooperatingTeacherId`. Postgres allows many NULLs, so unpaired interns are unaffected. This enforces CT→one-intern at the database level and removes race conditions between two supervisors. The intern→one-CT side already holds because it is a single column.
   - Before the migration, run a query to find CTs with more than one intern. Those need a decision (see questions).
   - Change `CooperatingTeacherProfile.assignedInterns` to a single optional `assignedIntern`.
2. **Service rule.** In `assignCt()`:
   - reject a CT that is already paired with a different intern ("Teacher X is already paired with Y");
   - catch the Prisma `P2002` error and return a field error;
   - keep the school-match and active-status checks.
3. **Supervisor workflow (new screen).** Add a "Cooperating Teachers" tab to the supervisor app, or a section on Interns:
   - lists CT accounts for the supervisor's school(s) only, scoped via the session (never a client-supplied `schoolId`);
   - each row shows Available or Paired with <intern>;
   - flow is pick CT → pick an unpaired intern → confirm, plus an Unpair action;
   - the existing per-intern picker stays but filters out already-paired CTs.
4. **Unpair on deactivation.** When a CT or intern is deactivated, deleted or locked, clear the pairing in the same transaction and audit it.
5. **Notifications.** Notify the CT and the intern when they are paired or unpaired. Audit `INTERN_CT_ASSIGN` already exists; add an unpair action.
6. **CT screens.** The CT roster becomes one intern. Keep the list component to limit change, but show an empty state "Waiting for your supervisor to pair you with an intern" when unpaired. Block "Assign session" server-side when unpaired (already true through scope).
7. **Admin.** Keep admin able to pair or unpair as a fallback for schools with no supervisor. Update `listActiveCts` and the CT detail sheet to show a single intern.

**Behaviour to decide:** what happens to sessions and evaluations when a pairing changes mid-term (see §5, question 1). Today `TeachingSession.cooperatingTeacherId` is stamped at assignment, so history stays with the CT who ran it, which is correct and should not change. The open point is whether the old CT keeps read-only access to those sessions.

### B. Same section name in different courses: P0 (bug)

**What the code does.** `Section.name` is `@unique` globally, and `createSection` / `updateSection` both reject a clash on `name` alone. Screenshot 1 shows exactly this: adding "A" for BEED fails with "A section with this name already exists" because "A" already exists for BSED-Math.

**Fix.** Make uniqueness `@@unique([course, yearLevel, name])` and drop `@unique` on `name`. Update the two clash checks in `section-service.ts` to compare all three. Solved properly together with C.

### C. "Course, Year & Section" with generated options: P0

**Ask.** Replace the single Section field with Course, Year and Section. The system then generates the options interns pick from, e.g. `BSED-MATH 4A`.

**What the code does.** A section is a free-typed `name` plus free-typed `course` and `yearLevel`, and the registration dropdown shows only `name` (`section-select.tsx`, public sections API). The data in screenshots 1 and 4 shows the resulting mess:

| Section | Course | Year level |
|---|---|---|
| A | BSED - MATH | 4 |
| BSEd-Eng 4A | BSED-English | 4th Year |

Course is written two ways ("BSED - MATH" vs "BSED-English"), and year is "4" vs "4th Year". The label also depends on whoever typed it.

**Plan**
1. Admin form (Settings → Sections) becomes three fields: **Course** (validated, trimmed, upper-cased, single code such as `BSED-MATH`), **Year level** (a select, 1–5, not free text), **Section** (a short letter or name such as `A`).
2. Add one shared helper `sectionLabel(section)` that returns `BSED-MATH 4A`. Use it in the registration dropdown, `SectionSelect`, the Sections table, enrollment requests, intern lists and reports. One implementation, per the project's "one helper" convention.
3. The Sections table shows the generated label and lets the admin edit the three parts.
4. Existing rows: write a one-off normalisation script that maps year levels to a number and tidies course codes, then flags rows it cannot parse for the admin. `Intern.course` and `Intern.yearLevel` are copied from the section at registration, so renaming a section does not update existing interns. Decide whether to backfill them.
5. Optional later: a small managed Course list so the admin picks the course instead of typing it.

### D. Deleted account email still "already used": P0 (bug, root cause confirmed)

**Root cause.** All three delete paths are soft deletes (`status = INACTIVE`, `deletedAt = now`): `deleteSupervisor`, `deleteCt`, `deleteInternAccount`. They leave `User.email` untouched, and `email` is `@unique`. Every create and register path then checks `prisma.user.findUnique({ where: { email } })` with no `deletedAt` filter, so the old row blocks the email: `createSupervisor`, `registerSupervisor`, `ct-registration-service`, `registerIntern` (it only allows retry for unverified pending accounts). So the account was deleted from the user's point of view, but the row is still in the database. Soft delete is intentional, because audit logs, attendance and evaluations reference these users, and it should stay.

**Fix (recommended).** On soft delete, free the email by rewriting it to a tombstone such as `deleted+<userId>@invalid.local` and keep the original in a new `User.deletedEmail` column (or in the audit diff, which already records the delete). Then:
- the unique constraint stays simple and Prisma-friendly;
- the email becomes reusable at once;
- a login by the old email can no longer match the old row.

Alternative: a partial unique index `UNIQUE (email) WHERE "deletedAt" IS NULL`. This is cleaner semantically, but Prisma cannot express it and `findUnique` by email would then have to become `findFirst({ deletedAt: null })` everywhere. The project already keeps one raw-SQL partial index (`Alert_one_active_per_type`), so either is acceptable.

Also back-fill: run the tombstone update once for rows that are already soft-deleted, so the testers' deleted accounts are freed.

### E. Merge duplicate "Requiring Attention" cards: P1

**What the code does.** One alert per intern per rule type is raised (`ABSENCE_EARLY_WARNING`, `CONSECUTIVE_ABSENCES`, `DROP_ELIGIBLE`, …). The admin dashboard, the supervisor home and the supervisor alerts page each render one card per alert. Screenshots 2 and 5 show the same student repeated ("36 absences …" and "36 consecutive absences …"). The supervisor home also slices to the first 5 alerts, so two students can fill the whole panel.

**Plan.** Group by intern in one shared function and render one card per intern:
- severity badge = highest severity among that intern's alerts;
- the card lists each triggered rule as a line, with school name on the admin view;
- cards are ordered by highest severity, then number of alerts;
- the "5 shown" limit counts interns, not alerts;
- group on the server (add `groupAlertsByIntern` next to `listAlerts`) so the dashboard, supervisor home and alerts page share it;
- Resolve on a merged card resolves that intern's active alerts under one note, or per line if the supervisor prefers. Each alert keeps its own row and audit entry;
- the "Active Alerts" tile should say how many *students* are flagged, or show both numbers.

Do not suppress lower-severity rules at evaluation time. The rules are config and the underlying alerts should stay accurate. Only the display merges.

### F. Supervisor sees partner school name: P1

The supervisor home says only "Your assigned school at a glance". The session carries `supervisorSchoolIds` but no names, and the school chips on the Interns page appear only when the supervisor has more than one school. Add the school name(s) to the Home header and the Profile card by returning them from `/api/supervisor/interns` or a small `/api/supervisor/schools`. The supervisor's own schools are already in scope, so this is a read-only change.

### G. Supervisor reviews registered interns: P1

**What exists.** Built in the last round (commit `66df407`): `/m/supervisor/enrollments`, with approve and reject (reject needs a reason), and a notification when a new request arrives. The supervisor in this concern could not find it.

**Why it was missed**
- The screen has no nav entry. The only link is a banner at the top of the Interns page, shown only when there are pending requests. Tabs are Home / Interns / Alerts / Profile.
- A request reaches the supervisor only **after the intern verifies their email** (`enrollment-service.ts` filters on `emailVerifiedAt`). If verification emails are not delivered (item H), nothing ever appears.

**Plan.** Add a "Requests" item with a count badge to the supervisor nav or Home, and show the school and School ID on each request. Confirm item H first, or the screen will keep appearing empty.

### H. Free email validation API: P0 (operational)

**What exists.** Interns already verify with a six-digit emailed code (hashed, 15 minutes, 5 attempts, resend cooldown), sent through Resend (`src/lib/email.ts`). This is stronger than an address-validation API, because it proves the person controls the mailbox.

**The real problem is delivery, not validation.** `email.ts` already handles Resend's sandbox error: until a sending domain is verified, Resend delivers only to the account owner's address. If no domain is verified, every intern except the owner fails at registration, which would also explain why the supervisor sees no registered interns.

**Options (free)**
1. **Verify a sending domain with Resend** (the university's or a thesis domain). This is the proper fix. Check Resend's current free-tier limits before relying on them.
2. **SMTP with a free mailbox** (for example a dedicated Gmail account with an app password, or a transactional provider's free plan that needs only a verified sender address, not a domain). Because `sendEmail` is the single place that sends mail, swapping provider is a one-file change.
3. **A validation API** (syntax, domain, disposable check). Useful only to catch typos and throwaway addresses before sending. A free alternative needs no third party: Node's `dns.resolveMx` on the domain plus a small disposable-domain list. I recommend this over adding a key-based API.

**Also:** supervisors and CTs self-register with **no** email verification. If the office wants verified emails for them, reuse the intern code flow. Decide before building (see questions).

### I. School ID No. on intern registration: P1

`InternProfile.schoolNumber` exists, is shown on admin screens and is already entered by admin and supervisor-created interns, but `internRegistrationSchema` and `registerIntern` never collect it, so self-registered interns have `null`. Add the field to the form, schema and both registration paths (new account and the resumable one), show it on the enrollment request card, and map a duplicate to a field error. The unique key is `[assignedSchoolId, schoolNumber]`. Decide whether it is required and whether a format should be enforced; I recommend required, no fixed format.

### J. Admin "Resolution" tab: P1

**What exists.** `resolveAlert` already stores `resolutionNote`, `resolvedAt` and the resolver, and writes an `ALERT_RESOLVE` audit entry. Admin can see resolved alerts only inside a single school (School detail → Resolved Alerts tab). `/api/alerts?status=resolved` already returns them, scoped by role.

**Plan.** Add an admin-level **Resolutions** view (a tab on the Dashboard or a nav item) listing resolved alerts across all schools: intern, school, flag, resolver, resolved date and the supervisor's note. Filters: school, supervisor, date range, search by intern. Group by intern in the same way as item E. Consider making the note mandatory with a minimum length so the tab is useful (the resolve validation is in `src/lib/validation/alert.ts`; check its current minimum). Optionally notify admins when a HIGH alert is resolved.

### K. Remove Department from supervisors: P2

`SupervisorProfile.department` is a required column used in: the registration form and schema, admin create/edit form and schemas (`validation/account.ts`), the accounts table, the school overview, the supervisor-registration notification text, audit labels and diffs. Remove it from all of these. Make the column nullable first, or drop it in the SQL script. Keep old audit entries readable, since their diffs may still contain `department`.

---

## 3. Data model changes (one SQL upgrade script, `prisma/sql/<date>_latest-concerns.sql`)

- `InternProfile.cooperatingTeacherId` → add `UNIQUE`. **Run the duplicate check first** and clean the data.
- `Section`: drop unique on `name`; add `UNIQUE (course, yearLevel, name)`; normalise existing year levels and course codes.
- `User`: tombstone soft-deleted emails; add `deletedEmail` (nullable).
- `SupervisorProfile.department` → nullable or dropped.
- No change needed for alerts, resolution notes or `schoolNumber`; the columns exist.

Back up the Supabase database before running it. As with the last round, `schema.sql` is the bootstrap file and would need regenerating for a fresh database.

## 4. Cross-cutting rules checked

- **Scope:** the supervisor CT list and pairing must use `scopeToRole` / `assertSchoolInScope`; never accept a client `schoolId`, `internId` or `ctId` without re-checking it against the session.
- **Audit:** log pair, unpair, section create/update with the new fields, and the email tombstone on delete, inside the service functions.
- **Shifting scoping:** the CT pairing is on the intern profile and persists across shiftings. Confirm that is intended (question 3).
- **Evaluations stay immutable:** re-pairing must not edit existing evaluations or re-stamp old sessions.
- **No offline writes:** unaffected.

## 5. Questions before implementation

1. **Re-pairing:** if a supervisor swaps a CT mid-term, should the old CT keep read-only access to the sessions and evaluations they already did? (Recommended: yes, read-only; new sessions go to the new CT.)
2. **Existing data:** are there CTs who already have more than one intern in the live database? If so, who keeps which?
3. **Persistence across terms:** should a pairing carry over when a new shifting is activated, or reset?
4. **CT approval:** keep it admin-only, or let the supervisor of that school approve their own CTs?
5. **Email:** which route for delivery: a verified domain on Resend (preferred), or an SMTP mailbox? And should supervisors and CTs also verify by emailed code?
6. **School ID:** required or optional on registration, and any fixed format?
7. **Course codes:** free text normalised by the app, or a managed course list the admin picks from?
8. **Resolution notes:** make them mandatory, with a minimum length?

## 6. Risks

- **A** is the only item with a data migration that can fail: adding `UNIQUE` will error if any CT already has two interns. Check first.
- **C** changes how sections display everywhere. Existing intern records keep their copied course and year, so the label shown for an old intern may differ from their section's new label until backfilled.
- **D** tombstoning changes stored emails. Anything that looks a user up by the old email (login, resend code) will correctly stop matching, but check audit and notification screens still show the original email where they should.
- **H** depends on the office's email decision. Until it is made, intern registration will keep failing in production for most addresses, and items G and the intern flow will look broken even though the code is fine.
