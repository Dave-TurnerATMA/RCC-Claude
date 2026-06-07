import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../community-prep.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('administrator','team_lead','team_member')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','retired')),
      language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en','es','id')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS main_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      short_description TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      main_task_id INTEGER REFERENCES main_tasks(id),
      short_description TEXT NOT NULL,
      task_overview TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent','high','medium','low')),
      type TEXT NOT NULL DEFAULT 'one_off' CHECK(type IN ('one_off','recurring')),
      scheduled_date TEXT,
      default_responsible_user_id INTEGER REFERENCES users(id),
      estimate_hours REAL,
      frequency_days INTEGER,
      planned_instances INTEGER DEFAULT 2,
      top_tips TEXT,
      participants TEXT NOT NULL DEFAULT 'crew' CHECK(participants IN ('crew','none','open_optional','all_expected')),
      origin TEXT NOT NULL DEFAULT 'manual' CHECK(origin IN ('coach','manual')),
      is_archived INTEGER DEFAULT 0,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_task_crew_defaults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      UNIQUE(required_task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS required_task_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      step_text TEXT NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS required_task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      user_id INTEGER REFERENCES users(id),
      change_description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      name_en TEXT NOT NULL,
      name_es TEXT NOT NULL,
      name_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      required_task_id INTEGER REFERENCES required_tasks(id),
      parent_scheduled_task_id INTEGER REFERENCES scheduled_tasks(id),
      short_description TEXT NOT NULL,
      task_overview TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent','high','medium','low')),
      scheduled_date TEXT,
      responsible_user_id INTEGER REFERENCES users(id),
      participants TEXT NOT NULL DEFAULT 'crew' CHECK(participants IN ('crew','none','open_optional','all_expected')),
      participation_type TEXT NOT NULL DEFAULT 'picked' CHECK(participation_type IN ('picked','open')),
      volunteer_limit INTEGER,
      location TEXT DEFAULT 'Base',
      estimate_hours REAL,
      actual_hours REAL,
      type TEXT NOT NULL CHECK(type IN ('recurring','planned','manual','follow_up')),
      state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','planned','completed','abandoned','not_required','missed','ended')),
      planning_notes TEXT,
      feedback_notes TEXT,
      work_description TEXT,
      problems TEXT,
      completed_at TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crew_participation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      source TEXT NOT NULL CHECK(source IN ('required_task_default','manually_added','self_added')),
      added_by_user_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','confirmed','declined')),
      confirmed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(scheduled_task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS task_equipment (
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      equipment_id INTEGER NOT NULL REFERENCES equipment(id),
      PRIMARY KEY (scheduled_task_id, equipment_id)
    );

    CREATE TABLE IF NOT EXISTS task_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      user_id INTEGER REFERENCES users(id),
      note_text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_task_step_checks (
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      step_id INTEGER NOT NULL REFERENCES required_task_steps(id),
      checked INTEGER NOT NULL DEFAULT 1,
      checked_at TEXT DEFAULT (datetime('now')),
      checked_by_user_id INTEGER REFERENCES users(id),
      PRIMARY KEY (scheduled_task_id, step_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations — safe to run on any existing DB
  try { db.exec("ALTER TABLE required_tasks ADD COLUMN participants TEXT NOT NULL DEFAULT 'crew' CHECK(participants IN ('crew','none','open_optional','all_expected'))"); } catch {}
}

export default db;
