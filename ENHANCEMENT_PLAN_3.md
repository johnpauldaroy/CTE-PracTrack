# Enhancement Plan 3: Feedback from the CTE office (Changes.docx)

Source: `Changes.docx` (4 screenshots, written in Kinaray-a/Hiligaynon). I checked every item against the code on `master` @ `5b310b6`.
Each item gives the original ask (translated), what the code does today, whether the change is needed, and the planned fix.
Every fix follows `CLAUDE.md`: scope through `scopeToRole`, audit logging inside services, Manila time, config-driven rules, no offline writes.

## Implementation status (2026-11-20)

**All ten items are coded. Not committed, and the database upgrade has NOT been run.** Open questions in §6 were not answered, so the recommended defaults were used.

| Item | Status | Notes |
|---|---|---|
| 1 AM/PM attendance | Done (code) | Same daily row with PM columns. Server picks the half from the clock and today's punches. Five check-in times (global + per-school override). Verified with a pure-logic test only (status rule, punch planning, calendar); **not exercised against a live DB** |
| 2 Banner + school-day calendar | Done (code) | One `AttendanceAlertBanner` for intern, supervisor and admin views; drop-eligible now reads as drop-eligible. `Shifting.dutyWeekdays` (default Mon–Fri) is editable in Configure Shifting. Also fixed: the intern Home absence count read stored rows and was always 0 |
| 3 Supervisor registration + multi-school | Done (code) | `SupervisorSchool` join table, `supervisorSchoolIds` in the session, `scopeToRole` updated, public registration page, admin Pending Approval + school checklist, school switcher on the supervisor Interns list. A school keeps one supervisor |
| 4 Intern registration | Done (code) | Sections (Settings → Sections), registration page, 6-digit emailed code (hashed, 15 min, 5 attempts, resend limit), supervisor **Enrollment requests** screen, admin fallback when a school has no supervisor. **Needs an email provider** (see below) |
| 5 Session notes | Done (code) | Notes + optional lesson-plan due date on Assign Session; shown to the intern and in the notification |
| 6 Lesson-plan approval | Done (code) | Submit → CT Approve / Return → Evaluate unlocked. `submitEvaluation` rejects unapproved plans server-side. Replace is blocked once approved |
| 7 Documents | Done (code) | `Documents: n/2` replaced by a lesson-plan status badge. Old per-session progress reports are kept and shown as "older" |
| 8 Progress reports | Done (code) | Periods per shifting (generate weekly / every N days / custom ranges) in Configure Shifting; intern uploads per period; supervisor + admin view; CT has no access |
| 9 No Class / Duty | Done (code) | Intern, whole school, or all schools (admin); date or range; punches rejected server-side and buttons locked; alerts re-evaluated |
| 10 Lock accounts | Done (code) | Semesters page panel (by role / school, preview, reason). `requireSession` re-checks the account on every request, so a lock takes effect on the next action |

**To go live:** (1) back up the Supabase DB, (2) run `prisma/sql/2026-11-20_office-feedback.sql` in the SQL editor, (3) set `RESEND_API_KEY` and `EMAIL_FROM` (or intern verification codes cannot be sent in production), (4) add at least one Section in Settings → Sections, (5) redeploy. `schema.sql` (the bootstrap file) was **not** regenerated; a fresh database needs it plus the dated scripts.

**Known gaps / deviations:** per-account Lock/Unlock buttons were not added (the bulk panel can target one school or role); the CT detail drawer still counts absences from stored rows only; the intern Home screen does not yet show progress-report or lesson-plan reminders; the pre-existing `alerts/page.tsx` lint warning is untouched.

---

## 1. Summary

