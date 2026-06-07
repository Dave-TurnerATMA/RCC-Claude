# Community Preparation Planning — Application Specification

## Overview

A mobile-first web application for community disaster-preparedness teams to plan, schedule, and track recurring and one-off preparation tasks. Team administrators manage a library of required tasks and their scheduling; crew members see their upcoming work, confirm participation, and record completions.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via `better-sqlite3` (synchronous) |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| i18n | react-i18next (EN / ES / ID) |
| AI | Anthropic Claude API (Haiku 4.5) |
| Process manager | PM2 |
| Reverse proxy | Nginx |

The frontend is built to `frontend/dist/` and served as static files by the backend Express server. DB file lives at `backend/community-prep.db`.

---

## Data Model

### teams
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT NOT NULL | |
| created_at | TEXT | datetime('now') |

### users
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| team_id | INTEGER FK → teams | |
| name | TEXT NOT NULL | |
| email | TEXT NOT NULL | |
| role | TEXT | `administrator` · `team_lead` · `team_member` |
| status | TEXT | `active` · `inactive` · `retired` |
| language | TEXT | `en` · `es` · `id` |
| created_at | TEXT | |

### main_tasks
Groups of related required tasks. Equivalent to categories.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| team_id | INTEGER FK → teams | |
| short_description | TEXT NOT NULL | |
| display_order | INTEGER | Default 0 |
| created_at | TEXT | |

### required_tasks
The master library of tasks a team must perform. Each one can generate multiple scheduled task instances.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| team_id | INTEGER FK → teams | |
| main_task_id | INTEGER FK → main_tasks | Nullable |
| short_description | TEXT NOT NULL | |
| task_overview | TEXT NOT NULL | |
| priority | TEXT | `urgent` · `high` · `medium` · `low` |
| type | TEXT | `one_off` · `recurring` |
| scheduled_date | TEXT | First/only scheduled date (YYYY-MM-DD) |
| default_responsible_user_id | INTEGER FK → users | Nullable |
| estimate_hours | REAL | Nullable |
| frequency_days | INTEGER | Recurring interval in days |
| planned_instances | INTEGER | How many future instances to pre-create (default 2) |
| top_tips | TEXT | Nullable |
| participants | TEXT | `crew` · `none` · `open_optional` · `all_expected` |
| origin | TEXT | `manual` · `coach` |
| is_archived | INTEGER | 0/1, default 0 |
| created_by_user_id | INTEGER FK → users | Nullable |
| created_at | TEXT | |
| updated_at | TEXT | |

### required_task_crew_defaults
Default crew members auto-invited when a scheduled task instance is created.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| required_task_id | INTEGER FK → required_tasks | |
| user_id | INTEGER FK → users | |
| — | UNIQUE | (required_task_id, user_id) |

### required_task_steps
Ordered checklist steps for a required task.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| required_task_id | INTEGER FK → required_tasks | |
| step_text | TEXT NOT NULL | |
| display_order | INTEGER | Default 0 |

### required_task_logs
Audit trail of changes to required tasks.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| required_task_id | INTEGER FK → required_tasks | |
| user_id | INTEGER FK → users | Nullable |
| change_description | TEXT NOT NULL | |
| created_at | TEXT | |

### scheduled_tasks
Concrete instances of work — either generated from a required task or created ad hoc.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| team_id | INTEGER FK → teams | |
| required_task_id | INTEGER FK → required_tasks | Nullable (null = ad hoc) |
| parent_scheduled_task_id | INTEGER FK → scheduled_tasks | Nullable (follow-up tasks) |
| short_description | TEXT NOT NULL | Copied from required task; kept in sync on rename |
| task_overview | TEXT NOT NULL | |
| priority | TEXT | `urgent` · `high` · `medium` · `low` |
| scheduled_date | TEXT | YYYY-MM-DD |
| responsible_user_id | INTEGER FK → users | Nullable |
| participants | TEXT | `crew` · `none` · `open_optional` · `all_expected` |
| participation_type | TEXT | `picked` · `open` |
| volunteer_limit | INTEGER | Nullable; caps open sign-ups |
| location | TEXT | Default `'Base'` |
| estimate_hours | REAL | Nullable |
| actual_hours | REAL | Nullable; recorded at completion |
| type | TEXT | `recurring` · `planned` · `manual` · `follow_up` |
| state | TEXT | `pending` · `planned` · `completed` · `abandoned` · `not_required` · `missed` · `ended` |
| planning_notes | TEXT | Nullable |
| feedback_notes | TEXT | Nullable |
| work_description | TEXT | Recorded at completion |
| problems | TEXT | Nullable |
| completed_at | TEXT | Datetime of completion |
| created_by_user_id | INTEGER FK → users | Nullable |
| created_at | TEXT | |
| updated_at | TEXT | |

