# Product Requirements Document

## CTE PracTrack — Practice Teaching Monitoring System with At-Risk Detection

Status: **Draft — pending approval**
Owner: University of Antique — College of Teacher Education (system built by BSCS thesis group, College of Computing and Information Sciences)
Prepared: September 11, 2026

---

## 1. Purpose & Background

Practice teaching is the culminating field experience of the CTE curriculum. Interns are deployed across secondary and elementary partner schools in Antique and are monitored by the CTE office, school supervisors, and cooperating teachers (CTs) for attendance, teaching sessions, submitted documents, and performance.

Today that monitoring is entirely paper-based, and it fails in four specific ways:

- **Attendance is unverified.** Interns log attendance in a personal logbook and DTR, verified weekly by a student-assigned leader — a peer, not an independent source. The office has had interns absent from their assigned school for over a month before it found out.
- **Evaluation arrives too late to act on.** CTs rate each required session on printed sheets submitted only after the shifting ends, so the office cannot gauge progress until the term is nearly over.
- **Supervision is thinner than intended.** Supervisors are expected to visit assigned schools every two weeks but typically manage monthly visits because of competing teaching loads.
- **Records must be manually consolidated** before anyone can assess an intern's standing, which delays intervention past the point where it helps.

CTE PracTrack replaces the paper instruments with GPS-geofenced attendance verification, in-app session assignment and evaluation, document submission tracking, rule-based at-risk flagging with supervisor resolution, and consolidated reporting.

## 2. Goals

- Attendance reflects verified physical presence at the assigned partner school, not peer attestation.
- A supervisor can see an intern's attendance, session pace, and document compliance on the day it happens, without a site visit.
- CTs record evaluations at the moment of the session, eliminating end-of-shifting reconciliation of printed sheets.
- At-risk interns surface automatically against configurable rules, early enough for intervention to matter, with a recorded resolution for each flag.
- The CTE office holds one verifiable record per intern across all partner schools, exportable by school or system-wide.
- The system measurably satisfies ISO 25010 functional suitability, performance efficiency, and usability under a structured questionnaire administered to all four user groups.

## 3. Non-Goals (v1)

- **Final grade computation.** The system records evaluations and compliance; the CTE computes final grades under its existing criteria.
- **Offline operation.** Time-in/out, session assignment, evaluation submission, and uploads require connectivity.
- **Native app store distribution.** The mobile surface is an installable PWA, not a published iOS/Android binary.
- **Automated anti-spoofing beyond geofencing** (mock-location detection, biometric or face verification, device attestation). See §10.
- **Scheduling/timetabling** of teaching sessions beyond the CT assigning a dated session.
- **Messaging/chat between roles.** Notifications are one-way system alerts.
- **Payroll, honoraria, or any financial tracking.**
- **Student Information System integration.** Intern accounts are created in-system by supervisors.

## 4. Users & Roles

| Role | Surface | Scope | Core actions |
|---|---|---|---|
| **Administrator** (CTE office) | Web dashboard | All schools, all data | Manage schools, accounts, semesters/shiftings, flagging + check-in config; approve CT registrations; view/export all reports |
| **School Supervisor** (CTE personnel) | Mobile PWA | Their assigned school only | Create intern accounts for their school, monitor attendance/sessions/documents, mark excused absences, resolve alerts |
| **Cooperating Teacher** | Mobile PWA | Interns assigned to them | Self-register (pending admin approval), assign teaching sessions, submit evaluations, view intern session documents |
| **Student Intern** | Mobile PWA | Their own records only | Geofenced time-in/out, view DTR and sessions, upload lesson plans / progress reports / end-of-term submissions, view evaluation scores |

Intern accounts are created by the supervisor of their assigned school (not self-registered). Supervisor accounts are created by the admin. CT accounts are self-registered and activated by admin approval. There is no public self-registration for interns or supervisors.

## 5. Academic period model

Everything in the system is scoped to a **shifting**, and this constrains nearly every module:

- **Academic Year** → **Semester** (name, overall start/end) → exactly **two Shiftings** per semester: *First Shifting* and *Second Shifting*.
- Each Shifting carries: start date, end date, `requiredTeachingSessions` (mockup default 15), `requiredFinalDemos` (default 1), and a status of Upcoming / Active / Completed.
- Exactly one Shifting is Active system-wide at a time. Activating a Shifting marks the previously active one Completed.
- Activation resets *displayed counters* (session progress, absence counts, compliance status) because those are computed per-shifting. It never mutates or deletes historical rows — completed shiftings remain viewable as archives by all roles.
- Attendance, sessions, evaluations, documents, and alerts all carry a `shiftingId`. Any report, dashboard number, or progress bar is meaningless without it.
- Past academic years are collapsed into an "Archived Academic Years" view, read-only.

