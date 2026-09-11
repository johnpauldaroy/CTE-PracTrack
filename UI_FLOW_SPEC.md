# CTE PracTrack — UI/UX Flow Specification

Source: `CTE-PPT-FLOW.pdf` (44 slides, rendered as `page_001.png`–`page_044.png`), read in full and transcribed below.

**Precedence note**: This deck is a visual/navigation reference only. Where it conflicts with `PRD.md` or `CLAUDE.md`, those documents win — conflicts are flagged explicitly in Section 7, not silently resolved.

Slide map:
- Page 1: Login page (all three login surfaces)
- Page 2: CT self-registration form
- Page 3: Section divider — "ADMIN"
- Pages 4–31: Admin web dashboard screens
- Page 32: Section divider — "STUDENT"
- Pages 33–36: Mobile PWA — Student Intern screens
- Page 37: Section divider — "SUPERVISOR"
- Pages 38–43: Mobile PWA — Supervisor screens
- Page 43 (right column) onward / Page 44 divider label appears mid-flow: "Cooperating Teacher" — Pages 44 onward (actually the CT divider is page 42 area; see note below)
- Pages 42–46 equivalent (mapped to actual files 42–44 in this 44-page deck): Mobile PWA — Cooperating Teacher screens

(Exact page-to-section mapping is given inline in each section heading below, based on the order actually encountered while reading.)

---

## 1. Global Navigation Structure

### 1.1 Login flow (Page 1)

Three login cards shown side by side on the slide for comparison, but they are three separate entry points:

**Admin Web Login** (leftmost card, labeled "Web/Admin"):
- Header: shield/book crest icon (navy square, amber book glyph) + "CTE PracTrack"
- Subtitle: "Admin Dashboard"
- Sub-subtitle: "University of Antique — College of Teacher Education"
- Field: **Email** — placeholder `admin@antiquespride.edu.ph`
- Field: **Password** — placeholder "Enter your password"
- Button: **Sign In** (full-width, amber/gold fill, dark text)
- Footer link: "Forgot password? Contact IT support." (small gray text, centered)
- No role selector — this is a dedicated admin-only login page (separate route from mobile).

**Mobile PWA Login** (center and right cards, labeled "Mobile App"):
- Same crest + "CTE PracTrack" header
- Subtitle: "Practice Teaching Monitoring System"
- Sub-subtitle: "University of Antique — College of Teacher Education"
- **Role selector tab bar** with three segments: **Student Intern** | **Supervisor** | **Cooperating Teacher** — active segment shown filled dark-navy with amber/gold text; inactive segments are plain white/gray text on white
- Field: **Email** — placeholder `yourname@antiquespride.edu.ph`
- Field: **Password** — placeholder "Enter your password"
- Button: **Sign In** (full-width amber/gold)
- Footer link (Student Intern / Supervisor tabs): "Forgot password? Contact the CTE office."
- Footer link (Cooperating Teacher tab only): additional link **"New here? Register as Cooperating Teacher"** shown above the "Forgot password?" line — this is the only role with self-registration.
- Two arrows on the slide point from "Mobile App" label up into the Student Intern card and the Cooperating Teacher card, confirming both are reached from the same login screen via tab switching.