**Scheduled task `short_description` sync rule:** When a required task's `short_description` is updated, all linked scheduled tasks (regardless of state) are updated to match.

### crew_participation
Tracks which users are assigned to a scheduled task and their RSVP status.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| scheduled_task_id | INTEGER FK → scheduled_tasks | |
| user_id | INTEGER FK → users | |
| source | TEXT | `required_task_default` · `manually_added` · `self_added` |
| added_by_user_id | INTEGER FK → users | Nullable |
| status | TEXT | `invited` · `confirmed` · `declined` |
| confirmed_at | TEXT | Nullable |
| created_at | TEXT | |
| — | UNIQUE | (scheduled_task_id, user_id) |

### task_equipment
Equipment assigned to a scheduled task.

| Column | Type | Notes |
|---|---|---|
| scheduled_task_id | INTEGER FK → scheduled_tasks | |
| equipment_id | INTEGER FK → equipment | |
| — | PRIMARY KEY | (scheduled_task_id, equipment_id) |

### task_notes
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| scheduled_task_id | INTEGER FK → scheduled_tasks | |
| user_id | INTEGER FK → users | Nullable |
| note_text | TEXT NOT NULL | |
| created_at | TEXT | |

### task_uploads
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| scheduled_task_id | INTEGER FK → scheduled_tasks | |
| filename | TEXT NOT NULL | Server-side filename |
| original_name | TEXT NOT NULL | |
| mimetype | TEXT NOT NULL | |
| size | INTEGER NOT NULL | Bytes |
| created_at | TEXT | |

### scheduled_task_step_checks
Records which checklist steps have been ticked for a given scheduled task instance.

| Column | Type | Notes |
|---|---|---|
| scheduled_task_id | INTEGER FK → scheduled_tasks | |
| step_id | INTEGER FK → required_task_steps | |
| checked | INTEGER | Default 1 |
| checked_at | TEXT | |
| checked_by_user_id | INTEGER FK → users | Nullable |
| — | PRIMARY KEY | (scheduled_task_id, step_id) |

### equipment
Multilingual equipment names.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| team_id | INTEGER FK → teams | |
| name_en | TEXT NOT NULL | |
| name_es | TEXT NOT NULL | |
| name_id | TEXT NOT NULL | |
| created_at | TEXT | |

### notifications
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| team_id | INTEGER FK → teams | |
| user_id | INTEGER FK → users | Recipient |
| message | TEXT NOT NULL | |
| is_read | INTEGER | Default 0 |
| created_at | TEXT | |

### Schema migrations
New columns added to existing databases via try-catch `ALTER TABLE` statements at the end of `initializeDatabase()`, e.g.:
```sql
ALTER TABLE required_tasks ADD COLUMN participants TEXT NOT NULL DEFAULT 'crew' ...
```

---

## Enumerations

### User role
`administrator` — full access to all admin pages and actions  
`team_lead` — can manage tasks and crew within their team  
`team_member` — execution-only (crew) access

### User status
`active` — normal participation  
`inactive` — temporarily away; requires a covering user; pending tasks reassigned  
`retired` — permanently removed; cannot be reactivated; requires no active responsibilities

### Required task type
`one_off` — a single scheduled instance  
`recurring` — repeating on a fixed frequency

### Task priority
`urgent` · `high` · `medium` · `low`

### Participants
`crew` — specific named crew required  
`none` — responsible person only  
`open_optional` — anyone may help  
`all_expected` — all team members expected to attend

### Participation type (Scheduled Task)
`picked` — admin/lead selects crew members  
`open` — crew self-sign-up (optionally capped by `volunteer_limit`)

### Scheduled task state
| State | Meaning |
|---|---|
| `pending` | Next instance due; awaiting execution |
| `planned` | Future instance; not yet current |
| `completed` | Done; work records saved |
| `abandoned` | Intentionally skipped |
| `not_required` | Marked unnecessary for this cycle |
| `missed` | Was pending and passed its date without completion |
| `ended` | Recurring series concluded (date cleared while recurring) |

### Crew participation source
`required_task_default` — auto-invited from crew defaults  
`manually_added` — admin/lead explicitly added  
`self_added` — user signed up themselves (auto-confirmed)

---

## Business Rules

