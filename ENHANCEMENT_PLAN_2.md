# Enhancement Plan 2: Tester Concerns (Concerns_2-1.docx)

Source: `Concerns_2-1.docx` (6 screenshots, written in Kinaray-a/Hiligaynon). I checked it against the code on `master` @ `11c0657`.
Each concern below gives the original text, an English translation, the **root cause found in the code**, and the planned fix.
Every fix follows `CLAUDE.md`: role scoping through `scopeToRole`, audit logging inside services, Manila time, and config-driven rules.

## Implementation status

| Phase | Status | Notes |
|---|---|---|
| 1: role-free login, CT password, admin "Set password" | **Done, not committed** (2026-10-27) | Verified on a dev server against the live DB using **read-only** checks only. Admin, supervisor, and CT each sign in with no role choice and land on their own home. A wrong password shows "Incorrect email or password". Registration returns per-field errors for a short, missing, or mismatched password. The Set password dialog renders. **Not exercised, to avoid writing to live data:** a full register → approve → sign-in round trip, the "awaiting approval" message (the live DB has no pending CT), and saving a password through the dialog. Q2 was answered with the recommended option (b). The active CT "brain bigdig" registered before this fix and needs an admin-set password |
| 2: end-of-term upload | **Done, not committed** | A DB check confirmed the bug was **UI-only**: each upload wrote one row of the correct type. Each slot now has its own busy state, filename, upload time, View and Replace. `dueDate` is set server-side from `Shifting.endDate`. A replace writes `END_SUBMISSION_REPLACE` with the previous file in `diff.before`. The upload itself was not exercised (it would write to live storage) |
| 3: intern Sessions / Evaluations / Documents (+ bugs A, B) | **Done, not committed** | Shared components in `src/components/interns/` are used by the admin drawer and the supervisor page. The criterion breakdown comes from `computeCriterionScores`, which `computeOverallScore` now uses too, so there is one scoring implementation; for M. Santos it sums to the stored 80%. Scope: a supervisor gets 403 for another school's intern. The supervisor Flagged/Behind filters use the alert flags the API already returned |
| 4: add interns (+ bug C) | **Done, not committed** | `createIntern` serves both roles; a supervisor's school always comes from the session. Duplicate email / school ID return per-field 422s (verified; nothing written). A real create was not run against the live DB |
| 5: per-student reports | **Done, not committed** | Per-intern rows are computed once, and the school totals are now sums of them (same counting rules as before). Per Student tab with school + student filters, a CSV that honors both, and row → intern drawer. The archive page gets it too. **Deviation:** no "View students" link on school rows, because those tables render on the server; the school filter covers the same need |
| Extra: password hashes in API responses | **Fixed** | Any `include: { user: true }` was sending bcrypt hashes to the browser, e.g. `GET /api/accounts/interns/[id]` for supervisors and CTs. The Prisma client now omits `passwordHash` globally; sign-in and change-password opt back in. Verified that the admin, supervisor and CT responses no longer contain it |

---

## 1. Summary

| # | Role / Area | Concern (translated) | Root cause | Priority | Size |
|---|---|---|---|---|---|
| 1 | Admin → Accounts | Admin should be able to **add students**, the same way they add supervisors | `listInterns` is admin-only, and the code says "never create". The only create path is `createInternBySupervisor` (`POST /api/supervisor/interns`), and **no UI calls it**: the supervisor app has no Add Intern form. Today nobody can add an intern from the app | **P0** | M |
| 2 | Admin → Reports & Archive | Reports should also be viewable **per student**, filterable by school, by student, or by student within a school. Today they are per school only | `getReports()` groups every metric by school. There is no per-intern breakdown and no filter | P1 | M |
| 3 | Admin → Accounts → Intern drawer | Sessions / Evaluations / Documents show nothing | `intern-detail-sheet.tsx` renders a `NotYetAvailable` placeholder for those three tabs. The data and services exist, but nothing is wired to them | **P0** | M |
| 4 | Student → Documents | Uploading a Narrative Report *or* a Teaching Portfolio makes **both** look uploaded | `EndTermUpload` uses **one shared `busy` flag**, so both rows show "Uploading…" together. It also **never shows which file is on record**: the `endSubmissions` returned by `/api/documents` are ignored, so the student can't tell which slot holds what. The upsert is keyed by `type`, so the DB should hold only one row per upload. I'll confirm this with a DB query before fixing | **P0** | S |
| 5 | Cooperating Teacher → Register | CTs should be able to **enter a password** when they sign up | `ct-registration-service.ts` generates a random password that is **never shown or sent to anyone**. Every self-registered CT is therefore locked out even after approval | **P0** | S |
| 6 | Login | Drop the Student / Supervisor / CT choice and **route automatically by role** | `LoginForm` sends `role`, and `authorize()` rejects the login when `user.role !== role`. `User.email` is already unique, so the role selector adds nothing and causes "wrong role" failures | P1 | S |