**Color/style notes confirmed here**: dark navy (#1a1f3a-ish) for headers/active tab fill, amber/gold (#f5a623-ish) for primary buttons and crest icon accent, white cards on light gray page background, serif-ish wordmark treatment for "CTE PracTrack" is NOT used here (this appears to be a plain bold sans-serif on the login page, but see Admin dashboard note below where the wordmark itself uses a serif-style "Dashboard" heading).

### 1.2 CT self-registration (Page 2)

Reached by tapping "New here? Register as Cooperating Teacher" on the Cooperating Teacher login tab. Two-panel slide showing the form and then the school-picker dropdown expanded.

**Register as Cooperating Teacher** form:
- Role tabs at top still visible (Student Intern / Supervisor / **Cooperating Teacher** active)
- Heading: "Register as Cooperating Teacher"
- Field: **Full Name** — placeholder "Mr./Ms. Juan Dela Cruz"
- Field: **Email** — placeholder "yourname@gmail.com" (note: uses gmail.com placeholder, not institutional domain, unlike other fields — likely intentional since CTs are external school staff, not university accounts)
- Field: **Phone Number** — placeholder "0917XXXXXXX"
- Field: **School** — dropdown "Select your school..." — second panel shows it expanded as a scrollable list of ~15 named partner schools (Patria National High School, Pandan National Vocational School, Sebaste High School, Bitadton National High School, Northern Antique Vocational School, Sta. Justa National High School, Laboratory High School, Barbaza National High School, Laua-an National High School, Barbaza Central School, Jinalinan-Ipil Elementary School, Malabor Elementary School, Tibiao Central School, Culasi North Elementary School, Sebaste Central School)
- Button: **Submit Registration** (dark navy fill, amber text — notably the INVERSE color treatment from the Sign In button, signaling this is a secondary/distinct action)
- Footer link: "Back to Sign In"

Submitting creates a `PENDING` CT account, which surfaces in Admin → Accounts → Cooperating Teachers → Pending Approval (see §2.6).

---

## 2. Admin Web Dashboard Screens

Persistent header on every admin screen: **"CTE PracTrack"** wordmark (top-left, bold serif-style), then a horizontal nav bar with items **Dashboard | Schools | Accounts | Semesters | Reports | Settings**. The active nav item is highlighted with a light amber/cream background box and amber bottom border. Top-right: a bell/notification icon with a red circular unread-count badge (shown as "4" throughout most admin slides), and a circular avatar badge with initials in navy-on-amber (e.g., "DS" for Dr. Donna Santos) which opens/represents the account. A thin amber horizontal rule sits under the entire header bar.

### 2.1 Dashboard (Page 4)

Route: `/dashboard` (default landing after admin login).

- Page heading: "Dashboard" (large serif-style heading)
- Subheading line: "First Semester 2024–2025 · Second Shifting Active · October 9, 2024" — shows the currently active academic period and today's date inline.
- **Stat card row** (4 cards, equal width, white background, large colored number + gray label underneath):
  - **84** "Present Today" (green number)
  - **19** "Absent Today" (red number)
  - **9** "Incomplete Today" (amber/orange number)
  - **14** "Flagged" (dark/black number)
- **Students Requiring Attention (14)** section:
  - Section heading with count in parentheses
  - Right-aligned filter dropdown: "All Schools"
  - Grid of intern alert cards (2 columns), each card showing:
    - Colored dot bullet (red for higher severity) + intern name (bold)
    - School name (gray, smaller)
    - Bulleted list of active flag reasons, e.g. "4 absences — approaching drop limit", "CT evaluation pending 7 days", "3 absences", "3 consecutive absences", "Behind on session pace", "5 absences — approaching drop limit", "2 consecutive absences"
  - Example cards shown: Juan Dela Cruz (Barbaza NHS), Pedro Reyes (Barbaza NHS), Ben Torres (Barbaza NHS), Jerome Bautista (Barbaza NHS), Carlo Mendez (Patria NHS)
  - Link below grid: "See all 14 students →"
- **Attendance Overview — Today** section (below the fold, partially visible):
  - Section heading
  - Grid of per-school mini cards, each showing: school name (bold), municipality · type (gray subtext), a horizontal progress bar (amber fill) with "present/total" count at right (e.g., "6 / 8"), and a red "N absent" line underneath.
  - Examples: Patria National High School (Hamtic · Secondary) 6/8, 2 absent; Bitadton National High School (Bugasong · Secondary) 6/8, 2 absent; Laboratory High School (San Jose · Secondary) 7/10, 2 absent.

Navigation: clicking "See all 14 students" presumably routes to a full filtered list (not shown as a separate slide, but implied). Nav bar items lead to their respective sections below.

### 2.2 Schools — list (Page 5)

Route: `/schools`.

- Heading: "Schools"
- Top-right button: **+ Add School** (amber fill)
- **Secondary Schools (9)** — table with columns: SCHOOL NAME, MUNICIPALITY, TYPE, INTERNS, SUPERVISOR, [View button column]
  - Rows include: Patria National High School (Hamtic, Secondary, 8 interns, Prof. Jose Arcega); Pandan National Vocational School (Pandan, 7, Prof. Ramon Casipe); Sebaste High School (Sebaste, 6, "Not yet assigned" — shown in amber/orange warning text); Bitadton National High School (Bugasong, 8, Prof. Ana Malaguit); Northern Antique Vocational School (Libertad, 7, Not yet assigned); Sta. Justa National High School (Culasi, 9, Not yet assigned); Laboratory High School (San Jose, 10, Not yet assigned); Barbaza National High School (Barbaza, 13, Prof. Maria Villanueva); Laua-an National High School (Laua-an, 8, Not yet assigned)
  - Each row has a **View** button (outlined/white) on the right
- **Elementary Schools (6)** — same column structure, all supervisors shown as "Not yet assigned" in the visible rows: Barbaza Central School (Barbaza, 7), Jinalinan-Ipil Elementary School (Barbaza, 5), Malabor Elementary School (San Remigio, 6), Tibiao Central School (Tibiao, 7) — table continues below fold.
- Style note: "Not yet assigned" is rendered in amber/warning-colored text to visually flag unassigned schools; assigned supervisor names render in normal blue-ish link-styled text.

Navigation: "+ Add School" opens the Add School side panel (§2.3). "View" on any row opens that School Detail page (§2.4).

### 2.3 Add School — side drawer (Page 6)

Slides in as a right-side drawer/panel over the dimmed Schools list.

- Panel heading: "Add School" with × close button
- Field: **School Name** — placeholder "e.g. San Antonio National High School"
- Field: **Type** — segmented control, two options: **Secondary** (shown active/selected, dark navy fill) | **Elementary**
- Field: **Municipality** — placeholder "e.g. Hamtic"
- Field: **Location** — text input placeholder "Search municipality..." with a paired icon button (location pin icon, dark navy square) beside it
- Below that: a large gray map placeholder box with a center pin icon and caption "Search a municipality or enter coordinates" — this is the map-picker area described in CLAUDE.md/PRD (map search or manual lat/long fallback)
- Field pair: **Latitude** (e.g. "11.0413") / **Longitude** (e.g. "122.0831") — plain numeric text inputs, side by side
- Field: **Geofence Radius: 75m** — labeled slider control, handle positioned near the left, confirming the mockup default of 75 meters mentioned in PRD §6.2 and CLAUDE.md
- Button: **Add School** (full-width amber)

This confirms the CLAUDE.md/PRD requirement: "map picker with manual lat/long entry fallback" and geofence radius as an adjustable slider defaulting to 75m.

### 2.4 School Detail — Overview tab (Page 7)

Route: `/schools/[id]` (example: Barbaza National High School).

- Breadcrumb: "← Schools"
- Heading: school name ("Barbaza National High School"), subheading "Secondary · Barbaza, Antique · 13 Interns"
- **Tab bar** (pill/segmented, full width): **Overview** (active, dark navy fill) | **Interns** | **Resolved Alerts**
- Stat card row (3 cards): **13** "Interns", **11** "Present Today" (green), **4** "Flagged" (amber)
- **Supervisor Assignment** card:
  - Current supervisor name + department shown (e.g., "Prof. Maria Villanueva" / "Language Education")
  - Label: "Change Supervisor" with a dropdown pre-populated with the current supervisor ("Prof. Maria Villanueva — Language Education")
- **Location** card:
  - Gray map placeholder box with center pin icon
  - Caption under pin: coordinates + radius, e.g. "11.1897°N, 122.0698°E · 75m geofence"
- **Check-in Settings** card:
  - "Time In cut-off: 7:30 AM (using global default)" — gray/muted text indicating inheritance from global config
  - "Time Out: open — no cut-off"
  - This is where a school-specific override would be set (per CLAUDE.md's cascade rule: school override → global default), though no explicit "Edit"/override control is visible in this particular slide — the muted styling communicates it's currently inherited.

### 2.5 School Detail — Interns tab (Pages 8, 9)

- Same header/tabs as Overview, with **Interns** tab active.
- Section label: "N Interns Assigned" (e.g., "8 Interns Assigned" for Patria NHS, "13 Interns Assigned" for Barbaza NHS)
- **Table** columns: SCHOOL ID, NAME, COURSE, SESSIONS, ABSENCES, [View Profile] [Unassign] action buttons
  - Course values shown as colored/link-styled text, e.g. "BSEd-Math", "BSEd-English", "BSEd-Science", "BSEd-Filipino", "BSEd-MAPEH"
  - Sessions shown as "x/15" fraction (e.g., "10/15", "12/15", "7/15")
  - Absences shown as plain number, colored blue when 0 and presumably darker/red when >0 (numbers like 5, 1, 4, 0, 1, 2, 0, 1 observed)
  - Example rows (Patria NHS): Carlo Mendez (2021-0130, BSEd-Math, 10/15, 5 absences), Liza Ramos (2021-0131, BSEd-English, 12/15, 1), Ken Alvarez (2021-0132, BSEd-Science, 7/15, 4), Grace Tan (2021-0133, BSEd-Filipino, 13/15, 0), Rodel Cruz (2021-0134, BSEd-MAPEH, 11/15, 1), May Fernandez (2021-0135, BSEd-Math, 9/15, 2), Jake Soriano (2021-0136, BSEd-English, 14/15, 0), Nina Castillo (2021-0137, BSEd-Science, 10/15, 1)
  - Example rows (Barbaza NHS, 13 total): Juan Dela Cruz (2021-0045, BSEd-English, 9/15, 4), Maria Santos (2021-0052, BSEd-Math, 13/15, 0), Pedro Reyes (2021-0061, BSEd-Science, 8/15, 3), Ana Flores (2021-0067, BSEd-MAPEH, 14/15, 0), Mark Garcia (2021-0072, BSEd-Filipino, 11/15, 1), Claire Navarro (2021-0080, BSEd-English, 12/15, 0), Luis Domingo (2021-0083, BSEd-Math, 10/15, 1), Hazel Cinco (2021-0098, BSEd-Science, 13/15, 0), Rachel Lim (2021-0103, BSEd-Filipino, 9/15, 2), Ben Torres (2021-0109, BSEd-MAPEH, 7/15, 3), Rhea Villanueva (2021-0114, BSEd-English, 10/15, 1), Lea Magno (2021-0118, BSEd-Math, 11/15, 0), Jerome Bautista (2021-0093, BSEd-Science, 6/15, 2)

Navigation: "View Profile" opens the intern detail (same drawer pattern as Accounts → Interns, §2.7). "Unassign" (red text button) presumably removes the intern from the school (destructive action).

### 2.6 School Detail — Resolved Alerts tab (Page 10)

- Same header/tabs, **Resolved Alerts** active.
- List of resolution record cards, each showing:
  - Timestamp top-left (gray, e.g. "Oct 9, 2024, 2:30 PM")
  - Intern name (bold)
  - "Flag: [flag description]" line (e.g. "Flag: 3 consecutive absences", "Flag: Behind on session pace")
  - "Resolved by: [supervisor name]"
  - "Note: \"[verbatim resolution note text]\"" — e.g. `"Conducted home visit Oct 9. Student will resume Oct 10. Parents informed."` and `"Spoke with student. Will log 2 additional sessions this week."`
- This directly matches PRD §6.2's School detail — Resolved Alerts requirement and CLAUDE.md's audit trail (resolution note is required and quoted verbatim here).

### 2.7 Accounts — Interns tab (Pages 11–15)

Route: `/accounts` (Interns sub-tab default).

- Heading: "Accounts"
- **Tab bar**: **Interns** (active) | **Supervisors** | **Cooperating Teachers**
- Helper text: "Intern accounts are added by their assigned school's supervisor. Use this page to view, edit, or remove accounts as needed." — confirms admin does NOT create intern accounts directly; only supervisors do (per PRD §4/§6.4), admin only manages/corrects.
- **Search bar**: placeholder "Search by name or ID..." + right-side dropdown filter "All Schools"
- **Table** with a leading checkbox column (bulk-select), then columns: SCHOOL ID, NAME, COURSE, SCHOOL, ACTIONS (View / Edit / Delete — Edit in blue-outlined button, Delete in red text)
- Rows are the full intern roster across all schools (Barbaza NHS interns shown first, then Patria NHS interns continue below the fold — same names/IDs as §2.5).

**Edit Account drawer** (Page 12): triggered by "Edit" action.
- Heading: "Edit Account" with × close
- Helper text: "Edit only for corrections (e.g., wrong school selected, typo in name)." — reinforces CLAUDE.md's "Edit — for corrections only" language.
- Fields: **Name** (text), **School ID** (text, e.g. "2021-0045"), **Course** (text, e.g. "BSEd-English"), **Email** (text, e.g. "jdelacruz@antiquespride.edu.ph"), **School** (dropdown, e.g. "Barbaza National High School")
- Button: **Save Changes** (full-width amber)

**Intern Detail drawer** (Pages 13–15): triggered by "View".
- Header: intern name ("Juan Dela Cruz"), subline "School ID: 2021-0045   Course: BSEd-English   School: Barbaza National High School", × close
- **Sub-tab bar**: **DTR** (active) | **Sessions** | **Evaluations** | **Documents** — exactly the four tabs named in PRD §6.3.
  - **DTR tab** (Page 13): "Daily Time Record — Second Shifting" heading, table columns DATE, DAY, TIME IN, TIME OUT, STATUS. Example rows: Oct 9 Wed 6:42 AM / — / **Incomplete** (amber); Oct 8 Tue — / — / **Absent** (red); Oct 7 Mon 6:51 AM / 4:10 PM / **Present** (green); Oct 4 Fri 6:38 AM / 4:05 PM / Present; Oct 3 Thu 6:45 AM / 4:12 PM / Present; Oct 2 Wed 6:40 AM / 4:08 PM / Present; Oct 1 Tue — / — / Absent; Sep 30 Mon 6:35 AM / 4:15 PM / Present; Sep 27 Fri — / — / Absent; Sep 26 Thu 6:50 AM / 3:58 PM / Present; Sep 25 Wed 6:44 AM / 4:02 PM / Present; Sep 24 Tue — / — / Absent; Sep 23 Mon 6:39 AM / 4:07 PM / Present; Sep 20 Fri 6:41 AM / 4:03 PM / Present; Sep 19 Thu 6:43 AM / 4:11 PM / Present.
  - Footer note: "Read-only view. Use Edit to make changes to account details." — confirms admin cannot directly edit attendance rows here (matches CLAUDE.md: only a supervisor excuse can correct attendance).
  - **Sessions tab** (Page 14): "All Assigned Sessions (9)" — list of session cards: "Session N · [Topic]" title, subline "[Date] · English 9 · Regular", right-aligned status pill "Evaluated" (green) and "Score: XX.X%" below. Examples: Session 1 Parts of Speech Review (Sep 30, 82.1%), Session 2 Noun Clauses (Oct 1, 83.4%), Session 3 Adjective Clauses (Oct 2, 84%), Session 4 Adverb Clauses (Oct 3, 85.2%), Session 5 Complex Sentences (Oct 4, 84.7%), Session 6 Compound-Complex Sentences (Oct 7, 85.9%), Session 7 Sentence Transformation (Oct 8, 86.1%), Session 8 Paragraph Writing (cut off).
  - **Evaluations tab** (Page 15): "Evaluation Scores (8 evaluated)" heading. Each evaluation is a card: title/date/CT name header row + large percentage score top-right (e.g., "82.1%"), then six criterion rows with weight % and raw score, e.g.:
    - I. Lesson Planning (15%) — 4.0/5.0
    - II. Content (20%) — 4.2/5.0
    - III. Teaching Methods (20%) — 4.1/5.0
    - IV. Classroom Management (15%) — 3.9/5.0
    - V. Questioning Skills (15%) — 4.0/5.0
    - VI. Teacher's Personality (15%) — 4.3/5.0
    - Then **Commendable:** (green label) free text, e.g. "Good classroom presence and clear instructions."
    - Then **Needs Improvement:** (amber label) free text, e.g. "Work on pacing during the motivation activity."
    - This exact 6-criterion breakdown with weights matches PRD §6.6 precisely (Lesson Planning 15%, Content 20%, Teaching Methods 20%, Classroom Management 15%, Questioning Skills 15%, Teacher's Personality 15%).
  - **Documents tab** (Page 16): "Submitted Documents (9 sessions)" heading. Grouped by session, each group shows session title, then two file rows: a PDF icon row "lesson_plan_[date].pdf" with timestamp and a **View** button (download icon), and an image icon row "progress_[date].jpg" with timestamp and **View** button. Confirms PDF for lesson plans, JPG for progress reports per PRD open question #10.

### 2.8 Accounts — Supervisors tab (Page 17)

- Same Accounts header/tabs, **Supervisors** active.
- Top-right button: **+ Add Supervisor** (amber)
- **Table** columns: NAME, EMAIL, DEPARTMENT, SCHOOL ASSIGNED, ACTIONS (Edit / Delete)
- Rows: Prof. Maria Villanueva (mvillanueva@antiquespride.edu.ph, Language Education, Barbaza National High School); Prof. Jose Arcega (jarcega@antiquespride.edu.ph, Science Education, Patria National High School); Prof. Ana Malaguit (amalaguit@antiquespride.edu.ph, Social Studies Education, Bitadton National High School); Prof. Ramon Casipe (rcasipe@antiquespride.edu.ph, Mathematics Education, Pandan National Vocational School)
- No add/edit drawer content shown explicitly for supervisors in this deck, but the pattern would mirror the intern Edit drawer (name, institutional email, department, school assigned per PRD §6.3).

### 2.9 Accounts — Cooperating Teachers tab (Pages 18, 19)

- Same Accounts header/tabs, **Cooperating Teachers** active.
- Helper text: "Cooperating Teachers self-register from the mobile app. Pending registrations appear below for approval."
- **Pending Approval (1)** section — table with amber/cream row highlight: columns NAME, EMAIL, PHONE, SCHOOL, REGISTERED, ACTIONS. Example row: Ms. Rosalinda Pineda, rpineda@gmail.com, 09175551234, Barbaza National High School, Oct 8, 2024, with **✓ Approve** (green) and **Delete** (red) action links stacked.
- **Active (1)** section — table columns: NAME, EMAIL, SCHOOL, INTERNS ASSIGNED (comma-separated list of names inline), ACTIONS (View / Delete). Example row: Mr. Carlo Ferolin, cferolin@antiquespride.edu.ph, Barbaza National High School, "Juan Dela Cruz, Maria Santos, Pedro Reyes, Ana Flores, Mark Garcia, Claire Navarro, Luis Domingo, Hazel Cinco, Rachel Lim, Ben Torres, Rhea Villanueva, Lea Magno, Jerome Bautista".

**CT Detail drawer** (Page 19): triggered by "View" on an active CT.
- Header: CT name, × close
- Info lines: Email, Phone, School
- "Assigned Interns (13)" list — each row shows intern name (bold) + subline "[Course] · [x]/15 sessions · [n] absences", e.g. "Juan Dela Cruz — BSEd-English · 9/15 sessions · 4 absences"
- Footer: "Read-only view."
- **This CT detail screen directly answers PRD Open Question #7 ("who assigns CT↔intern?")** — see Discrepancies section below: the mockup shows CTs already having a full roster of assigned interns visible to admin, but no screen in the deck shows the actual assignment action being performed by anyone (admin, supervisor, or CT). This gap is flagged in §7.

### 2.10 Semesters (Pages 20–22)

Route: `/semesters`.

- Heading: "Semesters"
- Top-right button: **+ Add Semester** (amber)
- **Academic Year 2024–2025** card:
  - "First Semester · June 2024 – October 2024" with status pill **Active** (green)
  - Two **Shifting** sub-cards nested inside:
    - **First Shifting** — "Aug 5, 2024 – Sep 20, 2024", "15 sessions required · 1 Final Demo", status pill **Completed** (gray) + button **View Archive**
    - **Second Shifting** — "Sep 30, 2024 – Nov 15, 2024", "15 sessions required · 1 Final Demo", status pill **Active** (green) + button **Edit**
  - Amber warning banner below the card: *"Setting a Shifting Period to Active marks the current one as Completed and resets session counts for all interns. Historical data is always preserved."* — this is verbatim confirmation of CLAUDE.md's shifting-activation rule.
- **Archived Academic Years** (collapsible section, chevron icon, expanded state shown): "Academic Year 2023–2024" card — "First Semester — First Shifting: Completed · Second Shifting: Completed", link "View Archive".
- **Add Semester form** (Page 22, shown expanded above the existing semester list rather than as a drawer):
  - Heading: "New Semester"
  - Helper text: "Each semester is created with two fixed shiftings: First Shifting and Second Shifting."
  - Field: **Semester Name** — placeholder "e.g. Second Semester"
  - Fields side by side: **Overall Start Date** (placeholder "e.g. Nov 2024") / **Overall End Date** (placeholder "e.g. Mar 2025")
  - Buttons: **Create** (amber) / **Cancel** (text link)
- **Configure Shifting modal** (Page 21) — centered dialog (not a side drawer), triggered by "Edit" on a shifting:
  - Heading: "Configure Shifting"
  - Fields (2x2 grid): **Start Date** / **End Date**, **Required Teaching Sessions** (numeric, default 15) / **Required Final Demos** (numeric, default 1)
  - Buttons: **Save** (amber) / **Cancel** (text link)

### 2.11 Reports (Pages 23–27)

Route: `/reports`.

- Heading: "Reports"
- Filter row: **School** dropdown ("All Schools" or a specific school) + **Shifting** dropdown ("Second Shifting") + **Export CSV** button (outlined, download icon) — present on every tab per PRD §6.10.
- **Tab bar**: **Attendance** (active) | **Session & Document Compliance** | **Resolved Alerts**

**Attendance tab, All Schools view (Page 23)**:
- Table columns: SCHOOL, INTERNS, PRESENT TODAY, ABSENCES (SHIFTING), EXCUSED, LATE, AVG RATE
- 15 school rows shown (Patria NHS, Bitadton NHS, Laboratory HS, Barbaza NHS, Pandan NVS, Sebaste HS, Northern Antique VS, Sta. Justa NHS, Laua-an NHS, Barbaza Central School, Jinalinan-Ipil ES, Malabor ES, Tibiao Central School, Culasi North ES, Sebaste Central School)
- Bottom summary row (bold, border-top separator): **System-wide** — 112 interns, 84 present today, 239 absences, "–" excused, 9 late, 75% avg rate

**Session & Document Compliance tab, All Schools (Page 24)**:
- Table columns: SCHOOL, ON TRACK (green dot + count), BEHIND (amber dot + count), SESSIONS LOGGED, MISSING LP, MISSING PR
- Same 15-school list with per-school counts (e.g., Patria NHS: 5 on track / 3 behind / 76 sessions logged / 2 missing LP / 4 missing PR)

**Resolved Alerts tab, All Schools (Page 25)**:
- Table columns: DATE, SCHOOL, INTERN, FLAG, SUPERVISOR, RESOLUTION NOTE
- Same two example rows as the School Detail → Resolved Alerts screen (Pedro Reyes / 3 consecutive absences; Ben Torres / Behind on session pace) — confirming this is a system-wide rollup of the same underlying resolution records.

**Drill-down: selecting one school (Barbaza National High School) in the School filter (Pages 26–27)**:
- **Attendance tab, single-school drill-down**: table columns change to INTERN NAME, PRESENT TODAY (Yes/No, green/red text), TOTAL ABSENCES, EXCUSED, LATE, ATTENDANCE RATE — one row per intern (13 interns of Barbaza NHS listed by name).
- **Session & Document Compliance tab, single-school drill-down**: table columns become INTERN NAME, STATUS (colored dot + "On Track"/"Behind" label), SESSIONS LOGGED (x/15), MISSING LP, MISSING PR — per-intern rows.
- This confirms PRD §6.10's "Selecting one school drills down to per-intern rows" behavior exactly, for both Attendance and Session & Document Compliance tabs.
- (Resolved Alerts tab drill-down, Page 28 in the raw sequence, shows identical content to the All Schools view since Barbaza NHS is already the only school with resolved alerts in the sample data — no structural change observed.)

### 2.12 Settings (Pages 29–31)

Route: `/settings`.

- Heading: "Settings"
- **Tab bar**: **My Account** (active) | **Flagging Rules** | **Check-in**

**My Account tab (Page 29)**:
- Card with circular avatar (initials "DS", navy circle/amber text), name "Dr. Donna Santos", email "dsantos@antiquespride.edu.ph"
- Below a divider: **Change Password** link with lock icon

**Flagging Rules tab (Page 30)**:
- Helper text: "These conditions determine when a student appears in Requiring Attention."
- Field: **Absence early warning — flag when absences reach:** — numeric input, value **3**
- Field: **Consecutive absences — flag when consecutive absences reach:** — numeric input, value **3**
- Field: **Drop-eligible — flag when absences exceed:** — numeric input, value **12**
- Button: **Save Changes** (amber)
- This is a direct visual confirmation of CLAUDE.md's explicit warning: these are *configurable values*, editable in a plain form, not hardcoded constants. (Note: the "Behind on session pace" and "CT evaluation pending N days" rules from PRD §6.8 are NOT shown as configurable fields on this screen — only three of the five flagging rules have visible UI here. Flagged in §7.)

**Check-in tab (Page 31)**:
- Helper text: "Global check-in settings apply to all schools unless a school sets its own override."
- Field: **Time In cut-off:** — time picker input, value "07:30 am", with clock icon
- Helper text under it: "Interns who record Time In after this time are marked Late."
- Field: **Time Out start:** — time picker input, value "07:30 am" (same value as Time In cut-off in this mockup — likely a placeholder/mockup inconsistency, see §7), with clock icon
- Button: **Save** (amber)
- Footer note: "To set a school-specific Time In cut-off, go to Schools → [School Name] → Overview → Check-in Settings." — confirms the override path lives on the School Overview tab (§2.4), consistent with CLAUDE.md's cascade rule.

---

## 3. Mobile PWA — Student Intern Screens

All Student Intern screens share a **bottom tab bar** with 5 items: **Home | Attendance | Sessions | Documents | Profile** — each with an icon (house, calendar, open-book, document, person) and label; active tab shown in amber/gold with amber icon+label, inactive tabs in gray. A notification bell icon with red unread-count badge sits top-right of every screen, next to the "CTE PracTrack" wordmark top-left (no full nav bar — this is the compact mobile header).

### 3.1 Home (Page 33, leftmost card)

- Header: "CTE PracTrack" + bell icon (badge "1")
- Greeting: "Good morning, Juan" (large serif heading)
- Subline: "Wednesday, October 9, 2024 · Barbaza National High School"
- **Second Shifting** card:
  - Header row: "Second Shifting" + status pill **Active** (green)
  - "37 days until end of shifting (Nov 15)"
  - "Sessions: 9 of 15 completed"
  - "Final Demo: Not yet conducted"
  - Amber warning banner inside the card: *"You need 6 more sessions in 37 days to complete on time."* — a pacing nudge, not necessarily the formal "Behind on session pace" flag, but a proactive countdown message.
- **Attendance — Today** card:
  - Green success row with checkmark icon: "Time In — 6:42 AM — Barbaza National High School"
  - Gray/disabled row: "Time Out — Available after 3:00 PM" — confirms PRD Open Question #1's exact mockup text ("Time Out — Available after 3:00 PM"), which is the source of the conflict with the admin Check-in settings screen's clock-time model.
- **Three small stat tiles** at the bottom: **4** "Absences", **9/15** "Sessions", **85.1%** "Avg Score"
- Bottom banner (cut off in the slide): "New session assigned: English 9 · Oct 9, 2024" — an inline notification-style card teaser.

Note: No explicit "Time In" / "Time Out" button is shown mid-action on this slide — the Home screen shows the *post-time-in state* already completed for the day. The actual geofence capture UI (map/GPS permission prompt, in-range/out-of-range feedback) is not depicted in any slide in this deck — a gap noted in §7.

### 3.2 Attendance (Page 33, center card)

- Header: "Attendance" + **Print / Export DTR** button (outlined, printer icon) top-right
- **Shifting tabs**: First Shifting | **Second Shifting** (active, dark navy fill)
- Summary line: "9 Present · 4 Absent · 1 Incomplete · 0 Late · Second Shifting"
- Amber warning banner: *"4 absences recorded. Early warning threshold is 3. Please speak with your supervisor."* — verbatim microcopy confirming the threshold-driven warning banner pattern described in PRD §6.5 and CLAUDE.md.
- **DTR table**: columns DATE, DAY, TIME IN, TIME OUT, STATUS. Rows: Oct 9 Wed 6:42 AM / — / Incomplete; Oct 8 Tue — / — / Absent; Oct 7 Mon 6:51 AM / 4:10 PM / Present; Oct 4 Fri 6:38 AM / 4:05 PM / Present; Oct 3 Thu 6:45 AM / 4:12 PM / Present (table continues below fold).
- Status colors: Present = green text, Absent = red text, Incomplete = amber/orange text (consistent with admin-side DTR view).

### 3.3 Sessions (Page 33, right card)

- Header: "Teaching Sessions" + bell icon
- **Shifting tabs**: First Shifting | **Second Shifting** (active)
- Progress line: "9 / 15 Regular Teaching · Final Demo: Not yet conducted" with right-aligned "60%" and a horizontal amber progress bar beneath.
- **Session list**, each row: session number, "[Subject] · [Grade-Section]" (e.g. "English 9 · 9-Rizal"), date (e.g. "Oct 9, 2024"), status pill on the right — **Assigned** (amber pill) or **Evaluated** (green pill) — plus a chevron/expand caret.
- Rows shown: Session 9 (Oct 9, Assigned), Session 8 (Oct 2, Evaluated), Session 7 (Oct 8, Evaluated), Session 6 (Oct 7, Evaluated), Session 5 (Oct 4, Evaluated), Session 4 (Oct 3, Evaluated), Session 3 (Oct 2, Evaluated), Session 2 (Oct 1, Evaluated), continuing below fold.

Note: session numbering vs. date ordering appears non-monotonic in the mockup data (Session 8 dated Oct 2 appears before Session 7 dated Oct 8) — likely just placeholder data inconsistency, not a functional spec.

### 3.4 Sessions — expanded row (Page 34, left card)

Tapping a session row (specifically an **Evaluated** one) expands it inline (accordion pattern, not a new screen):
- Expanded content for "Session 8 — English 9 · 9-Rizal":
  - "CT: Mr. Carlo Ferolin · Oct 2, 2024 · Regular"
  - Large "Score: 86.3%"
  - Six criterion rows with weight% and rating, e.g. "I. Lesson Planning (15%) — 4.2/5.0" through "VI. Teacher's Personality (15%) — 4.5/5.0"
  - "CT Comments:" label, then **Commendable:** "Good use of examples and clear voice projection." and **For improvement:** "Improve time management during activities." (note slightly different label wording here than the admin side: "For improvement:" vs admin's "Needs Improvement:" — a minor copy inconsistency, both refer to the same `areasForImprovement` field)
  - Footer italic line: "Electronically signed by: Mr. Carlo Ferolin · Oct 2, 2024" — this is the verbatim "electronically signed by" language required in CLAUDE.md/PRD §6.6.

### 3.5 Documents (Page 34, center card)

- Header: "Documents"
- **Shifting tabs**: First Shifting | **Second Shifting** (active)
- Section: "Session Documents" with helper line "This week (Oct 7–11): 2 sessions logged"
- Session document rows, each expandable — shown expanded for "Session 9 — English 9 · Oct 9, 2024" with a red/orange status dot (incomplete):
  - "Lesson Plan" — "lesson_plan_oct9.pdf · Oct 9, 6:45 AM" + **View** button (eye icon)
  - "Progress Report" — "Not yet uploaded" (amber text) + **Upload** button (upload icon, outlined)
- Collapsed rows below (green dot = complete): Session 8 (Oct 2), Session 7 (Oct 8), Session 6 (Oct 7), Session 5 (Oct 4), Session 4 (Oct 3), continuing.
- Status dot color coding: green = both docs present, amber/orange = missing one, (presumably red = missing both, not directly observed but consistent with PRD's "complete / missing one / missing both" states).

### 3.6 Documents — full list + End-of-Term (Page 34, right card)

- Same Documents screen scrolled further down: session rows 8 through 1 listed compactly (each just a row with status dot + chevron, no longer expanded)
- **End-of-Term Submissions** section:
  - "Narrative Report" — "Not yet uploaded" (amber) — **Upload File** button (outlined)
  - subtext: "Due: Nov 15, 2024"
  - "Teaching Portfolio" — "Not yet uploaded" (amber) — **Upload File** button
  - subtext: "Due: Nov 15, 2024" (slide shows "2124" — clearly a rendering typo for "2024")
  - Matches PRD §6.7 exactly: Narrative Report + Teaching Portfolio, each with due date and upload state.

### 3.7 Profile (Page 35)

Left card — **Profile** screen:
- Header: "Profile"
- Card: circular avatar "JD" (amber circle), name "Juan Dela Cruz", subline "2021-0045 · BSEd-English · 3rd Year", then school "Barbaza National High School", supervisor "Prof. Maria Villanueva", email "jdelacruz@antiquespride.edu.ph"
- **Grade Summary** card (separate card below, divider line above it labeled implicitly by content):
  - "Second Shifting — In Progress"
  - "Session Evaluations" — "9 sessions avg 85.1%"
  - "Final Demo (S2)" — "Not yet conducted"
  - "Session Documents" — "8 of 9 complete (1 missing progress report)"
  - "End-of-Term" — "Not yet submitted"
  - Italic disclaimer: *"Final grades are computed by your supervisor. This summary is for your reference only."* — this is the verbatim microcopy fulfilling CLAUDE.md's "must be labeled as a reference summary, not an official grade" requirement.
- **First Shifting (Archived)** collapsed card: "Session avg 84.2% · Final Demo: Conducted · All documents submitted" with a chevron to expand — confirms prior-shifting data stays visible/archived per shifting rules.
- Below: **Change Password** (lock icon) and **Sign Out** (red text, exit icon) links.

Right card — **Notifications panel** (Page 35, opened via bell icon):
- Dropdown/panel titled "NOTIFICATIONS" anchored under the bell icon, overlaying the Profile screen
- List of notification items, most recent highlighted with amber/cream background:
  - "New session assigned: English 9 — Oct 9, 2024" / "7:00 AM"
  - "Session 8 evaluated — Score: 86.3%" / "Oct 2, 10:15 AM"
  - "Attendance warning: 4 absences recorded" / "Oct 8, 5:00 PM"
- This confirms the in-app notification feed pattern (persisted, readable) described in PRD §6.9, and the three intern-facing push notification triggers listed there (new session assigned, session evaluated + score, attendance threshold warning).

---

## 4. Mobile PWA — Supervisor Screens

Bottom tab bar (4 items): **Home | Interns | Alerts | Profile** — icons house / two-people / warning-triangle / person. Same header pattern as intern screens (wordmark + bell w/ badge).

### 4.1 Home (Page 38, left card)

- Greeting: "Good morning, Prof. Villanueva"
- Subline: "Wednesday, October 9, 2024 · Barbaza National High School"
- Stat tiles (3, partially cut off at right edge — a 4th likely exists): **11/13** "Present Today", **4** "Requiring Attention" (amber), **2** "Absences Today" (implied by "2" red number, label cut off)
- **Requiring Attention** section: list cards (not grid, single column on mobile), each with red dot + intern name + bulleted flag reasons — same three example interns as admin dashboard (Juan Dela Cruz — 4 absences approaching drop limit / CT evaluation pending 7 days; Pedro Reyes — 3 absences / 3 consecutive absences; Ben Torres — 3 absences / 2 consecutive absences / Behind on session pace)
- Link: "See all 4 →"

### 4.2 Home — Notifications panel (Page 38, center card)

- Bell icon tapped, panel shows:
  - "Pedro Reyes: 3 consecutive absences" / "8:00 AM"
  - "Juan Dela Cruz: CT evaluation pending 7 days" / "8:00 AM"
  - "Ben Torres: behind on session pace" / "Oct 8, 8:00 AM"
- Confirms PRD §6.9's supervisor push trigger: "new flag raised."

### 4.3 Interns list (Page 38, right card)

- Header: "Interns · Barbaza National High School" + **+ Add Intern** button (amber) top-right
- Search bar: "Search interns..."
- **Filter chip row**: **All 13** (active, dark navy pill) | **Flagged 4** | **Behind 3** — matches PRD §6.4's "All / Flagged / Behind" filter requirement exactly.
- **Table**: columns NAME, SESSIONS, ABSENCES, TODAY (colored status dot: green = present, red = absent/flagged-today, amber presumably for incomplete)
- Rows (13 total, partial visible): Juan Dela Cruz (9/15, 4, orange dot), Maria Santos (13/15, 0, green), Pedro Reyes (8/15, 3, red), Ana Flores (14/15, 0, green), Mark Garcia (11/15, 1, green), Claire Navarro (12/15, 0, green), Luis Domingo (10/15, 1, green), Hazel Cinco (13/15, 0, green), Rachel Lim (9/15, 2, green — continues below fold)

### 4.4 Add Intern form (Page 39, left card)

Opens as an in-page panel/card overlay (not full drawer in this rendering) atop the Interns list:
- Heading: "Add Intern" with × close
- Field: **Full Name** — placeholder "e.g. Maria Santos"
- Field: **School ID** — placeholder "e.g. 2021-0200"
- Field: **Email (@antiquespride.edu.ph)** — placeholder "e.g. msantos@antiquespride.edu.ph" (label itself specifies the required institutional domain)
- Field: **Course** — placeholder "e.g. BSEd-Math"
- Field: **Year Level** — placeholder "e.g. 3rd Year"
- Field: **Password** — placeholder "Set initial password"
- Field: **School** — pre-filled, read-only/disabled-styled: "Barbaza National High School" — confirms PRD §6.4's "school is fixed to the supervisor's assigned school and is not editable"
- Button: **Create** (full-width amber)

### 4.5 Alerts — Active tab (Page 39, center card)

- Header: "Alerts"
- **Tab bar**: **Active (4)** (active, dark fill) | **Resolved**
- List of alert cards, each: red dot + intern name (bold), bulleted flag reasons, then two buttons side by side: **View Intern** (outlined) and **Resolve** (dark navy fill)
- Cards: Juan Dela Cruz (4 absences — approaching drop limit / CT evaluation pending 7 days), Pedro Reyes (3 absences / 3 consecutive absences), Ben Torres (3 absences / 2 consecutive absences / Behind on session pace), Jerome Bautista (Behind on session pace)

### 4.6 Resolve Alert modal (Page 39, right card)

Triggered by tapping **Resolve** on an alert card; opens as a bottom-sheet/modal overlaying the Alerts screen:
- Heading: "Resolve Alert — Juan Dela Cruz"
- Field: **Resolution note (required)** — large textarea, placeholder "Describe the action taken..."
- (Submit button presumably below, cut off in slide, but the required-field label matches CLAUDE.md/PRD's mandatory resolution note.)

### 4.7 Intern Detail — DTR tab (Page 40, left card)

Reached via "View Intern" from Alerts, or "View Profile"-equivalent from the Interns list.
- Breadcrumb: "← Back"
- Header: "Juan Dela Cruz", subline "2021-0045 · BSEd-English · Barbaza National High School"
- **Sub-tab bar**: **DTR** (active) | **Sessions** | **Documents** | **Alerts** — note this is a 4-tab set for the supervisor's intern-detail view, matching PRD §6.4 (DTR, Sessions, Documents, Alerts) — different from the admin's 4-tab set which is DTR/Sessions/Evaluations/Documents. Supervisor's set swaps "Evaluations" for "Alerts."
- **Shifting tabs**: First Shifting | Second Shifting (active)
- Summary line: "9 Present · 4 Absent · 1 Incomplete — Second Shifting"
- Amber warning banner: *"4 absences. Early warning exceeded. Drop limit is 12 days."* — supervisor-facing phrasing of the same threshold logic, slightly different wording from the intern-facing banner ("Please speak with your supervisor" vs this administrative framing).
- **Print / Export DTR** button (outlined) top-right of the table
- DTR table: same DATE/DAY/TIME IN/TIME OUT/STATUS columns and sample rows as the intern's own Attendance screen.

### 4.8 Intern Detail — DTR tab, Mark as Excused (Page 40, center card)

Scrolling the DTR tab further down reveals:
- Heading: "Mark as Excused"
- Field: **Reason / Reference** — textarea, placeholder "e.g. Medical certificate presented"
- This is the per-row excuse-marking control described in PRD §6.4 ("per-row Mark as Excused requiring a reason/reference"). The slide doesn't show which specific date row this applies to (implies it's opened per-row, e.g. by tapping an Absent row), nor a visible Save/Submit button in the captured viewport.

### 4.9 Intern Detail — Sessions tab (Page 40, right card)

- Sub-tabs: **Sessions** active
- Progress line: "9 of 15 · Final Demo: Not yet conducted"
- Session list rows with status pill: Session 9 (Oct 9, **Pending** — amber pill, row highlighted amber/cream), Session 8 (Oct 2, 86.3% — green pill, row highlighted/expanded showing full criterion breakdown identical in structure to the intern's own evaluated-session view: six weighted criteria with scores, footer "Electronically signed by: Mr. Carlo Ferolin · Oct 2, 2024"), Session 7 (Oct 8, 86.1%), Session 6 (Oct 7, 85.9%), Session 5 (cut off, 84.7%)
- Note: status pill label here is **"Pending"** for an unevaluated session, whereas the intern's own Sessions screen used **"Assigned"** for the same state — a minor copy inconsistency (§7).

### 4.10 Intern Detail — Documents tab (Page 41, left card)

- Sub-tabs: **Documents** active
- "Session Documents" list, rows with status dot, same pattern as intern-facing Documents screen
- "End-of-Term Submissions" section: "Narrative Report — Not yet uploaded", "Teaching Portfolio — Not yet uploaded" — read-only for supervisor (view/download only, per PRD §6.7: "CT and supervisor can view/download... Only the intern uploads.")

### 4.11 Intern Detail — Alerts tab (Page 41, center card)

- Sub-tabs: **Alerts** active
- Two alert rows shown directly (not grouped by Active/Resolved sub-tabs here, since this is already scoped to one intern): "4 absences — approaching drop limit" with **Resolve** button; "CT evaluation pending 7 days" with **Resolve** button.

### 4.12 Supervisor Profile (Page 41, right card)

- Header: "Profile"
- Card: avatar "MV" (amber circle), "Prof. Maria Villanueva", "Language Education", email "mvillanueva@antiquespride.edu.ph", "School: Barbaza National High School"
- Links: **Change Password**, **Sign Out** (red)

---

## 5. Mobile PWA — Cooperating Teacher Screens

Bottom tab bar (4 items): **Home | Sessions | Documents | Profile** — no "Alerts" or "Interns" tab (CTs don't manage flags or roster; they only assign/evaluate sessions for interns already assigned to them, and view documents).

### 5.1 Home (Page 42, left card)

- Greeting: "Good morning, Mr. Ferolin"
- Subline: "Wednesday, October 9, 2024 · Barbaza National High School"
- Stat tiles (3): **1** "Interns Assigned", **1** "Awaiting Evaluation", **8** "Evaluated This Shifting"
- **Awaiting Evaluation** section: card row — "Juan Dela Cruz" bold, subline "English 9 · Oct 9, 2024" / "Session 9 · Regular Teaching", right-aligned **Evaluate** button (amber)

Note: this mockup's sample CT (Mr. Ferolin) has only 1 intern assigned, despite the Admin Accounts screen (§2.9) showing him with 13 assigned interns — a data inconsistency between slides (§7), though structurally both screens are internally consistent in layout.

### 5.2 Sessions list + Assign Session drawer (Page 42, center → right cards)

**Sessions list**:
- Header: "Sessions" + **+ Assign Session** button (amber) top-right
- Expanded/highlighted row for Session 9 (amber background, status pill **Assigned**): full detail shown inline — "Intern: Juan Dela Cruz", "Course: BSEd-English", "Subject: English 9 — 9-Rizal", "Topic: Figures of Speech", "Date: Oct 9, 2024", "School: Barbaza National High School", "Session: Regular · Session 9 of 15 · Second Shifting", "Documents: Lesson Plan uploaded · Progress Report not yet uploaded", then a full-width **Evaluate** button (amber)
- Collapsed rows below: Session 8 (Oct 2, Evaluated 86.3%), Session 7 (Oct 8, Evaluated 86.1%), Session 6 (Oct 7, Evaluated 85.9%)

**Assign Session drawer** (right card):
- Heading: "Assign Session" with × close
- Field: **Student** — dropdown, pre-filled "Juan Dela Cruz" (scoped to this CT's assigned interns only, per PRD §6.6)
- Field: **Date** — date picker, "09/10/2024" with calendar icon
- Field: **Subject** — placeholder "English 9"
- Field: **Grade & Section** — placeholder "9-Rizal"
- Field: **Topic** — placeholder "Figures of Speech"
- Field: **Session Type** — segmented control: **Regular Teaching** (active, dark fill) | **Final Demo**
- Button: **Assign** (full-width amber)
- Below the drawer (background), the newly assigned Session 9 row is visible with status pill **Assigned** (amber) — showing the result state after assignment.

This exactly matches PRD §6.6's Assign Session fields: student, date, subject, grade & section, topic, session type (Regular Teaching / Final Demo).

### 5.3 Evaluate form (Page 43, all three cards — a single scrolling form shown in 3 snapshots)

Reached by tapping **Evaluate** on an awaiting-evaluation session.

**Left card** (top of form):
- Header: "Sessions" (still showing list context above) + **+ Assign Session** button
- "Overall Rating: —.—%" (large, shown blank/live-updating before any ratings entered) with helper legend: "5 = Very Good · 4 = Good · 3 = Fair · 2 = Poor · 1 = Very Poor. Tap a number to rate each item."
- **I. Lesson Planning — 15% weight (7 items)** section, each item a text prompt + a row of 5 circular number buttons (1–5):
  1. "Specific learning outcomes are stated in behavioral terms"
  2. "There is congruence between specific learning outcomes and subject matter"
  3. "Teaching procedure is appropriate and well-structured"
  4. "Formative test is included and aligned with objectives"
  5. "Assignment is meaningful and appropriate"
  6. "Specific learning outcomes are achieved"
  7. "There is proper sequencing of the lesson"
  - This resolves PRD Open Question #2 in part — confirms all 7 Lesson Planning item texts verbatim (the PRD draft only had item count, not wording).

**Center card** (continuation, showing what is visually presented as item list 1–6, but contextually these are the **VI. Teacher's Personality** items based on position at the end of the form just before free-text fields — the slide doesn't repeat the section header due to scroll cropping, but content matches PRD's "6 items" for Teacher's Personality):
  1. "Is neat and well-groomed"
  2. "Is free from mannerisms that tend to disturb students' attention"
  3. "Shows dynamism and enthusiasm in teaching"
  4. "Has a pleasant disposition toward students"
  5. "Has a well-modulated voice"
  6. "The teacher's personality commands respect and attention"
  - This resolves the other half of PRD Open Question #2 — confirms all 6 Teacher's Personality items verbatim. **Items for Content, Teaching Methods, Classroom Management, and Questioning Skills are still NOT shown anywhere in the deck** — the open question is only partially resolved (flagged again in §7).
- Below the rating items: **Commendable observations:** — textarea (empty)
- **Areas for improvement:** — textarea (empty)
- Button: **Submit Evaluation** (full-width amber)

**Right card** (post-submit state):
- Header: "Sessions" + **+ Assign Session**
- Green success banner: "✓ Evaluation Submitted" — "Juan Dela Cruz · Session 9 · Score: 88.7%" — "Submitted: October 9, 2024, 10:42 AM by Mr. Carlo Ferolin" — this is the concrete "electronically signed by" stamp microcopy, timestamped.
- Session list now shows Session 9 with status **Evaluated 88.7%**, list continues down through Session 1 (all evaluated, scores 82.1%–86.3% visible).

### 5.4 Documents (Page 44, left card)

- Header: "Documents" — "Juan Dela Cruz" subline
- Expanded row: "Session 9 — English 9 · Oct 9, 2024" (amber/orange status dot):
  - "Lesson Plan" — "lesson_plan_oct9.pdf · Oct 9, 8:45 AM" + **View** button
  - "Progress Report" — "Not yet uploaded" (amber text, no upload button since CT cannot upload — view/download only per PRD §6.7)
- Collapsed rows below (green dots): Session 8 (Oct 2) through Session 1 (Sep 30, cut off) — CT can view all of this one intern's session documents.

### 5.5 CT Profile (Page 44, right card)

- Header: "Profile"
- Card: avatar "CF" (amber circle), "Mr. Carlo Ferolin", email "cferolin@antiquespride.edu.ph", "School: Barbaza National High School", "Interns Assigned: Juan Dela Cruz" (singular, consistent with the Home screen's "1 Interns Assigned" stat, but inconsistent with the Admin-side CT detail screen showing 13 — see §7)
- Links: **Change Password**, **Sign Out** (red)

---

## 6. Shared Component Patterns

These recur across surfaces and should be treated as reusable building blocks by implementing engineers.

### 6.1 Stat card / stat tile
A white rounded-corner card containing a large colored number (green = positive/present, red = negative/absent, amber = warning/incomplete/flagged, plain dark = neutral count) with a smaller gray label beneath. Used on: Admin Dashboard (4-up row), School Overview (3-up row), Intern Home (3-up row), CT Home (3-up row), Supervisor Home (3-4-up row).

### 6.2 Status pill / badge
Small rounded-rectangle label with colored background and matching darker text:
- **Green** ("Present", "Evaluated", "Active", "On Track", "Completed" [gray variant also seen for Completed shifting]) 
- **Amber/orange** ("Incomplete", "Assigned"/"Pending", "Behind", "Not yet assigned" as plain text not pill)
- **Red** ("Absent") — used as plain colored text more often than a pill background
- Consistently: green = good/complete/done, amber = attention-needed/in-progress, red = problem/missing.

### 6.3 Warning/threshold banner
A full-width, amber/cream-background, amber-bordered (or just tinted background) banner with left-aligned text, no icon observed, placed directly under a summary/count line and above a data table. Always carries a specific numeric threshold reference in its copy (e.g., "Early warning threshold is 3", "Drop limit is 12 days"). Appears on: Intern Attendance screen, Supervisor Intern-Detail DTR tab, Semesters page (shifting-activation warning), Intern Home (session-pace nudge).

### 6.4 Detail drawer / side panel (web) and full-screen sub-page (mobile)
On admin web: a right-side sliding drawer overlays the list with a dimmed backdrop, header with title + × close button, and often internal sub-tabs (e.g., intern detail's DTR/Sessions/Evaluations/Documents). On mobile: the equivalent is a full-screen page reached via "← Back" breadcrumb, with the same internal sub-tab pattern. Both patterns are used for: Add/Edit forms, and read-only detail views (Intern Detail, CT Detail).

### 6.5 Standard data table
Consistent structure across Schools list, Accounts lists, Reports tabs, Intern DTR/Sessions lists: header row in uppercase small-caps gray text, data rows in white with subtle row separators (no heavy borders/zebra striping observed), right-aligned or trailing action buttons/links per row (View / Edit / Delete, or View Profile / Unassign), numeric/status columns often color-coded.

### 6.6 Tab bar / segmented control
Two visually distinct variants:
- **Pill-style full-width segmented tabs** (e.g., School Detail's Overview/Interns/Resolved Alerts, Accounts' Interns/Supervisors/Cooperating Teachers, Settings' My Account/Flagging Rules/Check-in, Reports' Attendance/Session & Document Compliance/Resolved Alerts, mobile Intern-Detail's DTR/Sessions/Documents/Alerts): active segment gets solid dark-navy fill with amber/gold text; inactive segments are plain text on white/transparent.
- **Two-way shifting toggle** (First Shifting / Second Shifting): same visual treatment, smaller, appears wherever content is shifting-scoped (Attendance, Sessions, Documents screens on mobile).

### 6.7 Primary/secondary button convention
- **Primary action** = full-width or prominent, solid amber/gold fill, dark text (Sign In, Add School, Save Changes, Submit Evaluation, Assign, Create, Evaluate, Time-related Save buttons).
- **Secondary/alternate action** = solid dark-navy fill with amber text (Submit Registration on the CT registration form; Resolve button on alert cards) — used when there's a primary/secondary pairing or to visually differentiate a less-common but still significant action.
- **Tertiary/outlined action** = white background, thin border, dark text (View, View Profile, Print/Export DTR, Upload File, Edit in some contexts).
- **Destructive action** = plain red text, no fill, no border (Delete, Unassign, Sign Out).

### 6.8 Notification bell + panel
Bell icon top-right of every header (both surfaces), red circular badge with unread count. Tapping opens a dropdown/panel (web: appears anchored top-right; mobile: full-width panel under header) listing notifications newest-first, each with title/description line and a relative or absolute timestamp; the most recent/unread item(s) get an amber/cream background highlight.

### 6.9 Color palette (confirmed across all slides)
- **Primary dark**: navy/near-black (#1a1f38-ish) — used for header wordmark text, active-tab fills, primary headings (serif-styled), avatar circle backgrounds, secondary-button fills.
- **Primary accent**: amber/gold (#f2a91c-ish) — used for primary button fills, active-tab text-on-navy, avatar initials text-on-navy, progress bar fills, crest/logo icon, warning banner backgrounds (lighter cream/tint version), status-pill "in-progress" states.
- **Success**: green — present/evaluated/on-track/active-good states.
- **Danger**: red — absent/flagged/delete actions.
- **Warning**: amber/orange (same family as accent but used semantically for "needs attention" states — incomplete, behind, pending).
- **Neutral surface**: white cards on a very light warm-gray page background; gray-600-ish text for secondary/meta information (dates, subtitles, helper text).
- Headings use a serif or serif-adjacent display face (visible on "Dashboard", "Schools", "Good morning, Juan" etc.), body/table text uses a plain sans-serif.

This confirms and adds detail to CLAUDE.md's implied "dark navy + amber" palette — it is used consistently and systematically as: navy = structural/branding/active-state, amber = primary call-to-action/accent, with a conventional green/red/amber semantic triad layered on top for status communication.

---

## 7. Discrepancies Between the PPT and PRD.md / CLAUDE.md

Per instructions, these are flagged explicitly rather than silently resolved. PRD.md and CLAUDE.md remain the source of truth; the PPT is visual reference only.

1. **Time Out rule conflict is reproduced, not resolved, in the mockups.** This is literally PRD Open Question #1. The Admin Settings → Check-in tab (page 31) shows a configurable clock-time field "Time Out start: 07:30 am", while the Intern Home screen (page 33) shows static copy "Time Out — Available after 3:00 PM." The two numbers/models don't match each other in the mockup itself (07:30 AM vs 3:00 PM), and PRD §10 Q1 already flags this as unresolved. Engineers should follow whatever the PRD's eventual answer is, not either mockup value.

2. **Check-in Settings mockup values look like placeholder errors.** On the Settings → Check-in tab (page 31), both "Time In cut-off" and "Time Out start" are shown as the identical value "07:30 am" — almost certainly a copy-paste artifact in the mockup rather than an intentional design decision, since a Time Out start equal to Time In cut-off would make the workday zero-length. Do not treat this as a literal default; the School Overview card (page 7) separately shows "Time Out: open — no cut-off" as the effective value for at least one school, which is inconsistent with any specific global Time Out start actually being enforced there.

3. **Only 3 of the 5 flagging rules have visible admin UI.** PRD §6.8 lists five configurable rules: Absence early warning, Consecutive absences, Drop-eligible, Behind on session pace, and CT evaluation pending (mockup: 7 days). The Settings → Flagging Rules screen (page 30) only exposes editable fields for the first three (absence early warning = 3, consecutive absences = 3, drop-eligible = 12). "Behind on session pace" and "CT evaluation pending N days" are referenced elsewhere in the deck as active flag reasons (e.g., "CT evaluation pending 7 days" appears on Dashboard and Supervisor Alerts cards) but have no corresponding config input shown anywhere. Engineers should still make all five configurable per CLAUDE.md's "flagging rules are config, not constants" rule — the missing UI fields are a mockup gap, not a signal that those two rules should be hardcoded.

4. **CT ↔ Intern assignment mechanism is never shown, reproducing PRD Open Question #7.** Admin's CT detail view (page 19) and the CT's own Home/Profile screens (pages 42, 44) both display an already-populated "Assigned Interns" list, and the CT's Assign-Session form (page 42) has a "Student" dropdown scoped to "assigned interns only" — but no slide in the entire 44-page deck shows an actual assignment action (no "Assign CT to Intern" button/form on the Admin, Supervisor, or CT side). This confirms the PRD's own flagged gap; it is not something the deck resolves.

5. **Sample data for CT Mr. Carlo Ferolin is inconsistent between the Admin and CT surfaces.** The Admin → Accounts → Cooperating Teachers → CT Detail drawer (page 19) shows Mr. Ferolin with **13** assigned interns (the full Barbaza NHS roster). The CT's own Home screen (page 42) shows "**1** Interns Assigned," and his own Profile screen (page 44) lists only "Juan Dela Cruz" as the sole assigned intern. This is very likely just inconsistent mock data across slides made at different times, not an intentional design difference — but it's worth flagging so engineers don't infer a rule from it (e.g., don't assume a CT's dashboard stat is scoped differently from their roster on purpose).

6. **Minor copy inconsistencies for the same status/field across surfaces** (unlikely to be intentional, but noted for consistency review):
   - Unevaluated-session status pill reads **"Assigned"** on the Intern's own Sessions screen (page 33) and inside the CT's Assign Session flow (page 42), but reads **"Pending"** on the Supervisor's Intern Detail → Sessions tab (page 40). PRD/CLAUDE.md's data model (`TeachingSession.status`) only defines `ASSIGNED`/`EVALUATED` as the enum values — "Pending" appears to be a display-label variant for `ASSIGNED`, not a third state. Engineers should treat these as the same underlying status with two different rendered labels, and probably standardize on one label.
   - The evaluation free-text field for constructive feedback is labeled **"Areas for improvement:"** on the CT's Evaluate form (page 43) and the Admin's Evaluations tab (page 15) as "Needs Improvement:", but rendered as **"For improvement:"** on the Intern's expanded session card (page 34). All three refer to the same `areasForImprovement` data field per PRD §6.6/§8.

7. **PRD Open Question #2 (evaluation instrument completeness) is only half-answered by the deck.** The deck does confirm, verbatim, all 7 Lesson Planning items and all 6 Teacher's Personality items (page 43) — matching what PRD §10 Q2 already knew. It does **not** show any item text for Content (20%), Teaching Methods (20%), Classroom Management (15%), or Questioning Skills (15%) — those sections are never visibly scrolled-to in any slide. This open question is therefore still open; do not infer item counts or wording for those four criteria from this deck.

8. **No screen depicts the actual geofence capture / Time In button interaction.** Every mobile mockup of "today's attendance" (Intern Home, page 33) shows the *result* of a completed Time In ("Time In — 6:42 AM — Barbaza National High School" with a green check), never the button, GPS-permission prompt, in-progress/loading state, or the "out of range" failure message described in PRD §6.5. Engineers implementing the actual Time In/Time Out buttons and their success/failure states have no visual reference from this deck and should design that interaction fresh, consistent with PRD §6.5's requirements (server-side geofence check, clear out-of-range message on failure, no client-computed "inside" flag trusted).

9. **No manual/GPS-fallback override screen is shown**, consistent with PRD Open Question #6 noting this gap ("If a device's GPS fails... can a supervisor record an attendance punch on the intern's behalf?"). The Supervisor's "Mark as Excused" screen (page 40) is the only correction mechanism shown, and it is an after-the-fact excuse (with a reason/reference), not a live manual punch — it does not by itself answer Q6. Treat Q6 as still open.

10. **Supervisor Alerts tab structure differs slightly by context.** The standalone Alerts screen (page 39) has an explicit Active/Resolved tab bar. The same Alerts content nested inside Intern Detail (page 41, "Alerts" sub-tab) shows active alerts directly without a visible Active/Resolved toggle in the captured slide — it's unclear from the deck alone whether resolved alerts for that one intern are also reachable from this sub-tab (e.g., via a toggle below the fold) or only from the top-level Alerts screen. Not a hard contradiction, just an ambiguity worth confirming with product before implementation.

---

*End of specification. Compiled from 44 slide images plus PRD.md and CLAUDE.md as authoritative sources for all functional behavior; this document covers visual/navigation/copy details only.*