| # | Area | Ask (translated) | Today | Verdict | Priority | Size |
|---|---|---|---|---|---|---|
| 1 | Attendance | Time in/out must be **AM and PM** (AM in/out, PM in/out). Cut-offs configurable by admin | One `timeIn` / `timeOut` per intern-day. One cut-off pair, global + per-school | **Needed.** Schema + punch logic + DTR + settings | P0 | L |
| 2 | DTR display | "42 absences, but it still says *early warning*" (screenshots 1 & 2) | Banner only knows early-warning. `dropEligible` is computed but **no UI reads it**. 42 is also inflated: Sat/Sun count as absent | **Bug + gap.** Fix banner, add school-day calendar | P0 | S + M |
| 3 | Accounts → Supervisor | Supervisors/faculty self-register, admin approves (like CTs). Admin assigns schools. **One supervisor can have several schools** | Admin creates supervisors. `SupervisorProfile.schoolId` is `@unique` → strictly 1 supervisor ↔ 1 school | **Needed.** New approval flow + many-to-many schools | P0 | L |
| 4 | Accounts → Intern | Interns self-register (name, section dropdown, **verified email**, contact, school). The school's supervisor confirms enrollment | Only admin/supervisor can create interns. No self-registration, no sections, no email sending at all | **Needed.** Largest item: sections, email verification, enrollment queue | P0 | XL |
| 5 | CT → Assign session | Add a **notes** field (e.g. "Submit your lesson plan by …"), visible to the intern | `assignSession` has no notes field (screenshot 3) | **Needed** | P1 | S |
| 6 | CT → Lesson plan | CT must **approve** the lesson plan. Intern then sees "ready for demo". **No evaluation until approved** | No approval step. A CT can evaluate any assigned session | **Needed.** New state + guard in `submitEvaluation` | P0 | M |
| 7 | Documents | Per session only the **lesson plan** counts, shown as **Submitted / Not submitted**, not `0/2` (circled in screenshot 4) | Each session expects Lesson Plan + Progress Report and shows `Documents: n/2` | **Needed.** Remove the progress report from sessions | P1 | S |
| 8 | Progress report | Submitted by the intern **to the school**; supervisor + admin view it; **admin configures how often** (weekly or a date range) | Tied to a session. No schedule, no config, CT can also see it | **Needed.** New period-based model | P1 | M |
| 9 | DTR | Supervisor/admin can mark a date **"No Class or Duty"** so it is not an absence. The intern's time in/out buttons lock for that date | Only per-intern **Excused**, which needs a reason and only fixes an *absent* day. No lock | **Needed** | P0 | M |
| 10 | After semester | Admin can **lock the accounts** of other users | Only soft-delete (`INACTIVE` + `deletedAt`), one account at a time. No lock, no bulk action | **Needed** | P1 | M |

Related findings from the same read (not in the document, fix in the same pass):

| # | Where | Finding |
|---|---|---|
| A | Weekends / holidays | `materializeAttendanceRecords` treats **every calendar day Mon–Sun** as a duty day. The screenshots show Sun 11-08 and Sat 11-07 as *Absent*. The code already flags this as an unresolved question. 42 absences + 1 incomplete = 43 days = every calendar day of the shifting so far. Item 9 alone does not fix this |
| B | JWT staleness | The session JWT carries `supervisorSchoolId`. After an admin changes a supervisor's schools (item 3) or locks an account (item 10), the **existing token keeps the old scope** until it expires. Both items need per-request re-validation (see §4) |
| C | Admin drawer | Intern DTR tab in the admin drawer, supervisor page and intern page share one banner logic, so fixing it once fixes all three |

---

## 2. Detailed plan per item

### 1. AM / PM time in and out: P0

**Today.** `AttendanceRecord` is unique on `(internId, date)` with one `timeIn` / `timeOut`. `CheckInConfig` and `School` hold one `timeInCutoff` and one `timeOutStart`.
`resolveEffectiveCheckInConfig` already cascades school → global field by field, so the cascade stays and only grows more fields.

**Design.** Keep one `AttendanceRecord` per intern-day (excuse, no-duty, thresholds and "present today" all stay day-level) and add the PM punches **to the same row**. The alternative (one row per period) was rejected: it breaks the unique key and every reader that counts days.

**Schema**
- `AttendanceRecord`: existing `timeIn/timeOut/...Lat/...Lng/...Source` become the **AM** punch (renamed `amTimeIn`, `amTimeOut`, … in code, `@map` keeps the DB column names). Add `pmTimeIn`, `pmTimeOut`, `pmTimeInLat/Lng`, `pmTimeOutLat/Lng`, `pmTimeInSource`, `pmTimeOutSource`.
- `CheckInConfig` and `School` (school fields nullable = inherit): `amTimeInCutoff`, `amTimeOutStart`, `pmTimeInCutoff`, `pmTimeOutStart`, plus one boundary `pmWindowOpensAt` (see Q1). Existing `timeInCutoff` → `amTimeInCutoff`, existing `timeOutStart` → `pmTimeOutStart` (the 15:00 default is an end-of-day value). New defaults: AM out 12:00, PM in 13:00, boundary 12:00.
- Existing rows are test data (see Q2). They stay as the AM punch; no row is deleted or rewritten.