## 6. Functional Requirements

### 6.1 Authentication & account provisioning

- Admin signs in on the web at a dedicated admin login (institutional email + password).
- Mobile login presents a role selector (Student Intern / Supervisor / Cooperating Teacher) and email + password.
- CT registration form: full name, email, phone number, school (select from registered partner schools) → creates a `PENDING` CT account visible to admin under Accounts → Cooperating Teachers.
- Admin approves or deletes a pending CT; only `ACTIVE` CTs can sign in.
- Interns and supervisors are provisioned with an initial password by their creator (supervisor / admin respectively) and can change it from Profile → Change Password.
- Password reset is handled out-of-band ("Contact the CTE office" / "Contact IT support") — no self-service reset in v1 (see §10).
- Sessions expire after inactivity; role and scope are read from the session on every request, never from the client.

### 6.2 Partner school management (Admin)

- List schools grouped by type (Secondary / Elementary) showing: name, municipality, type, intern count, assigned supervisor (or "Not yet assigned").
- Add/edit school: name, type, municipality, location (map search or manual latitude/longitude), geofence radius in meters (mockup default 75 m, adjustable per school).
- School detail — **Overview**: intern count, present today, flagged count; supervisor assignment/change; registered coordinates + geofence radius; effective check-in settings with an indicator when they come from the global default vs a school override.
- School detail — **Interns**: table of school ID, name, course, sessions x/N, absences, with View Profile and Unassign.
- School detail — **Resolved Alerts**: chronological resolution records (date, intern, flag, resolving supervisor, note).
- A school may have at most one assigned supervisor at a time; reassignment is logged.
- Deleting a school with assigned interns is blocked; it must be emptied first.

### 6.3 Account management (Admin)

- Three tabs — Interns, Supervisors, Cooperating Teachers — with search by name/ID and filter by school.
- **Interns**: view, edit (name, school ID, course, email, school — for corrections only), delete. Intern detail drawer with four tabs: DTR, Sessions, Evaluations (per-criterion breakdown + CT comments), Documents (per-session files with view/download).
- **Supervisors**: add/edit/delete with name, institutional email, department, school assigned.
- **Cooperating Teachers**: Pending Approval table (name, email, phone, school, registered date → Approve / Delete) and Active table (name, email, school, assigned interns → View / Delete). CT detail shows each assigned intern with session progress and absence count.
- Deleting an account with historical records soft-deletes/deactivates rather than cascading — records must survive for audit.

### 6.4 Intern management (Supervisor)

- Intern list for the supervisor's school with filters: All / Flagged / Behind, plus search.
- Add Intern: full name, school ID, institutional email, course, year level, initial password; school is fixed to the supervisor's assigned school and is not editable.
- Intern detail with four tabs: DTR, Sessions, Documents, Alerts.
- DTR tab: per-shifting record with Present/Absent/Incomplete/Late counts, threshold warning banner, Print/Export DTR, and per-row **Mark as Excused** requiring a reason/reference (e.g. medical certificate presented).
- Sessions tab: every session with status and, for evaluated sessions, the full per-criterion breakdown and CT signature line.

### 6.5 Geofenced attendance (Intern)

- Home screen shows the active shifting, days remaining, session progress, final-demo status, and today's attendance state.
- **Time In**: captures device coordinates, compares server-side against the assigned school's geofence; on success records the timestamp and computes `PRESENT` or `LATE` against the effective Time In cut-off; on failure returns a clear out-of-range message and records nothing.
- **Time Out**: same geofence check; allowed only after the configured Time Out start.
- A day with a time-in and no time-out is `INCOMPLETE`; a day within the shifting with neither is `ABSENT`.
- Attendance screen: shifting tabs, summary counts, threshold warning banner, full DTR table (date, day, time in, time out, status), Print/Export DTR.
- The intern cannot create, edit, or backdate an attendance row by any means; the only correction path is a supervisor excuse.

### 6.6 Teaching sessions & evaluation (CT)

