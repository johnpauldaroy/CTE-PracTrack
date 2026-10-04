# Enhancement Plan — Tester Concerns (Concerns-PracTrack.docx)

Source: `Concerns-PracTrack.docx` (8 screenshots, written in Kinaray-a/Hiligaynon), reviewed against the code on `main` @ `4381087`.
Each concern below has the original text, an English translation, the **root cause found in the code**, and the planned fix.
Every fix follows `CLAUDE.md` (role scoping, audit logging in services, Manila time, config-driven rules).

## Implementation status (2026-10-04)

All four phases are implemented on `claude/document-enhancement-plan-b82ma2` and were verified against a local PostgreSQL database seeded with `npm run db:seed`, using a production build driven by Playwright.

| Phase | Commit | Covers |
|---|---|---|
| 1 | `feat: run at-risk alerts automatically and wire up notifications` | #1, #2, #9, bugs B, F |
| 2 | `feat: password visibility toggle and school overview fixes` | #8, bugs A, C, D |
| 3 | `feat: map picker, editable school location, and safe school delete` | #5, #6, #7, bug E |
| 4 | `feat: readable audit log and shifting archive` | #3, #4, bug G |

**Deployment steps for the live Supabase/Vercel setup:**
1. Run `prisma/sql/2026-10-04_tester-concerns.sql` once in the Supabase SQL Editor. It's safe to re-run. It adds the new notification type and column and the `SystemState` table, and it replaces the alert unique index.
2. Set `CRON_SECRET` in the Vercel project's environment variables. `vercel.json` schedules `/api/cron/evaluate-alerts` daily at 10:30 UTC (6:30 PM Manila).
3. Optional: set `GEOCODER_USER_AGENT` to an identifying string with contact details, per the Nominatim usage policy.

**Decisions taken on the open questions (defaults from §6, change if CTE disagrees):** alerts are never auto-resolved; admins get CT-registration and HIGH-severity alert notifications; schools are soft-deleted with restore; the daily run is at 6:30 PM Manila.

**Behavior change worth knowing:** *today* no longer counts as an absence until the day is over or a record exists. Before, an intern who hadn't timed in yet at 7 AM already showed an absence. The DTR, dashboard tiles, reports, and alert rules all share this rule. As a result, a supervisor can excuse today's absence only from the next day onward.

**Not verifiable in the build sandbox:** the network policy blocks `tile.openstreetmap.org` and `nominatim.openstreetmap.org`. The map rendered with a blank background there, and place search showed its fallback message. Click, drag, GPS, and manual entry were all verified. Check tiles and search once on the deployed site.

---

## 1. Summary