**Backend**
- `lib/check-in-config.ts`: `EffectiveCheckInConfig` returns the four values + sources. Still the single resolver.
- `lib/attendance-status.ts`: one function derives a **per-period status** and one derives the **day status** from the two (rule in Q3). Both stay pure and are used at write time and at read time.
- `attendance-service.ts`: `timeIn` / `timeOut` resolve the period **server-side** from the existing punches and the clock (AM in → AM out → PM in → PM out). The client never sends a period, the same rule as the geofence flag. Each punch keeps the server-side haversine check and its own audit entry (`ATTENDANCE_TIME_IN` / `_OUT` with `period` in the diff).
- `dtr-service.ts`, `report-service.ts`, `alert-service.ts`, `intern-service.ts`: read the day status through the shared function. They already go through `materializeAttendanceRecords`, so the change is concentrated there.
- `excuse-service.ts`: unchanged semantics (excuse is day-level, fills both periods).
- `validation/config.ts`, `validation/school.ts`: the four time fields, `HH:mm`, with the rule "time-out start must be after the same period's time-in cut-off".

**UI**
- `attendance-punch-card.tsx`: shows two lines, **AM** and **PM**, each with its own In/Out state; only the next valid button is enabled; the card explains why the next one is not available yet ("PM Time In opens at 12:00").
- `dtr-table.tsx`: columns `AM In · AM Out · PM In · PM Out · Status`. On the 390px mobile width (screenshot 2 shows the table already wrapping dates) use a two-line cell: `7:25 – 12:01` / `1:00 – 4:30`.
- Admin Settings → Check-in tab and Schools → Overview → Check-in override: two groups (Morning, Afternoon).
- Audit formatter: add the new field labels.

### 2. "42 absences but still early warning": P0 (bug), plus school-day calendar

**Cause.** Both DTR views (`m/intern/attendance/page.tsx`, `intern-dtr-tab.tsx`) render one banner when `earlyWarningExceeded` is true and say "Early warning". `getDtr` already returns `dropEligible` (absences > limit) but nothing reads it. With the drop limit at 5 in the tester's config, 42 absences is far above it, so the correct message is **drop-eligible**. Also `approachingDropLimit` hard-codes `- 3`, which breaks the "no hardcoded thresholds" rule.

**Fix**
- `getDtr` returns one `level`: `NONE | EARLY_WARNING | DROP_ELIGIBLE` (highest rule met, from `FlaggingRuleConfig`), plus the numbers. Remove `approachingDropLimit`.
- One shared `<AttendanceAlertBanner />` used by the intern page, the supervisor tab and the admin drawer. Drop-eligible uses the destructive color and wording ("42 absences. This is above the drop limit of 5 days. Please see your supervisor."). The intern copy and the supervisor copy differ (second person vs. third person).
- Intern banner no longer says "speak with your supervisor" for early warning only; the text follows the level.
- **School-day calendar (finding A).** Add `Shifting.dutyWeekdays Int[]` (default Mon–Fri) so Sat/Sun are never absences, never counted, and show as "No duty" rows. Items 9 and this share one rule: **a day is "expected" only if it is a duty weekday and not a no-duty date.** Applied in `materializeAttendanceRecords`, which every counter already uses. Configurable in Semesters → Configure Shifting. Needs confirmation (Q4).

### 3. Supervisor self-registration, approval and multi-school: P0

**Today.** Admin creates supervisors only (`createSupervisor`). `SupervisorProfile.schoolId` is `@unique`, so one supervisor = one school. `scopeToRole`, the JWT (`supervisorSchoolId`), `createIntern`, alert notifications and the school-assign UI all assume a single id (24 references in 6 files).