- CT home: interns assigned, awaiting evaluation, evaluated this shifting, and a list of sessions awaiting evaluation.
- **Assign Session**: student (from assigned interns), date, subject, grade & section, topic, session type (Regular Teaching / Final Demo) → session created with status `ASSIGNED`, notification pushed to the intern.
- **Evaluate**: rating form over six weighted criteria, each a list of 1–5 items (5 = Very Good … 1 = Very Poor), plus free-text *Commendable observations* and *Areas for improvement*.
  - Lesson Planning — 15% (7 items)
  - Content — 20%
  - Teaching Methods — 20%
  - Classroom Management — 15%
  - Questioning Skills — 15%
  - Teacher's Personality — 15% (6 items)
- Overall rating = Σ (criterion mean ÷ 5 × weight), rendered as a percentage; computed server-side and shown live as items are rated.
- On submit: status → `EVALUATED`, score and CT identity/timestamp stamped ("Electronically signed by … "), intern notified. Submitted evaluations are immutable.
- Criteria, weights, and item wording are seeded config, editable without a code change.
- A session cannot be evaluated before its date, and a Final Demo counts against `requiredFinalDemos`, not `requiredTeachingSessions`.

### 6.7 Internship documents

- Per session, the intern uploads a **Lesson Plan** and a **Progress Report**; the UI shows per-session completion state (complete / missing one / missing both).
- **End-of-Term Submissions** per shifting: Narrative Report and Teaching Portfolio, each with a due date and uploaded/not-uploaded state.
- CT and supervisor can view/download an intern's documents; admin can view all. Only the intern uploads.
- Re-upload replaces the current file and is logged; prior versions are retained in storage.
- Accepted types and size cap enforced server-side (see §10).

### 6.8 At-risk detection & alerts

- Rules evaluated continuously against the active shifting, all configurable in Settings → Flagging Rules:
  - **Absence early warning** — total absences ≥ threshold (default 3)
  - **Consecutive absences** — consecutive absent days ≥ threshold (default 3)
  - **Drop-eligible** — total absences > threshold (default 12)
  - **Behind on session pace** — logged sessions below the expected pace for elapsed shifting days against `requiredTeachingSessions`
  - **CT evaluation pending** — an assigned session unevaluated for more than N days (mockup: 7)
- A flagged intern appears in the supervisor's Requiring Attention list and Alerts tab, and in the admin dashboard's Students Requiring Attention (filterable by school), with severity indicated.
- Supervisor resolves an alert with a **required** resolution note; resolved alerts move to Resolved and appear in the school's Resolved Alerts tab and in admin reports.
- Alerts are notifications, not sanctions — the system never auto-drops or auto-fails an intern.

### 6.9 Notifications

- In-app notification feed per user, persisted and readable after the fact.
- Web Push (service worker, VAPID) for: new session assigned, session evaluated + score, attendance threshold warning (intern); new flag raised (supervisor); new session awaiting evaluation, pending CT registration approved (CT).
- Push requires an installed PWA on iOS (16.4+); the in-app feed is the guaranteed channel and push is an enhancement, never the only delivery path for anything time-critical.

### 6.10 Reports (Admin)

- Filters: school (All Schools or one) + shifting, with **Export CSV** on every tab.
- **Attendance** — per school: interns, present today, absences this shifting, excused, late, average attendance rate, plus a system-wide total row. Selecting one school drills down to per-intern rows.
- **Session & Document Compliance** — per school: on track, behind, sessions logged, missing lesson plans, missing progress reports. Per-intern drill-down shows status, sessions x/N, missing LP, missing PR.
- **Resolved Alerts** — date, school, intern, flag, resolving supervisor, resolution note.
- Every figure is derived at query time from source records; no denormalized report tables that can drift.

### 6.11 System configuration (Admin)

- **My Account**: profile + change password.
- **Flagging Rules**: the thresholds in §6.8, applied system-wide.
- **Check-in**: global Time In cut-off (interns timing in after it are `LATE`) and Time Out start; overridable per school from School → Overview → Check-in Settings.
- Config changes are audit-logged with before/after values and take effect prospectively — they never retroactively rewrite recorded statuses.

## 7. Access Summary