Related bugs I found while tracing these (testers didn't report them; fix them in the same pass):

| # | Where | Bug | Root cause |
|---|---|---|---|
| A | Supervisor app → Intern detail | Sessions / Documents / Alerts tabs are the same "not built" placeholders | `m/supervisor/interns/[id]/page.tsx` uses `NotYetAvailable` |
| B | Supervisor app → Interns list | The "Behind" filter is hardcoded to `sessionsLogged < 9`. The "Flagged" filter means `absences > 0`, not an active alert | Literal constants. This violates the CLAUDE.md rule that requirements come from `Shifting` and flags come from alerts |
| C | Admin → Interns tab | Help text says interns are added by supervisors, but no such UI exists | Stale copy |
| D | Student → End-of-term upload | `dueDate` is set by the **client** to "now" on every upload | `form.set("dueDate", new Date().toISOString())` in `EndTermUpload` |
| E | CTs registered before this fix | They hold an unusable random password | Same as #5. They need a way back in (see §5, Q2) |

---

## 2. Detailed plan per concern

### 1. Admin can add interns (plus the missing supervisor form) — P0

**Backend**
- `src/lib/validation/account.ts`: add `adminCreateInternSchema = createInternSchema.extend({ assignedSchoolId: z.string().min(1, "Select a school") })`.
- `src/lib/services/account-service.ts`: generalize `createInternBySupervisor` into `createIntern(actor, input)`.
  - ADMIN: uses `input.assignedSchoolId`, after checking that the school exists and isn't deleted.
  - SUPERVISOR: **always** `actor.supervisorSchoolId`, and any client-sent school is ignored (CLAUDE.md).
  - Other roles: `ForbiddenError`.
  - Keep the single `INTERN_ACCOUNT_CREATE` audit entry. The password is excluded from the diff, as it is today.
  - Return a per-field error when the email or `[assignedSchoolId, schoolNumber]` is already taken. Don't let it surface as a Prisma P2002.
- `src/app/api/accounts/interns/route.ts`: add `POST`, validated with `adminCreateInternSchema`.
- `src/app/api/supervisor/interns/route.ts`: `POST` now calls `createIntern`.

**UI**
- New `src/components/interns/intern-form-fields.tsx` holds the shared fields: full name, school ID, institutional email, course, year level, initial password (with `PasswordInput`), and an optional school select.
- Admin: an `AddInternSheet` modeled on `supervisor-form-sheet.tsx`, plus a **+ Add Intern** button on the Interns tab (same placement as "Add Supervisor"). Replace the stale help text (bug C).
- Supervisor: an **+ Add Intern** button on `m/supervisor/interns` that opens the same fields with the school locked to the session's school (PRD §6.4 / UI_FLOW_SPEC §4.4).
- Docs: update PRD §6.3 to say the admin may also add interns.

### 2. Per-student reports with school / student filters — P1

`getReports()` already loads every intern with their attendance and sessions for the shifting, so the per-intern view comes from the same query instead of a second one.

- `report-service.ts`: extend the include with `teachingSessions.evaluation.overallScore` and `endOfTermSubmissions` (for that shifting). Return a new `interns` array with one row per intern:
  - name, school ID, school, CT
  - Present / Late / Absent / Excused / Attendance rate (same `materializeAttendanceRecords` rule as the school rows)
  - Sessions evaluated `x / shifting.requiredTeachingSessions`, final demo done, On track / Behind
  - Average session score. Computed from stored `Decimal` scores and rounded only for display; labeled *"reference summary, not an official grade"* (CLAUDE.md)
  - Missing lesson plans / progress reports, Narrative ✓/✗, Portfolio ✓/✗, active alert count
- `shifting-report.tsx`: add a fourth tab, **Per Student**, with:
  - **School** select (All schools / one school)
  - **Student** search (name or school ID), applied within the chosen school
  - Clicking a row opens the `InternDetailSheet` from #3
  - Filtering runs client-side, because the data is already loaded for one shifting
- `api/reports/route.ts`: add `type=interns` CSV. It honors `schoolId` and `q`, so the download matches the on-screen filter.
- The shifting archive page (`semesters/shiftings/[id]`) already renders `ShiftingReport`, so **archives get the per-student view at no extra cost**. That covers the "report and archives" part of the request.
- Each school row in Attendance/Compliance gets a "View students" link that switches to Per Student filtered to that school.

### 3. Intern drawer: Sessions / Evaluations / Documents (plus supervisor bug A) — P0

**Backend** (follows the existing `/api/interns/[id]/dtr` pattern)
- `session-service.ts`: `listInternSessions(actor, internId, shiftingId)` with `where: { ...scopeToRole.session(actor), internId, shiftingId }`. The client-sent `internId` can only *narrow* the session's scope, never widen it. Include the evaluation with item scores, criteria, `submittedByUser`, and `submittedAt`.
- `document-service.ts`: `listInternDocuments(actor, internId, shiftingId)` returns the current (non-superseded) session documents plus end-of-term submissions, scoped through `scopeToRole.sessionDocument` and `scopeToRole.endOfTermSubmission`.
- Routes: `GET /api/interns/[id]/sessions?shiftingId=` and `GET /api/interns/[id]/documents?shiftingId=`, both Zod-validated.
- File viewing reuses `GET /api/documents/[id]/url` (signed URL valid for 5 minutes), which already scopes for ADMIN and SUPERVISOR.

**UI**: three shared components in `src/components/interns/`, used by the admin drawer *and* the supervisor page:
- `InternSessionsTab`: progress `9/15` (from `Shifting`), then a list of sessions with number, date, subject, grade/section, CT, status, and score.
- `InternEvaluationsTab`: for each evaluated session, the per-criterion breakdown (criterion mean and weight, from the instrument table), the overall %, CT comments (commendable / areas for improvement), and "Electronically signed by *CT* · *date (Manila)*".
- `InternDocumentsTab`: for each session, Lesson Plan / Progress Report with View or a "Missing" badge, followed by Narrative Report and Teaching Portfolio with filename, upload date, and View.
- Each tab uses the same shifting picker as `InternDtrTab` so earlier shiftings stay viewable.
- Supervisor page: replace all three placeholders. The Alerts tab gets an `internId` filter on `GET /api/alerts`, again only narrowing `scopeToRole.alert`.
- Bug B: in `api/supervisor/interns`, return `requiredTeachingSessions` (it's already sent as `activeShifting`) and `activeAlertCount`. The filters then use those values, not `9` and `absences > 0`.

### 4. End-of-term upload shows both as uploaded — P0

- **Confirm first:** query `EndOfTermSubmission` for the tester's intern after a single Narrative upload. If two rows appear, the bug is server-side and the fix moves to the service.
- `m/intern/documents/page.tsx` → `EndTermUpload`:
  - Track busy state **per type** (`busy: EndOfTermSubmissionType | null`).
  - Read `data.endSubmissions` (already returned) and show, per slot, either *"Not submitted"* or the filename, upload date, a **View** link (`/api/documents/[id]/url?kind=end`), and a **Replace** button.
  - Call `mutate()` after a successful upload so the status refreshes. Today it never does.
  - Reset the `<input>` value after an upload so the same file can be picked again.
- Bug D: stop sending `dueDate` from the client. Remove it from `endSubmissionMetadataSchema` and set it in `uploadEndSubmission` from the active shifting's `endDate`.
- Audit: write `END_SUBMISSION_REPLACE` (with the previous filename and storage key in `diff.before`) when a row already exists, so a replacement is never silent.

### 5. CT chooses a password at registration — P0

- `validation/ct-registration.ts`: add `password` (min 8) and `confirmPassword`, with a `.refine` that returns a per-field "Passwords don't match" error.
- `ct-registration-form.tsx`: add two `PasswordInput` fields and a hint: *"You can sign in with this password once the CTE office approves your account."*
- `ct-registration-service.ts`: hash `input.password` and delete the random-password code and the long "assumption" comment.
- The account stays `PENDING` until approval, and `authorize()` already rejects non-`ACTIVE` users, so the approval gate is unchanged.
- Docs: update PRD §6.1 and UI_FLOW_SPEC §1.2, and remove the open item in PROGRESS.md.
- Bug E (existing pending CTs): see Q2.

### 6. Login without a role selector — P1

- `auth.ts`: drop `role` from `credentialsSchema` and from the `role !== …` check. Look the user up by email only (it's unique). Status and password checks stay as they are.
- `login-form.tsx`:
  - Remove `ROLE_TABS`, the role state, and the `roleHomeMap` prop.
  - On success, `router.replace("/")`. `src/app/page.tsx` already redirects by the session's role, so routing logic stays in one place.
  - New error message: *"Incorrect email or password."* For a PENDING account, say *"Your account is awaiting approval by the CTE office."* That needs `authorize` to signal the reason, e.g. a `CredentialsSignin` subclass with a code.
  - Always show the "New cooperating teacher? Register" link on the mobile variant.
- `/login` and `/m/login` keep their own headings (Admin Dashboard / Practice Teaching Monitoring System). Both accept any role and land on that role's home, so signing in at the "wrong" page just works.
- Docs: update PRD line 71 ("Mobile login presents a role selector…").

---

## 3. Implementation order

| Phase | Commit | Covers | Why this order |
|---|---|---|---|
| 1 | `fix: role-free login and CT self-chosen password` | #6, #5, bug E | Unblocks testers: CTs can't sign in at all today |
| 2 | `fix: end-of-term uploads show per-slot status` | #4, bug D | Small, isolated, and student-facing |
| 3 | `feat: intern sessions, evaluations and documents tabs` | #3, bugs A, B | Builds the shared intern components that phase 4 reuses |
| 4 | `feat: admin and supervisor can add interns` | #1, bug C | |
| 5 | `feat: per-student reports with school and student filters` | #2 | Reuses the intern drawer from phase 3 for row drill-down |

No schema migration is needed for any phase. The `EndOfTermSubmission.dueDate`, `Shifting.endDate`, and audit `action` columns already exist, and `action` is a free string.

## 4. Audit-trail additions

- `INTERN_ACCOUNT_CREATE` now also comes from ADMIN. The actor role is already recorded.
- New `END_SUBMISSION_REPLACE` with a before/after diff.
- Add both to `src/lib/audit-format.ts` so the Audit Log reads them as plain text.

## 5. Questions to confirm with CTE / adviser

1. **Admin adding interns:** should the admin be able to assign *any* school, or should it default to the school filter on the Interns tab? *Default: any school, chosen in the form.*
2. **Pending CTs registered before this fix** hold unusable passwords. Should they (a) re-register, or (b) get a new **admin "Set temporary password"** action, which is audited and useful for "Forgot password? Contact the CTE office" anyway? *Recommend (b).*
3. **Per-student report columns:** is the average session score wanted, given it must be labeled a reference summary, or should only attendance and compliance show? *Default: show it, labeled.*
4. **Admin on the mobile login:** with role-free login, an admin signing in at `/m/login` lands on the web dashboard. Acceptable? *Default: yes.*

## 6. Verification checklist

- [ ] Sign in as each of the four seeded roles from both `/login` and `/m/login` with no role choice. Each lands on its own home.
- [ ] A wrong password and a PENDING account each show their own message.
- [ ] Register a CT with a password, approve it as admin, then sign in with that password.
- [ ] As an intern, upload a Narrative only: only Narrative shows a file and Portfolio still says "Not submitted". Replace works and writes `END_SUBMISSION_REPLACE`.
- [ ] Admin intern drawer and supervisor intern page show sessions, per-criterion evaluations, and documents. View opens a signed URL.
- [ ] A supervisor requesting `/api/interns/<other-school-intern>/sessions` gets an empty list or 403, never the data.
- [ ] Admin adds an intern to any school. A supervisor adds one and the school is forced to their own, even with a tampered `assignedSchoolId` in the request. Duplicate email or school ID returns a field error.
- [ ] Reports → Per Student, filtered by school, then by student within a school. The CSV matches the filtered view. The same tab works on a completed shifting's archive.
- [ ] Every new mutation appears in the Audit Log as readable text.