**Schema**
- New join table `SupervisorSchool { supervisorProfileId, schoolId, assignedAt, assignedByUserId }`, unique on `(supervisorProfileId, schoolId)`. Replaces `SupervisorProfile.schoolId`. **Is a school allowed to have more than one supervisor?** Today one school has one supervisor. Keep it at one supervisor per school (unique on `schoolId`) unless Q5 says otherwise; this avoids two supervisors confirming the same intern.
- Backfill from the existing `schoolId` column, then drop the column. `SchoolSupervisorHistory` already logs reassignment and keeps working.
- User gets `PENDING` for self-registered supervisors (the enum already exists and the CT flow uses it).

**Backend**
- `SessionUser.supervisorSchoolId` → `supervisorSchoolIds: string[]`. `scopeToRole` and `assertSchoolInScope` switch from `=== id` to `in: ids`. This is the **only** place scope is built, so the blast radius is `scope.ts` + the 6 files that read the old field.
- Rename and generalize `ct-registration-service` / `ct-approval-service` into a shared `registration-approval` flow: register (PENDING), notify admins, approve / reject, audit (`SUPERVISOR_REGISTER`, `SUPERVISOR_APPROVE`, `SUPERVISOR_REJECT`).
- Registration fields: full name, email, phone, **department**, password (the CT form already has the rest). School is **not** chosen at registration; the admin assigns it (that is the ask).
- `school-service.assignSupervisor` → `setSupervisorSchools(actor, supervisorUserId, schoolIds[])` with history rows for each change.
- A pending supervisor with no school gets `__none__` scope (already the behavior for a null school), so they see nothing until assigned.
- `createIntern` for a supervisor with several schools: the school is **required in the request and must be in `supervisorSchoolIds`**, never trusted from the client without that check.
- Alert notifications (`notifyRaisedAlerts`) match supervisors through the join table.

**UI**
- Public: "Register as Supervisor" page next to the CT one; the mobile login link becomes "New here? Register as Cooperating Teacher / Supervisor".
- Admin → Accounts → Supervisors: **Pending Approval** section (Approve / Reject) like the CT tab, then a multi-select school picker on the supervisor form and on the School → Overview supervisor card.
- Supervisor mobile app: a **school switcher** in the header (All schools / one school) that filters Interns, Alerts and DTR. The scope still comes from the session; the switcher only narrows the view.

### 4. Intern self-registration with verified email and supervisor confirmation: P0, largest

**Today.** No self-registration exists. `InternProfile` requires `schoolNumber`, `course`, `yearLevel`, which the new form does not collect. There is **no email-sending code or provider** in the project (no Resend / SMTP / nodemailer in `package.json` or `.env.example`).

**Flow**
`Register → verify email → PENDING enrollment → supervisor confirms → ENROLLED (can sign in)`

**Schema**
- `Section { id, name, course, yearLevel, isActive }`, managed by admin. Section drives `course` / `yearLevel` for new interns so the form does not ask for them again (Q6).
- `InternProfile`: add `sectionId`, `enrollmentStatus` (`PENDING | ENROLLED | REJECTED`), `enrolledAt`, `enrolledByUserId`, `rejectionReason`. Make `schoolNumber` optional (Q6) with the unique constraint kept for non-null values.
- `User.emailVerifiedAt`. New `EmailVerification { userId, codeHash, expiresAt, attempts, usedAt }`. Store a **hash** of a 6-digit code, 15-minute expiry, max 5 attempts, resend limited to 1 per 60 s. Never store the code in plain text.
- `NotificationType`: `INTERN_ENROLLMENT_PENDING`, `INTERN_ENROLLMENT_APPROVED`, `INTERN_ENROLLMENT_REJECTED`.

**Backend**
- `intern-registration-service.ts` (public, like `registerCooperatingTeacher`): Zod per-field errors, duplicate-email check, creates `User(PENDING)` + `InternProfile(PENDING)`, sends the code. Public endpoints get a basic rate limit and a honeypot field because they are unauthenticated writes.
- `verifyEmail(code)` → sets `emailVerifiedAt`, then notifies the school's supervisor(s). If the school has **no supervisor yet**, the request goes to admins instead, so a registration can never be stuck.
- `enrollment-service.ts`: `listPendingEnrollments(actor)` (scoped by `scopeToRole`), `approveEnrollment`, `rejectEnrollment(reason)`. Supervisor can only act on interns in `supervisorSchoolIds`; admin can act on any. Both audited (`INTERN_REGISTER`, `INTERN_EMAIL_VERIFY`, `INTERN_ENROLLMENT_APPROVE/REJECT`).
- `auth.ts`: unverified email → "Verify your email first"; PENDING enrollment → "Waiting for your supervisor's confirmation"; REJECTED → show the reason. Same pattern as `PendingApprovalError`.
- Interns added by admin/supervisor (`createIntern`) are created `ENROLLED` and email-verified, so existing behavior is unchanged.
- Email sending: one `sendEmail()` helper behind an interface so the provider can change. **Needs a decision (Q7).**
- Public `GET /api/public/sections` (active sections only, no other fields).