| Module | Intern | CT | Supervisor | Admin |
|---|---|---|---|---|
| Own attendance time-in/out | Create (geofenced) | — | — | — |
| View DTR | Own | — | Assigned school | All |
| Mark excused | — | — | Assigned school | All |
| Assign teaching session | — | Assigned interns | — | — |
| Submit evaluation | — | Assigned interns | — | — |
| View evaluation scores | Own | Own submissions | Assigned school | All |
| Upload documents | Own | — | — | — |
| View documents | Own | Assigned interns | Assigned school | All |
| Alerts — view | Own | — | Assigned school | All |
| Alerts — resolve | — | — | Assigned school | All |
| Create intern account | — | — | Assigned school | All |
| Create supervisor account | — | — | — | Yes |
| Approve CT registration | — | — | — | Yes |
| Manage schools | — | — | — | Yes |
| Manage semesters/shiftings | — | — | — | Yes |
| Flagging & check-in config | — | — | — | Yes |
| Reports & CSV export | — | — | Own school (read) | All |
| Audit log | — | — | — | Yes |

## 8. Data Model (high level)

- **User** — id, email (unique), passwordHash, role (`ADMIN`/`SUPERVISOR`/`COOPERATING_TEACHER`/`STUDENT_INTERN`), status (`PENDING`/`ACTIVE`/`INACTIVE`), name, phone?, createdAt
- **School** — id, name, type (`SECONDARY`/`ELEMENTARY`), municipality, latitude, longitude, geofenceRadiusMeters, timeInCutoff?, timeOutStart? (null → global default)
- **SupervisorProfile** — id, userId, department, schoolId?
- **CooperatingTeacherProfile** — id, userId, schoolId, approvedByUserId?, approvedAt?
- **InternProfile** — id, userId, schoolId (school number, e.g. 2021-0045), course, yearLevel, assignedSchoolId, cooperatingTeacherId?, createdByUserId
- **AcademicYear** — id, label, isArchived
- **Semester** — id, academicYearId, name, startDate, endDate
- **Shifting** — id, semesterId, name (`FIRST`/`SECOND`), startDate, endDate, requiredTeachingSessions, requiredFinalDemos, status
- **AttendanceRecord** — id, internId, shiftingId, date, timeIn?, timeOut?, timeInLat/Lng?, timeOutLat/Lng?, status (`PRESENT`/`ABSENT`/`INCOMPLETE`/`LATE`/`EXCUSED`), excuseReason?, excusedByUserId?, excusedAt? — unique (internId, date)
- **TeachingSession** — id, internId, shiftingId, cooperatingTeacherId, sessionNumber, date, subject, gradeSection, topic, type (`REGULAR`/`FINAL_DEMO`), status (`ASSIGNED`/`EVALUATED`)
- **EvaluationCriterion** — id, order, name, weightPercent, isActive (seeded config; weights must total 100)
- **EvaluationItem** — id, criterionId, order, text, isActive
- **Evaluation** — id, sessionId (unique), submittedByUserId, submittedAt, overallScore (Decimal), commendable, areasForImprovement — immutable after insert
- **EvaluationItemScore** — id, evaluationId, itemId, rating (1–5)
- **SessionDocument** — id, sessionId, type (`LESSON_PLAN`/`PROGRESS_REPORT`), storageKey, originalFilename, mimeType, sizeBytes, uploadedAt, supersededByDocumentId?
- **EndOfTermSubmission** — id, internId, shiftingId, type (`NARRATIVE_REPORT`/`TEACHING_PORTFOLIO`), dueDate, storageKey?, uploadedAt?
- **Alert** — id, internId, shiftingId, type, severity, detail, raisedAt, status (`ACTIVE`/`RESOLVED`), resolvedByUserId?, resolvedAt?, resolutionNote?
- **FlaggingRuleConfig** — id (singleton), absenceEarlyWarning, consecutiveAbsences, dropEligibleAbove, evaluationPendingDays, behindPaceTolerance
- **CheckInConfig** — id (singleton), timeInCutoff, timeOutStart
- **Notification** — id, userId, type, title, body, readAt?, createdAt
- **PushSubscription** — id, userId, endpoint, p256dh, auth, createdAt
- **AuditLog** — id, actorUserId, actorRole, action, entityType, entityId, diff (JSON), ipAddress?, createdAt

## 9. Non-Functional Requirements