### Required Task scheduling
1. When `scheduled_date` is set on a required task, `createScheduledTasksForRequired()` is called.
2. It creates one `pending` scheduled task (for `scheduled_date`) and `planned_instances` additional `planned` tasks (each spaced `frequency_days` apart for recurring, or one at the same date for one-off).
3. Default crew from `required_task_crew_defaults` are auto-invited to the pending instance.
4. After a recurring task completes, `promoteNextPlannedTask()` promotes the earliest `planned` instance to `pending`, assigns default crew, and creates a new `planned` instance to maintain the pipeline.
5. `markMissedTasks()` marks overdue `pending`/`planned` recurring tasks as `missed`.

### Scheduled date changes on a Required Task
| Scenario | Effect on existing Scheduled Tasks |
|---|---|
| Date cleared (set to null) — one-off | All `pending`/`planned` → `abandoned` |
| Date cleared (set to null) — recurring | All `pending`/`planned` → `ended` |
| Date set for the first time | Creates scheduled task instances |
| Date changed (no completions exist) | `pending` instances updated to new date; `planned` deleted and recreated |
| Date changed (completions exist) | **Rejected** — returns 400 error |

### Short description sync
When a required task's `short_description` is updated, all linked scheduled tasks have their `short_description` updated to match, regardless of state.

### Date display for recurring tasks
When a recurring required task has at least one completed scheduled instance:
- Display **Last** (↩) — the `scheduled_date` of the most recently completed instance
- Display **Next** (→) — the `scheduled_date` of the next `pending` or `planned` instance

These replace the static `scheduled_date` stored on the required task in all task list displays.

When no completions exist, display the required task's `scheduled_date` as normal.

### User status transitions
- **Active → Inactive**: Requires a `covering_user_id`; all `pending`/`planned` scheduled tasks where the user is `responsible_user_id` are reassigned to the covering user; notification sent to covering user.
- **Inactive → Retired**: Blocked if user is `responsible_user_id` on any active task, or is in `crew_participation` as non-declined on any active task.
- **Active → Retired**: Not permitted directly.

### Equipment deletion
Blocked if the equipment is referenced in any `task_equipment` record.

### Main task deletion
Blocked if the main task has any non-archived required tasks.

---

## API Endpoints

All endpoints are prefixed `/api/teams/:teamId/` unless noted.

### Teams
| Method | Path | Description |
|---|---|---|
| GET | `/api/teams` | List all teams |

### Users
| Method | Path | Description |
|---|---|---|
| GET | `users` | List team users with active task counts |
| POST | `users` | Create user |
| PUT | `users/:id` | Update user (handles status transition logic) |

### Equipment
| Method | Path | Description |
|---|---|---|
| GET | `equipment` | List team equipment |
| POST | `equipment` | Create with auto-translation to ES/ID |
| PUT | `equipment/:id` | Update multilingual names |
| DELETE | `equipment/:id` | Delete (blocked if in use) |

### Main Tasks
| Method | Path | Description |
|---|---|---|
| GET | `main-tasks` | List groups with enriched sub-tasks (includes completion stats, last/next dates) |
| POST | `main-tasks` | Create group |
| PUT | `main-tasks/:id` | Update group |
| DELETE | `main-tasks/:id` | Delete (blocked if has sub-tasks) |

### Required Tasks
| Method | Path | Description |
|---|---|---|
| GET | `required-tasks` | List all non-archived required tasks with completion stats |
| POST | `required-tasks` | Create required task |
| PUT | `required-tasks/:id` | Update (handles scheduled_date logic; syncs short_description to STs) |
| POST | `required-tasks/:id/archive` | Archive task |
| GET | `required-tasks/:id/logs` | View change log |
| GET | `required-tasks/:id/summary` | AI-generated insights from completion history |

**Enriched required task response** includes: `crew_defaults` (user objects), `steps` (ordered steps), `completion_count`, `last_completed_at`, `avg_effort`, `avg_crew_size`, `last_completed_scheduled_date`, `next_scheduled_date`.

### Scheduled Tasks
| Method | Path | Description |
|---|---|---|
| GET | `scheduled-tasks` | List active tasks; filterable by `state`, `type`, `view`, `user_id`, `order`, `required_task_id` |
| GET | `scheduled-tasks/history` | List completed/ended/missed/abandoned tasks |
| GET | `scheduled-tasks/:id` | Full detail with crew, equipment, notes, uploads, step checks |
| POST | `scheduled-tasks` | Create ad hoc task |
| PUT | `scheduled-tasks/:id` | Update fields |
| POST | `scheduled-tasks/:id/complete` | Complete with outcome, hours, work description, equipment |
| POST | `scheduled-tasks/:id/progress` | Save mid-task progress notes |
| POST | `scheduled-tasks/:id/crew` | Add crew member |
| DELETE | `scheduled-tasks/:id/crew/:userId` | Remove (marks declined) |
| POST | `scheduled-tasks/:id/crew/:userId/confirm` | Confirm participation |
| POST | `scheduled-tasks/:id/notes` | Add note |
| POST | `scheduled-tasks/:id/request-takeover` | Notify admins/leads of takeover request |
| POST | `scheduled-tasks/:id/step-checks` | Update step check state |