**UI**
- Public registration page `/m/register/intern`: name, section dropdown, email, contact (same PH mobile rule as CTs), school dropdown, password. A second step for the code.
- Supervisor app: **Enrollment requests** list (name, section, email, contact) with Confirm / Reject. A badge count on the Interns tab. Admin gets the same list under Accounts → Interns → Pending.
- Admin Settings: **Sections** tab (add, rename, deactivate). Deactivating never deletes a section that interns use.

### 5. Notes on session assignment: P1

- `TeachingSession.notes String?` (max 1000) and optional `lessonPlanDueDate Date?`. A structured due date lets the app show "due in 2 days / overdue" and later raise an alert; free text alone cannot.
- `assignSessionSchema`, `assignSession` (notes go in the audit diff and the `SESSION_ASSIGNED` notification body), and the Assign Session form (screenshot 3) get a **Notes** textarea and a **Lesson plan due** date.
- Intern Sessions list and Home show the note and due date on the session card. CT session list shows them too.

### 6. Lesson plan approval gate: P0

**Today.** Any assigned session can be evaluated immediately. Lesson plan upload is a `SessionDocument` row with no review state.

**Schema** (on `TeachingSession`, not on the document, because the document is superseded when replaced)
- `lessonPlanStatus`: `NOT_SUBMITTED | SUBMITTED | APPROVED | RETURNED`, `lessonPlanApprovedAt`, `lessonPlanApprovedByUserId`, `lessonPlanReturnNote`.
- `NotificationType`: `LESSON_PLAN_SUBMITTED` (to the CT), `LESSON_PLAN_APPROVED` and `LESSON_PLAN_RETURNED` (to the intern).

**Backend**
- `uploadSessionDocument` (lesson plan): sets `SUBMITTED` and notifies the CT. Replace is **blocked once `APPROVED`** (the CT must return it first); this keeps an approved plan from changing silently, consistent with the immutability rule for evaluations.
- New `approveLessonPlan(actor, sessionId)` and `returnLessonPlan(actor, sessionId, note)`. CT only, scoped to their own sessions via `scopeToRole.session`. Audit: `LESSON_PLAN_APPROVE`, `LESSON_PLAN_RETURN`.
- **Guard in `submitEvaluation`:** reject unless `lessonPlanStatus === "APPROVED"`, with a clear message. Server-side, not only a disabled button.
- Backfill: sessions that already have an evaluation → `APPROVED` (so history is not contradicted). Open sessions with an uploaded lesson plan → `SUBMITTED`; others → `NOT_SUBMITTED`.
- Q8: does the gate apply to the Final Demo as well? Default: yes, every session type.

**UI**
- CT sessions list: lesson plan badge, **View** (signed URL, scope already exists), **Approve** / **Return**. The **Evaluate** button stays disabled with the reason until approved.
- Intern Sessions list: status chip; **"Approved — ready for demo"** when approved; the return note when returned.

### 7. Documents: lesson plan only, Submitted / Not submitted: P1