- **Authorization** is enforced server-side in the data-access layer, not in the UI. Every scoped query goes through one shared scoping helper.
- **Geofence integrity**: distance computed server-side from raw coordinates; requests carrying a precomputed "in range" flag are rejected. Coordinates are stored with each attendance punch for later dispute resolution.
- **Performance** (ISO 25010 performance efficiency): dashboard and report queries return within ~2 s at the expected scale (~150 interns, ~15 schools, one active shifting); attendance punch round-trip under ~3 s on a typical mobile connection.
- **Usability** (ISO 25010): mobile surfaces are thumb-reachable, one primary action per screen, and installable to the home screen; DTR and reports are printable/exportable.
- **Data integrity**: attendance is unique per intern per day; evaluations are one-per-session and immutable; deletions of accounts with history are soft deletes.
- **Security**: passwords hashed (argon2/bcrypt); VAPID keys, database URL, and Supabase service keys live only in `.env`, never in the database or an admin UI; uploaded files served through signed, expiring URLs rather than public bucket links.
- **Privacy**: location is captured only at the moment of an attendance punch — no background or continuous tracking. State this explicitly in the consent/onboarding copy, since it matters both ethically and for the thesis defense.
- **Timezone**: all timestamps stored UTC, evaluated and displayed in Asia/Manila.
- **Auditability**: every mutation listed in CLAUDE.md's audit section produces a log entry readable by admin.

## 10. Open Questions (need your input)

1. **Time Out rule conflict.** Settings shows a global "Time Out start: 07:30 AM", but the intern home screen says "Time Out — Available after 3:00 PM". Which governs — a configured clock time, or a minimum hours-rendered rule? (Drafted as: configurable clock time, global with per-school override.)
2. **Evaluation instrument completeness.** The mockups show all 7 items under Lesson Planning and all 6 under Teacher's Personality, but not the items for Content, Teaching Methods, Classroom Management, or Questioning Skills. Please supply the CTE's actual rating sheet so the seed data matches the real instrument.
3. **Final Demo scoring.** Does the Final Demo use the same six-criterion instrument, and does its score enter the intern's session average or stand separately?
4. **Excused absences and thresholds.** Does an `EXCUSED` day still count toward the early-warning, consecutive, and drop-eligible counts? (Drafted as: excluded from all three, since that's the point of excusing — confirm.)
5. **`INCOMPLETE` days.** Does a time-in with no time-out count as present, absent, or neither for the attendance rate? (Drafted as: counted as a day attended for pace, excluded from the "present" rate — confirm.)
6. **GPS failure fallback.** No screen shows a manual override. If a device's GPS fails or a school's geofence is wrong, can a supervisor record an attendance punch on the intern's behalf (logged as manual)? Without this, a bad GPS day is permanently an absence.
7. **CT ↔ intern assignment.** The CT screens show "Interns Assigned" but no screen assigns them. Who does it — the supervisor, or the admin at approval time? Can one intern have more than one CT across subjects?
8. **Behind-on-pace formula.** "Behind on session pace" needs a concrete rule (e.g. logged sessions < elapsed shifting weekdays × required ÷ total shifting weekdays, minus a tolerance). Please confirm the formula and tolerance.
9. **Password reset.** Confirm v1 keeps "contact the office" only. Email-based self-service reset is cheap to add later but needs an SMTP sender decided now if you want it.
10. **Document constraints.** Accepted file types (mockups show PDF for lesson plans, JPG for progress reports) and maximum file size per upload?
11. **Supervisor multi-school.** One supervisor per school is shown, but can one supervisor hold several schools at once? (Data model allows it; UI currently assumes one.)
12. **Geolocation spoofing in a PWA.** Browser geolocation can be overridden with developer tools or a mock-location app, and a PWA cannot detect this the way a native app can. Options: accept and document it as a study limitation, add server-side plausibility checks (impossible travel between punches, duplicate device/IP across interns), or require a supervisor spot-check. Recommend documenting it as a limitation **plus** the impossible-travel check, which is cheap.
13. **iOS push.** Web Push on iOS requires the user to install the PWA to the home screen. Acceptable, or should intern-facing alerts also go out by email/SMS?
14. **Data retention.** How many academic years stay live in the archive view before export-and-purge?

## 11. Recommended Tech Stack

Next.js (App Router, TypeScript) serving both the admin dashboard and the installable mobile PWA · PostgreSQL + Prisma · session auth with role claims · Supabase Storage for documents · Web Push (VAPID) + in-app notification feed · Tailwind + shadcn/ui. Full detail and the cross-cutting conventions live in `CLAUDE.md`.

---

**Please review and confirm, or flag changes — especially Section 10 — before implementation begins.**