**`GET scheduled-tasks` view filter values:**
- `mine` — tasks where user is crew (non-declined)
- `responsible` — tasks where user is responsible
- `unassigned` — tasks with no responsible user
- `involved` — union of mine + responsible

**`GET scheduled-tasks` state filter values:**
- `active` — pending + planned
- Any specific state value

### Notifications
| Method | Path | Description |
|---|---|---|
| GET | `notifications/:userId` | Get up to 50 unread notifications |
| PUT | `notifications/:id/read` | Mark as read |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `dashboard` | Stats: tasks by state, overdue, top performers, activity (14d), upcoming (14d), open one-offs |

### Uploads
| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Upload file; returns filename |
| GET | `/uploads/:filename` | Serve uploaded file |

---

## Frontend Structure

### Routing

| Path | Component | Access |
|---|---|---|
| `/` | Login | Public (redirects if logged in) |
| `/happening` | WhatsHappening | All users |
| `/schedule` | YourSchedule | All users |
| `/team-activity` | TeamActivity | All users |
| `/history` | YourHistory | All users |
| `/admin/dashboard` | Dashboard | Admin/lead |
| `/admin/activity` | ActivityOverview | Admin/lead |
| `/admin/planned-tasks` | PlannedTasks | Admin/lead |
| `/admin/resources` | Resources | Admin/lead |
| `/admin/team-members` | TeamMembers | Admin/lead |

### Navigation (Layout.tsx)

**Top bar**: App title · Team/user indicator · Language selector (EN/ES/ID) · Notification bell with unread badge · Admin/Crew toggle

**Bottom tabs — Execution mode:**
- Happening · Schedule · Team Activity · History

**Bottom tabs — Admin mode:**
- Dashboard · Activity · Planned Tasks · Resources · Team Members

### Pages

#### Login
Team and user selector. Stores `teamId` and `userId` in `AppContext`. Persists to localStorage.

#### WhatsHappening (`/happening`)
Crew-facing dashboard. Shows overdue tasks (red), current pending tasks, and upcoming planned tasks. Quick action buttons to manage or complete tasks.

#### YourSchedule (`/schedule`)
Personal task list filtered to the current user's assignments. Grouped by state or date. Supports quick complete and manage actions.

#### TeamActivity (`/team-activity`)
Team-wide active task list.
- **Filters**: All / Unassigned / My Responsibility / Involved
- **State filter**: Active / Pending / Planned / Completed / Missed
- **Order**: By date / priority / estimate
- Create ad hoc task button
- Task cards: status badge, crew count, overdue warning, assignment dropdown (admin), complete/takeover buttons

#### YourHistory (`/history`)
Personal completion history — completed, abandoned, missed, ended tasks.

#### Dashboard (`/admin/dashboard`)
Analytics widgets: tasks-by-state counts, overdue metrics, top performers (last 30 days), activity heatmap (last 14 days), upcoming tasks (next 14 days), open one-off statistics.

#### PlannedTasks (`/admin/planned-tasks`)
Master management page for the required task library.

**Left panel**: Hierarchical list of main tasks with collapsible sub-task rows. Each row shows: type icon (🔄 recurring / 📌 one-off), description, priority badge, frequency, estimate, completion count, and dates.

**Date display in sub-task rows:**
- Recurring task with ≥1 completion → shows `↩ [last date]` and `→ [next date]`
- All others → shows `📅 [scheduled_date]`

**Modals:**
- **SubTaskForm**: Create/edit required task — type toggle (locked after scheduling), first scheduled date, frequency days, planned instances, priority, participants, estimate, responsible user, top tips, steps editor, default crew multi-select
- **MainTaskForm**: Create/edit group name
- **SubTaskDetail**: Read-only view with tabs — Overview (all fields), Logs (audit trail), AI Summary (generated insights)
- **ScheduledTasksModal**: View/manage all scheduled instances of a required task

#### ActivityOverview (`/admin/activity`)
High-level status view of all planned activity.

**View toggle**: Planned (required task view) / Adhoc (manual scheduled tasks without a required task)

**Planned view — Grouped mode**: Main task groups, collapsible. Each row: type icon, description, group label (hidden on mobile), state badge.