- Session card (`session-list.tsx`) replaces `Documents: n/2` with a `Lesson plan: Submitted / Not submitted` badge (from item 6's status, plus Approved).
- Intern Documents page: per session only the **Lesson Plan** upload. The Progress Report slot there moves to item 8.
- `intern-documents-tab.tsx` (admin drawer / supervisor page): same.
- `report-service.ts` / `per-student-report.tsx` / reports CSV: remove `missingProgressReports` from the per-session counts; add a progress-report compliance count from item 8. Rename the column so exports are not misread.
- Existing `PROGRESS_REPORT` `SessionDocument` rows are **kept** (history; the enum value stays) and remain viewable in the admin/supervisor drawer as "Legacy"; no new ones are accepted.

### 8. Progress report: periodic, to the school, admin-configured: P1

**Schema**
- `ProgressReportPeriod { id, shiftingId, label, startDate, endDate, dueDate }`. A table (not one interval number) covers both "every week" and "a specific range". Admin can **Generate weekly periods** for a shifting, then edit or add custom ranges.
- `ProgressReportSubmission { id, internId, shiftingId, periodId, storageKey, originalFilename, mimeType, sizeBytes, uploadedAt, supersededBy… }`, unique on `(internId, periodId)`, same upload rules and storage path pattern as other documents (`<internId>/<shiftingId>/progress/<periodId>/…`).

**Backend**
- `scopeToRole.progressReport`: ADMIN all, SUPERVISOR their schools, STUDENT_INTERN own, **COOPERATING_TEACHER `__none__`** (the ask says supervisor and admin view it).
- `progress-report-service.ts`: `listPeriods`, `configurePeriods` (admin, audited `PROGRESS_PERIODS_CONFIGURE`), `uploadProgressReport` (intern, audited `PROGRESS_REPORT_UPLOAD/REPLACE`), `listSubmissions`, signed URL.
- Status per intern per period is **computed**: `SUBMITTED | DUE | OVERDUE | UPCOMING` from `dueDate` and Manila today.
- Optional: an alert type `PROGRESS_REPORT_OVERDUE` using the existing rule engine, off until Q9 says it is wanted.

**UI**
- Admin: Semesters → Configure Shifting gets a **Progress reports** section (Weekly / Custom ranges, generated list).
- Intern Documents: a **Progress Reports** section listing each period with its state and upload.
- Supervisor intern detail and admin intern drawer: a **Progress Reports** list with View; reports include the period compliance count.

### 9. "No Class or Duty" days: P0

**Today.** Only `EXCUSED` exists: per intern, needs a reason, and the supervisor tab only lists the first 5 absences. It does not stop the intern from punching, and a school holiday would need one excuse per intern per day.

**Schema**
- `NonDutyDay { id, shiftingId, date, schoolId?, internId?, reason, createdByUserId, createdAt }`. Scope of one row: whole school (`schoolId`), one intern (`internId`), or **all schools** (both null, admin only; e.g. a national holiday). Unique per scope + date.
- `AttendanceStatus` gets `NO_DUTY`. It is **derived**, never typed in: a day with no punch and a matching `NonDutyDay` reads as `NO_DUTY`. A day where the intern already punched keeps its normal status (their punch is real).

**Backend**
- `attendance-calendar.ts`: one helper `isExpectedDay(shifting, date, internScope)` combining item 2's duty weekdays and `NonDutyDay` (CLAUDE.md: one shared helper, no per-feature re-implementation). Used by `materializeAttendanceRecords`, thresholds, reports, the alert engine and the attendance rate.
- `attendance-service`: **time in/out are rejected server-side** on a no-duty day ("No class or duty today: <reason>"). Locking the button in the UI is a convenience only.
- `no-duty-service`: `markNoDuty(actor, {date | range, scope, reason})` and `unmarkNoDuty`. SUPERVISOR limited to `supervisorSchoolIds`; ADMIN any. Reason required (it is shown to the intern). Audit `NO_DUTY_MARK` / `NO_DUTY_UNMARK`. Re-run `refreshAlertsForIntern` for affected interns so stale absence alerts update.
- `getTodayAttendance` returns `noDuty: { reason } | null`.

**UI**
- Supervisor intern DTR tab and a school-level screen: **Mark No Class / Duty** (single date or range, whole school or one intern, reason). Admin gets the same from Schools → [School] and from Accounts → intern drawer, plus "all schools".
- Intern punch card: when `noDuty` is set, both buttons are **disabled** with the message and the reason. DTR row shows "No duty" (neutral color).

### 10. Lock accounts after the semester: P1

**Today.** `UserStatus` is `PENDING | ACTIVE | INACTIVE`. `INACTIVE` + `deletedAt` means *deleted* (soft delete), done one account at a time, and `authorize()` returns null for it.

**Schema.** `UserStatus` gets `LOCKED`. `User`: `lockedAt`, `lockedByUserId`, `lockReason`. Distinct from delete so a lock is reversible and history stays intact.

**Backend**
- `account-lock-service.ts`: `lockAccounts(actor, { userIds | { role, schoolId, semesterId } , reason })` and `unlockAccounts`. ADMIN only. **Cannot lock any ADMIN account** (including the actor's own). Skips `PENDING`.
- Audit: one entry per user (`ACCOUNT_LOCK` / `ACCOUNT_UNLOCK`, reason in the diff) so the per-account history is complete. A bulk run also writes one summary entry with the count.
- `auth.ts`: `LOCKED` → "Your account is locked by the CTE office" (after the password check, like pending).
- **Enforcement for already-signed-in users (finding B).** `requireSession()` does one primary-key lookup of `User.status` and throws `UnauthorizedError("account_locked")` for non-`ACTIVE` users; the `/m/*` layouts treat that as sign-out. The edge `proxy.ts` cannot touch the DB, so it is not the enforcement point. One indexed lookup per request is acceptable at this scale. The same lookup refreshes `supervisorSchoolIds` for item 3.

**UI**
- Admin → Semesters: on a completed semester or shifting, a **Lock accounts** action with a preview ("Will lock 128 interns, 14 CTs, 4 supervisors"), options by role and by school, and a reason. A matching **Unlock** action.
- Accounts tabs: a "Locked" badge and per-account Lock / Unlock; a "Locked" filter.
- Locking does not delete or alter any record; prior-shifting data stays queryable (CLAUDE.md).

---

## 3. Data model changes (one SQL upgrade script)

The project applies schema changes through `schema.sql` + dated scripts in `prisma/sql/` (run in the Supabase SQL editor), not `prisma migrate`. Follow that: `prisma/sql/2026-11-xx_office-feedback.sql`, idempotent (`IF NOT EXISTS`), `ALTER TYPE … ADD VALUE` outside the transaction block (as the existing scripts do), RLS enabled on every new table, then update `schema.prisma` and `schema.sql`, then `prisma generate`.

| Change | Items |
|---|---|
| `AttendanceRecord`: PM punch columns | 1 |
| `CheckInConfig`, `School`: AM/PM cut-offs + `pmWindowOpensAt` | 1 |
| `Shifting.dutyWeekdays` | 2, 9 |
| `SupervisorSchool` join table, drop `SupervisorProfile.schoolId` | 3 |
| `Section`, `InternProfile` enrollment fields + `sectionId`, `User.emailVerifiedAt`, `EmailVerification` | 4 |
| `TeachingSession.notes`, `lessonPlanDueDate`, lesson-plan status fields | 5, 6 |
| `ProgressReportPeriod`, `ProgressReportSubmission` | 8 |
| `NonDutyDay`, `AttendanceStatus.NO_DUTY` | 9 |
| `UserStatus.LOCKED`, lock columns | 10 |
| New `NotificationType` values | 4, 6 |

Backfills: PM columns null; `pmWindowOpensAt` default; join table from existing `schoolId`; existing interns → `ENROLLED`, email verified; existing sessions' lesson-plan status as in item 6.

## 4. Cross-cutting rules checked

- **Scope.** New tables each get a `scopeToRole` fragment (`progressReport`, `nonDutyDay`, enrollment via `intern`). Nothing takes `internId`, `schoolId` or `role` from the client without a scope check.
- **Audit.** New actions: `ATTENDANCE_TIME_IN/OUT` (with period), `SUPERVISOR_REGISTER/APPROVE/REJECT`, `INTERN_REGISTER`, `INTERN_EMAIL_VERIFY`, `INTERN_ENROLLMENT_APPROVE/REJECT`, `SECTION_CREATE/UPDATE`, `LESSON_PLAN_APPROVE/RETURN`, `PROGRESS_PERIODS_CONFIGURE`, `PROGRESS_REPORT_UPLOAD/REPLACE`, `NO_DUTY_MARK/UNMARK`, `ACCOUNT_LOCK/UNLOCK`, `SUPERVISOR_SCHOOLS_SET`. Each is written inside its service and added to `audit-format.ts`.
- **Time.** All new date logic goes through `timezone.ts`; AM/PM cut-offs are Manila wall-clock.
- **Config, not constants.** AM/PM times, duty weekdays, progress periods and the lock are data. The `- 3` in `approachingDropLimit` is removed.
- **Offline.** All new writes (punches, approvals, uploads, registration) require a live connection and fail loudly.
- **Immutability.** An approved lesson plan cannot be replaced silently; evaluations stay insert-only.
- **No final grades.** Unchanged; the per-student report keeps its "reference summary" label.

## 5. Suggested order

| Phase | Content | Why this order |
|---|---|---|
| 1 | Item 2 banner fix + duty-weekday calendar; item 9 no-duty days | Small, fixes what testers can already see in the screenshots, and creates the shared `isExpectedDay` helper that item 1 builds on |
| 2 | Item 1 AM/PM attendance | Touches the most readers; do it once the calendar helper exists |
| 3 | Items 5, 6, 7: notes, lesson-plan approval, documents cleanup | One area (sessions/documents); item 6 adds the evaluation guard |
| 4 | Item 8 progress-report periods | Depends on the documents cleanup |
| 5 | Item 3 multi-school supervisors + supervisor registration | Changes the session shape and scope for every supervisor query; do it before item 4 so enrollment uses the final scope |
| 6 | Item 4 intern registration, sections, email verification | Largest; needs the email decision (Q7) and the supervisor scope from phase 5 |
| 7 | Item 10 lock accounts + per-request status check | Independent; the per-request lookup also benefits phase 5 |

Each phase ends with `npm run build` and `npm run lint`, then a read-only check against the dev server. Anything that writes to the live database or storage (a real punch, upload, registration or lock) is **not** exercised without asking first, as in plan 2.

## 6. Questions before implementation

| # | Question | Recommendation |
|---|---|---|
| Q1 | What decides whether a punch is AM or PM? Is there a fixed lunch boundary? | Resolve it on the server from the day's existing punches plus one config time `pmWindowOpensAt` (default 12:00). Default AM: 7:30 cut-off, out from 12:00. PM: 1:00 cut-off, out from 4:00 |
| Q2 | Is everything in the live database test data? | Assumed yes. Old single-punch rows become the AM punch. If real data exists, we need a cutover date instead |
| Q3 | How should one missed half-day count toward the thresholds (3 / 3 / 12 are in **days**)? | (c) A day is **Absent** only if both periods are missed; a single missed or open period makes it **Incomplete**, shown per period. Keeps thresholds as whole days. Alternatives: half-day = 0.5 absence, or any missed period = full absence |
| Q4 | Are Saturdays and Sundays never duty days? Is a per-school work week needed? | Default Mon–Fri on the shifting, editable. Holidays via item 9 |
| Q5 | Can a school have more than one supervisor? | No (keep one per school). A supervisor can have many schools |
| Q6 | Does a section imply course and year level? Is the student ID still needed? | Yes, section = course + year level. Make the student ID optional at registration; supervisor/admin can fill it in |
| Q7 | Email provider for verification codes? (needs an API key or SMTP login) | Resend or the institution's SMTP; I need the choice and the credentials from you. Without a provider, item 4 can be built up to the point of sending and the code logged in dev only |
| Q8 | Does the lesson-plan approval gate apply to the Final Demo too? Can a CT return a plan for revision? | Yes to both. Without a Return action, a CT who finds a problem has no way to ask for a fix |
| Q9 | Should a missing progress report raise an alert like absences? | Not yet; just show Submitted / Overdue |
| Q10 | Should locked users be blocked completely, or read-only? | Blocked from signing in; unlock in bulk when the new semester starts |
| Q11 | Should the CT see an intern's progress report? | No, per the request (supervisor and admin only) |

## 7. Risks

- **Scope refactor (item 3)** touches every supervisor query. Keep it to `scope.ts` + the 6 files found, and test with a two-school supervisor and a one-school supervisor.
- **JWT staleness (finding B).** Without the per-request lookup, a locked or re-assigned user keeps the old access until the token expires.
- **Public writes (items 3, 4).** Unauthenticated registration needs a rate limit and a honeypot, and verification codes must be hashed and attempt-limited.
- **AM/PM readers.** Reports, alerts, dashboards and CSVs all read attendance; a missed reader would count a half-day wrong. Mitigation: one shared day-status function and a grep for `timeIn` / `timeOut` before finishing.
- **Backfills** are one-way for the status fields. Take a Supabase backup before running the SQL script.