| # | Area | Concern (translated) | Root cause | Priority | Size |
|---|---|---|---|---|---|
| 1 | Admin + Supervisor dashboards | "Students requiring attention" is empty — there are absences but 0 active alerts | Alert rules **never run automatically**. `evaluateAlerts()` runs only when someone taps "Evaluate" on the supervisor Alerts page | **P0** | M |
| 2 | Admin header | Tapping the notification bell does nothing | Bell `<button>` has no `onClick`, there's no admin notifications page, the unread count is never passed in, and nothing ever creates notifications for ADMIN users | **P0** | M |
| 3 | Audit Log | Details show raw JSON — can it be plain text? | Page renders `JSON.stringify(diff)` and raw cuid ids | P1 | M |
| 4 | Semesters | "View Archive" for a completed shifting can't be opened | Button is hardcoded `disabled` and there is no archive page. Reports only read the ACTIVE shifting | P1 | M |
| 5 | Schools | Can schools be deleted, or should deleting be DB-only to be safe? (test school can't be removed) | `deleteSchool()` (soft delete) + `DELETE /api/schools/[id]` exist, but no UI calls them | P1 | S |
| 6 | School detail | Location should stay editable in case it was placed wrong | `updateSchool()` + `PATCH /api/schools/[id]` already accept lat/long/radius. The Location card just has no Edit button | P1 | S |
| 7 | Add School | Will the map picker be connected later? | Map picker is a placeholder ("not yet wired up") | P1 | M |
| 8 | Login | Add a show/hide password eye icon | Plain `type="password"` input | P2 | XS |
| 9 | Supervisor | Alerts don't show either (same as admin) | Same as #1 | **P0** | (in #1) |

Other bugs found in the screenshots while tracing these (not reported by testers, but should be fixed in the same pass):

| # | Where | Bug | Root cause |
|---|---|---|---|
| A | School detail → Supervisor Assignment | Dropdown shows the raw id `seed-user-supervisor-mvillanueva` instead of the name | Base UI `Select.Value` renders the raw `value` unless the root `Select` is given `items` (value→label). The same pattern is in `edit-intern-sheet.tsx`, `supervisor-form-sheet.tsx`, `ct-registration-form.tsx` |
| B | School detail → Overview | "Flagged: 12" while Active Alerts = 0 | `flaggedCount` counts interns with `absences > 0`, not interns with active alerts (`school-overview-tab.tsx`) |
| C | School detail → Overview | "Present Today" always shows "—" | Hardcoded placeholder |
| D | Audit Log | Timestamps are in server time (UTC on Vercel), not Asia/Manila | `log.createdAt.toLocaleString()` in a server component |
| E | Schools delete (backend) | Deleting a school leaves its supervisor still pointing at it | `deleteSchool()` doesn't clear `SupervisorProfile.schoolId` |
| F | All layouts | Unread badge never appears on any bell (admin or mobile) | No layout passes `unreadCount` |
| G | Semesters | "Archived Academic Years" can never fill up | Nothing ever sets `AcademicYear.isArchived = true` |

---

## 2. Detailed plan per concern

### 1 + 9. Alerts never appear (Admin & Supervisor) — P0

> *"Ang ja sa admin Sir wara po naga show ang students requiring attention. May absences Sir pero no Active Alerts pa tana."*
> *"Sa Supervisor Sir same man sa admin ang alerts wara tana naga show po."*

**Root cause.** `src/lib/services/alert-service.ts → evaluateAlerts()` is the only code that creates `Alert` rows. Its only caller is `POST /api/alerts`, and the only UI that sends that request is the refresh button on `/m/supervisor/alerts`. Admins have no trigger at all. The live data shows `absenceEarlyWarning = 1` and 38 absences, so alerts *should* exist. The rules just never ran.
Absences are also **derived from missing records** (`materializeAttendanceRecords`). An absence happens because a day passes, not because something was saved, so evaluation has to be time-based and can't rely only on mutation hooks.

**Fix.**
1. **Split the engine from the caller.** Add `evaluateAlertsForShifting({ shiftingId?, internIds? })` in `alert-service.ts` that needs no session (system actor). Keep `evaluateAlerts(actor)` as a thin scoped wrapper that passes `scopeToRole.intern(actor)` ids. Load all ACTIVE alerts for the shifting in one query instead of one `findFirst` per rule per intern (current N+1).
2. **Triggers** (all call the same engine):
   - **Daily cron**: `vercel.json` cron → `GET /api/cron/evaluate-alerts`, protected by `CRON_SECRET` (`Authorization: Bearer`). Schedule it after the global time-out window, e.g. 18:30 Asia/Manila = `30 10 * * *` UTC. Vercel Hobby allows one daily cron.
   - **On mutation** for the affected intern only: after time-in, time-out, excuse marking, and evaluation submission (inside the service functions, after the transaction commits).
   - **On config change**: after `FLAGGING_RULES_UPDATE` (re-run for the active shifting).
   - **Stale-read guard**: the admin dashboard and supervisor home call `ensureAlertsFresh()`, which re-runs the engine if the last run was more than 60 minutes ago. Store `lastAlertEvaluationAt` on `FlaggingRuleConfig` or a small `SystemState` singleton. This keeps the demo correct even when the cron hasn't fired (local dev, preview deploys).
   - Add a **"Re-evaluate now"** button on the admin dashboard, like the supervisor's.
3. **No duplicate alerts.** Add a partial unique index `UNIQUE (internId, shiftingId, type) WHERE status = 'ACTIVE'` (raw SQL in the migration) so a cron run and a dashboard-triggered run can't both create the same alert. Handle `P2002` as "already exists".
4. **Fix bug B**: the school "Flagged" tile counts interns that have ≥1 ACTIVE alert (from `/api/schools/[id]/interns`, with an `activeAlertCount` added per intern).
5. **Notifications**: when a *new* alert is created, keep notifying the intern and the school supervisor (existing behavior), and also notify ADMIN users for HIGH severity (see #2).

**Files:** `src/lib/services/alert-service.ts`, `src/app/api/cron/evaluate-alerts/route.ts` (new), `vercel.json` (new), `src/lib/services/{attendance,excuse,session}-service.ts`, `src/lib/services/report-service.ts` (`getDashboard`), `src/app/m/supervisor/page.tsx`, `src/app/(admin)/dashboard/page.tsx`, `src/components/admin/schools/school-overview-tab.tsx`, `prisma/schema.prisma` + migration.

**Open question (CTE):** should an alert **auto-resolve** when its condition clears (e.g. the absence is later marked EXCUSED), or stay ACTIVE until a supervisor resolves it with a note? Current/default: stays ACTIVE (resolution is an audited human action).

---

### 2. Notification bell does nothing (Admin) — P0

> *"And sa notification icon Sir wara naga show pag gin tap."*

**Root cause.** In `src/components/admin/admin-header.tsx` the bell is a `<button>` with no handler. There's no `/notifications` page under `(admin)`. `AdminLayout` never passes `unreadCount`. Also, no service ever creates a `Notification` for an ADMIN user, so even a working panel would be empty.

**Fix.**
1. **Bell panel**: turn the bell into a dropdown/popover that lists the latest 10 notifications (title, body, relative time in Manila), unread items highlighted, with "Mark all as read" and "View all" → `/notifications` (new admin page). Use SWR with `refreshInterval: 60_000`.
2. **Shared list**: pull the list rendering out of `src/components/mobile/notification-feed.tsx` into one shared `NotificationList` used by the admin panel, the admin page, and the three mobile feeds.
3. **Unread count**: add `countUnread(actor)` + `GET /api/notifications/unread-count`, and `PATCH /api/notifications` with `{ all: true }` for mark-all. Show the badge in the admin header **and** the mobile header for every role (fixes bug F).
4. **Give admins something to receive:**
   - `CT_REGISTRATION_PENDING`: a CT self-registers → notify all active ADMINs (links to Accounts → Cooperating Teachers → Pending).
   - `ALERT_RAISED` (HIGH severity only: DROP_ELIGIBLE, CONSECUTIVE_ABSENCES) → notify ADMINs.
   - Add an optional `href` column to `Notification` so clicking an item goes to the relevant screen.
5. Schema: add `CT_REGISTRATION_PENDING` to `NotificationType` and `href String?` to `Notification`, then migrate.

**Files:** `admin-header.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/notifications/page.tsx` (new), `src/components/notifications/notification-list.tsx` (new), `notification-feed.tsx`, `mobile-header.tsx`, `src/app/m/*/layout.tsx`, `notification-service.ts`, `src/app/api/notifications/**`, `ct-registration-service.ts`, `alert-service.ts`, `prisma/schema.prisma`.

---

### 3. Audit Log as readable plain text — P1

> *"Ang sa audit log ya Sir amu gid man ya ang naga gwa Sir or pwede pa mahimo like plain text lang?"*

**Root cause.** `src/app/(admin)/audit-log/page.tsx` dumps `JSON.stringify(log.diff, null, 2)` and shows the raw entity id (`cmuqe7acx…`). Timestamps use server-local time (bug D). The "before/after" view also shows no-op differences such as `behindPaceTolerance: "0"` vs `0` (Decimal vs number serialization).

**Fix.**
1. **New `src/lib/audit-format.ts`** (pure, unit-testable):
   - `ACTION_LABELS`: `ATTENDANCE_TIME_IN → "Timed in"`, `FLAGGING_RULES_UPDATE → "Updated flagging rules"`, `SCHOOL_DELETE → "Deleted school"`, and so on, one entry per action written by `writeAuditLog`.
   - `FIELD_LABELS`: `absenceEarlyWarning → "Absence early-warning threshold"`, `geofenceRadiusMeters → "Geofence radius"`, `distanceMeters → "Distance from school"`, and so on.
   - `formatValue`: dates → `Oct 2, 2026 11:17 AM` (Asia/Manila), meters → `39 m`, booleans → Yes/No, null → "—", Decimal-ish strings normalized before comparison.
   - `summarize(log)` → one sentence, e.g. *"Juan Dela Cruz timed in at Barbaza National High School — 39 m from the school (Incomplete)."* or *"Dr. Donna Santos changed Absence early-warning threshold from 3 to 1."*
   - `changes(diff)` → only fields whose value actually changed, as `Field: before → after`.
2. **Entity names, not ids**: `listAuditLogs` resolves display names in batch per `entityType` (School, User, InternProfile, Shifting, Alert→intern name). The id stays in a tooltip.
3. **Page layout**: columns `When (Manila) · Who (name + role badge) · What happened (summary) · Changes`. Collapsible "Show raw data" keeps the JSON visible for traceability (thesis/audit defensibility).
4. **Filters + pagination**: action, role, actor, date range, free-text. Server-side cursor pagination (50/page) replaces the fixed `take: 500`. Optional CSV export of the filtered view.

**Files:** `src/lib/audit-format.ts` (new), `src/lib/services/audit-service.ts`, `src/app/api/audit-logs/route.ts`, `src/app/(admin)/audit-log/page.tsx` → server page + client `audit-log-table.tsx`.

---

### 4. View Archive of a completed shifting — P1

> *"Ang sa Semesters ya Sir ang previous shifting nga na tapos dn hindi ma view ang archive po."*

**Root cause.** `academic-year-card.tsx` renders `<Button disabled>View Archive</Button>` with no link. `report-service.getReports()` is hardwired to `status: "ACTIVE"`. Also nothing ever sets `AcademicYear.isArchived`, so the "Archived Academic Years" section can never fill up (bug G).

**Fix.**
1. **Parameterize reporting**: `getReports(actor, { shiftingId? })` (defaults to the active shifting), and the same for alert history and document compliance queries. Every query stays `shiftingId`-scoped, so no data changes are needed. Activation already preserves history.
2. **Archive page** `/semesters/shiftings/[id]` (admin, read-only, clear "Archived — read only" banner):
   - Summary tiles (interns, attendance rate, sessions completed vs required from *that* shifting's config, alerts raised/resolved).
   - Tabs: **Attendance by school** · **Teaching sessions & evaluations** · **Documents compliance** · **Alerts history** (active + resolved, with resolution notes).
   - Drill-down to an intern's DTR/sessions for that shifting (reuse `ShiftingTabs` / intern detail sheet with a `shiftingId`).
   - CSV export with `?shiftingId=`.
3. Enable the button: `View Archive` → `/semesters/shiftings/{id}`. Add a **shifting selector** to `/reports` so past shiftings can be viewed there too.
4. **Archive academic year** action (bug G): when every shifting in a year is COMPLETED, show "Archive academic year" (confirm dialog, audit `ACADEMIC_YEAR_ARCHIVE`). The year then moves into "Archived Academic Years", whose shiftings also link to the archive page.
5. Supervisors/CTs/interns: PRD §6.1 says completed shiftings are viewable by all roles. Interns already have shifting tabs. Add the same shifting selector to supervisor intern detail (scoped as usual).

**Files:** `report-service.ts`, `src/app/api/reports/route.ts`, `academic-year-card.tsx`, `archived-academic-years.tsx`, `academic-period-service.ts`, `src/app/(admin)/semesters/shiftings/[id]/page.tsx` (new), `src/app/(admin)/reports/page.tsx`.

---

### 5. Deleting a school — P1

> *"Ang ja sa schools ya Sir pwede tana ya nga may delete option or like sa database lang mag delete para mas safe? Kay nag try kami mag add ka school Sir di rn namn ma remove hehe"*

**Recommendation:** offer delete **in the UI as a soft delete**. Don't rely on deleting rows straight from the database. Manual DB deletes skip the audit trail, can break foreign keys (attendance, alerts, supervisor history), and need DB credentials. A soft delete is admin-only, audited, blocked when the school is in use, and **reversible**. Permanent (hard) deletion stays out of the UI.

**Fix.**
1. **UI**: "Delete school" in a *Danger zone* card on the school detail page and in the row actions on `/schools`. The confirmation dialog shows what blocks the delete (assigned interns, assigned supervisor) and requires typing the school name to confirm.
2. **Service hardening** (`school-service.deleteSchool`):
   - Block only when **active** (non-deleted) interns are assigned. The error message lists the count.
   - In the same transaction, unassign the school's supervisor (`SupervisorProfile.schoolId = null`) and write a `SchoolSupervisorHistory` row (bug E).
   - Write the audit entry with a `before` snapshot of the school.
   - Throw a typed `ConflictError` → **409** with the message (add it to `api-error.ts`).
3. **Restore**: a "Recently deleted" collapsible on `/schools` with **Restore** (`restoreSchool`, audit `SCHOOL_RESTORE`). This fixes a mistaken delete without anyone touching the database.
4. Deleted schools already drop out of every list: `listSchools` and `/api/public/schools` (CT registration) both filter `deletedAt: null`.

**Files:** `school-service.ts`, `src/app/api/schools/[id]/route.ts`, `src/app/api/schools/[id]/restore/route.ts` (new), `src/lib/api-error.ts`, `school-detail.tsx`, `schools-list.tsx`, `delete-school-dialog.tsx` (new).

---

### 6. Editable school location — P1

> *"Ja sa pag view ka school, pwede tana ya Sir nga editable parin ang location na incase nga mag sala pag locate po."*

**Root cause.** The backend already supports it: `updateSchoolSchema` is `createSchoolSchema.partial()` and `PATCH /api/schools/[id]` writes an audited `SCHOOL_UPDATE` with before/after. The Location card on `school-overview-tab.tsx` is display-only.

**Fix.**
1. Add **Edit** on the Location card (and a general "Edit school details" for name/municipality/type) that opens `EditSchoolSheet`. Extract the form fields from `add-school-sheet.tsx` into a shared `SchoolForm` so add and edit don't drift.
2. The edit form uses the same **map picker** (#7) with a live geofence circle and the radius slider.
3. Show a notice on save: *"Changing the location or geofence affects future time-ins only. Past attendance records keep the distance recorded at the time."* That matches the domain rule: history is never rewritten.
4. Replace the MapPin placeholder on the Location card with a small read-only map (marker + geofence circle).

**Files:** `school-overview-tab.tsx`, `add-school-sheet.tsx` → `school-form.tsx` (new, shared), `edit-school-sheet.tsx` (new).

---

### 7. Map picker on Add School — P1

> *"Pag nag add gali ka school Sir ang Map picker na ya, I connect nyo pa tana later Sir?"*

**Fix: yes, wire it up**, using **Leaflet + react-leaflet + OpenStreetMap tiles**. They're free, need no API key or billing account, and react-leaflet v5 supports React 19.

1. `src/components/maps/school-location-picker.tsx`, loaded with `next/dynamic(..., { ssr: false })` because Leaflet needs `window`:
   - Click the map or drag the marker → updates latitude/longitude.
   - `Circle` preview of the geofence radius, updated live from the slider.
   - **Search box**: debounced geocoding through a server route `GET /api/geocode?q=` that proxies **Nominatim**. Bias results to the Philippines/Antique (`countrycodes=ph`, `viewbox` around Antique), send a proper `User-Agent`, and respect the 1 request/second policy. The admin can type "Barbaza National High School" or a municipality.
   - **"Use my current location"** button (`navigator.geolocation`), for an admin standing at the school.
   - Default center: San Jose de Buenavista, Antique (≈ 10.744, 121.941), zoom 11.
   - The manual latitude/longitude inputs **stay** as the fallback and stay two-way bound to the marker, as the PRD requires.
2. Reused in Add School, Edit School (#6), and the read-only Location card.
3. Dependencies: `leaflet`, `react-leaflet`, `@types/leaflet`. Import `leaflet/dist/leaflet.css` and fix the default marker icon paths (a known bundler issue).
4. Optional later: show the school geofence and the device position on the intern's time-in screen so interns can see *why* a punch was rejected. Display only; the server still computes the distance.

**Files:** `src/components/maps/*` (new), `src/app/api/geocode/route.ts` (new), `school-form.tsx`, `package.json`.

---

### 8. Show/hide password on login — P2

> *"Ja gali Sir sa log in page kung pwede daad maka pa add ka hide/show password feature with eye icon po."*

**Fix.** New `src/components/ui/password-input.tsx`: an `Input` plus a trailing `Eye`/`EyeOff` (lucide) toggle button. The button is `type="button"` and has `aria-label="Show password"/"Hide password"` and `aria-pressed`. It keeps `autoComplete` and the existing styles.
Use it everywhere a password is typed: `login-form.tsx` (admin + mobile), `my-account-tab.tsx` (3 fields), `mobile-profile-card.tsx` (3 fields).

---

### A. Supervisor dropdown shows a raw id

In `school-overview-tab.tsx`, give the `Select` root an `items` map (`{ [id]: name }`) or a render function in `SelectValue` so the trigger shows **"Prof. Maria Villanueva"**. Apply the same fix to every Base UI `Select` whose value is an id: `edit-intern-sheet.tsx`, `supervisor-form-sheet.tsx`, `ct-registration-form.tsx`.

### C. "Present Today"

Compute it from today's attendance records (Asia/Manila day boundary via `src/lib/timezone.ts`) in `/api/schools/[id]/interns` or a small summary endpoint. Show `x / y` interns present.

---

## 3. Implementation order

| Phase | Items | Why first |
|---|---|---|
| **Phase 1: core correctness (P0)** | #1/#9 alert engine + triggers + cron, bug B, #2 notifications + unread badges (bug F) | These look like "the system doesn't work" during testing/defense |
| **Phase 2: quick wins** | #8 password toggle, bug A select labels, bug C present today, bug D Manila timestamps | Small, visible, low-risk |
| **Phase 3: schools** | #7 map picker → #6 edit location (reuses picker) → #5 delete/restore (+ bug E) | #6 depends on the shared form + picker from #7 |
| **Phase 4: history & traceability** | #3 readable audit log, #4 archive page + reports shifting selector + archive academic year (bug G) | Both are read-side features on existing data |

One schema migration covers Phases 1–4: `NotificationType.CT_REGISTRATION_PENDING`, `Notification.href`, `lastAlertEvaluationAt`, and the partial unique index on active alerts. Apply it to the live Supabase DB with `prisma migrate deploy`.

## 4. Audit-trail additions (per CLAUDE.md)

New mutations that must call `writeAuditLog` inside their service functions: `SCHOOL_RESTORE`, `ACADEMIC_YEAR_ARCHIVE`, the enriched `SCHOOL_DELETE` (with snapshot + supervisor unassignment), and `SCHOOL_UPDATE` from the new edit sheet (already logged). Alert creation by the engine is a system action and is not a disputed human mutation, so it isn't audit-logged. Alert *resolution* remains logged.

## 5. Verification checklist

- [ ] With `absenceEarlyWarning = 1` and seeded absences, loading the admin dashboard creates alerts. The Active Alerts tile, Requiring Attention list, supervisor home, and school "Flagged" all agree.
- [ ] Running the cron route twice in a row creates no duplicate alerts. A request without the `CRON_SECRET` gets 401.
- [ ] A supervisor sees only alerts for interns at their school (scope test).
- [ ] Admin bell opens a panel. A new CT registration produces an admin notification. Unread badge counts go down on read and on "mark all".
- [ ] Audit log shows sentences and changed fields only, in Manila time. The raw JSON toggle still works. Filters + pagination work.
- [ ] "View Archive" opens the First Shifting archive with its own session requirement (15) and its own data. CSV export matches.
- [ ] Deleting a school with interns is blocked with a clear message (409). Deleting an empty school hides it everywhere and unassigns the supervisor. Restore brings it back. Both are audit-logged.
- [ ] Editing a school's location updates the geofence for new time-ins. Old attendance rows are unchanged.
- [ ] Map picker: search, click, drag, "use my location", and manual entry all keep marker and inputs in sync. Works on a phone-width screen.
- [ ] Password eye toggle works with the keyboard (Tab + Enter/Space) and screen readers announce the state.
- [ ] `npm run lint` and `npm run build` pass.

## 6. Questions to confirm with CTE / adviser

1. **Alert auto-resolve:** should alerts close themselves when the condition clears, or always need a supervisor note? (Default in this plan: supervisor resolves.)
2. **Admin notifications:** is "new CT registration" + "HIGH-severity alert" the right set, or do admins also want e.g. "shifting ends in 7 days"?
3. **School delete:** is soft delete + restore acceptable, with permanent deletion never exposed in the UI? (Recommended.)
4. **Daily alert run time:** is 6:30 PM Manila right, after the latest school time-out?