**Planned view — Sort by date mode**: Flat list sorted by effective date (next scheduled date). Rows include: type icon, description, group chip, date(s), state badge.

**Date display in rows:**
- Recurring task with ≥1 completion → shows `↩ [last date] → [next date]`  
- All others → shows single date when Sort by Date is active

**State badges for required tasks:**
| Condition | Badge |
|---|---|
| No scheduled_date | Unplanned (gray) |
| Has completions, no active STs | Completed (green) |
| Scheduled_date set, no STs yet | Scheduled (purple) |
| Pending ST, past due | Overdue (red) |
| Pending ST, not yet due | Pending (yellow) |
| Planned ST | Planned (blue) |

**Adhoc view**: List of scheduled tasks with no required_task_id. Click to open TaskManageModal.

#### Resources (`/admin/resources`)
Equipment CRUD. Shows EN/ES/ID names. Create uses AI auto-translation from English. Delete blocked if equipment is in use.

#### TeamMembers (`/admin/team-members`)
User management. Role and status management. Status transitions enforce business rules (task reassignment, retirement validation). Language preference per user.

### Shared Components

| Component | Purpose |
|---|---|
| `Modal` | Generic modal with size variants (base/lg/xl), click-outside close |
| `PriorityBadge` | Color-coded priority chip |
| `StateBadge` | Color-coded state chip |
| `TaskManageModal` | Full task detail + crew/equipment/notes/uploads/steps management |
| `CompleteTaskModal` | Multi-step completion form (outcome, hours, work description, problems, equipment, follow-up) |
| `TaskDetailsModal` | Read-only task detail display |

---

## Scheduler Service

**`createScheduledTasksForRequired(requiredTaskId, teamId)`**
- Creates one `pending` ST at `scheduled_date` and `planned_instances` `planned` STs at intervals of `frequency_days`
- Auto-invites users from `required_task_crew_defaults` into the pending ST as `required_task_default` / `invited`

**`promoteNextPlannedTask(requiredTaskId, teamId)`**
- Called after a recurring ST completes
- Promotes earliest `planned` ST → `pending`, assigns default crew
- Creates one new `planned` ST to maintain the pipeline count

**`markMissedTasks(teamId)`**
- Marks `pending`/`planned` recurring STs past their `scheduled_date` as `missed`

---

## AI Service

Uses **Anthropic Claude Haiku 4.5** (`claude-haiku-4-5-20251001`).

**`generateTaskSummary(requiredTaskId)`**
Queries the last 10 completed scheduled tasks for the required task, including crew size, actual hours, work description, and problems. Returns a practical 2–3 sentence summary for volunteers. Returns a default message if no history exists.

**`translateEquipment(nameEn)`**
Translates an English equipment name to Spanish and Indonesian. Returns `{ es, id }`. Falls back to the English name on error.

---

## Internationalisation

Supported languages: **English** (`en`) · **Spanish** (`es`) · **Indonesian** (`id`)

Language is stored per-user in the database and in localStorage. The UI language switches immediately on change.

i18n keys cover: navigation, common actions, task/project terms, priority/state/role/status enums, filter options, login flow, admin workflows, task completion dialog, dashboard metrics.

Equipment names are stored in three language columns and displayed in the user's selected language.

---

## Seed Data

Three teams are created on first startup (skipped if `teams` table already has rows):

| Team | Type | Admin |
|---|---|---|
| Desa Maju Flood Response Team | Flood | Dave Turner (davet.home@gmail.com) |
| Kampung Sejahtera Fire Safety Team | Fire | Supriyanto |
| Dusun Damai Earthquake Preparedness | Earthquake | Teguh Santoso |

Team 3 has no scheduled task instances (useful for testing a fresh state).

Each team seeds: users with varied roles/statuses/languages, equipment, main tasks, required tasks with crew defaults and steps, scheduled task instances (past completed, current pending, future planned), notifications, and required task logs.

---

## Deployment

The app runs on Ubuntu 22.04 (EC2) managed by PM2, proxied by Nginx.

**Key scripts in the project root:**

`destroy-and-reinstall.sh` — Stops PM2, deletes the database, pulls the latest code from the git branch, reinstalls dependencies, rebuilds, and restarts. The database is re-seeded on first startup.

`update.sh` — Non-destructive update: pulls code, rebuilds, restarts without clearing data.

`ec2-setup.sh` — First-time server setup.

`nginx-setup.sh` — Nginx configuration.

**DB path**: `backend/community-prep.db` (resolved as `path.join(__dirname, '../../community-prep.db')` from the compiled `backend/dist/db/database.js`)

**Git branch**: `claude/focused-volta-rLmgU`
