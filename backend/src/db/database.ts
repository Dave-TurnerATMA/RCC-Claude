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
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','resigned')),
      language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en','es','id')),
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

    CREATE TABLE IF NOT EXISTS required_task_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_complete INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      category_id INTEGER REFERENCES required_task_categories(id),
      short_description TEXT NOT NULL,
      overview TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent','high','medium','low')),
      is_recurring INTEGER DEFAULT 0,
      scheduled_date TEXT,
      default_responsible_user_id INTEGER REFERENCES users(id),
      estimate_hours REAL,
      task_overview TEXT,
      frequency_days INTEGER,
      planned_instances INTEGER DEFAULT 2,
      top_tips TEXT,
      origin TEXT NOT NULL DEFAULT 'manual' CHECK(origin IN ('coach','manual')),
      created_by INTEGER REFERENCES users(id),
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_task_crew (
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (required_task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS required_task_equipment (
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      equipment_id INTEGER NOT NULL REFERENCES equipment(id),
      PRIMARY KEY (required_task_id, equipment_id)
    );

    CREATE TABLE IF NOT EXISTS required_task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      user_id INTEGER REFERENCES users(id),
      change_description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      required_task_id INTEGER REFERENCES required_tasks(id),
      parent_task_id INTEGER REFERENCES scheduled_tasks(id),
      type TEXT NOT NULL CHECK(type IN ('recurring','planned','manual','follow_up')),
      short_description TEXT NOT NULL,
      overview TEXT NOT NULL,
      scheduled_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent','high','medium','low')),
      state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','completed','abandoned','not_required','planned','missed')),
      responsible_user_id INTEGER REFERENCES users(id),
      crew_type TEXT NOT NULL DEFAULT 'specific' CHECK(crew_type IN ('specific','open_optional','all_expected')),
      estimate_hours REAL,
      actual_hours REAL,
      planning_notes TEXT,
      feedback_notes TEXT,
      work_description TEXT,
      problems TEXT,
      completed_at TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_crew (
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (scheduled_task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS task_equipment (
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      equipment_id INTEGER NOT NULL REFERENCES equipment(id),
      PRIMARY KEY (scheduled_task_id, equipment_id)
    );

    CREATE TABLE IF NOT EXISTS task_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_task_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      step_text TEXT NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scheduled_task_step_checks (
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      step_id INTEGER NOT NULL REFERENCES required_task_steps(id),
      PRIMARY KEY (scheduled_task_id, step_id)
    );
  `);
}

export default db;
