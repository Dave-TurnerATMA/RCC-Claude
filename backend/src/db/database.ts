import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/community_prep.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('administrator', 'team_lead', 'team_member')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'resigned')),
      language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'es', 'id')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      name_en TEXT NOT NULL,
      name_es TEXT NOT NULL,
      name_id TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      short_description TEXT NOT NULL,
      overview TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
      first_scheduled_date TEXT NOT NULL,
      frequency_days INTEGER NOT NULL DEFAULT 30,
      default_responsible_user_id INTEGER REFERENCES users(id),
      estimate_hours REAL NOT NULL DEFAULT 1,
      planned_instances INTEGER NOT NULL DEFAULT 2,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS required_task_equipment (
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      equipment_id INTEGER NOT NULL REFERENCES equipment(id),
      PRIMARY KEY (required_task_id, equipment_id)
    );

    CREATE TABLE IF NOT EXISTS required_task_crew (
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (required_task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS required_task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      required_task_id INTEGER NOT NULL REFERENCES required_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      change_type TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      required_task_id INTEGER REFERENCES required_tasks(id),
      parent_task_id INTEGER REFERENCES scheduled_tasks(id),
      type TEXT NOT NULL CHECK(type IN ('scheduled', 'one_off', 'follow_up')),
      short_description TEXT NOT NULL,
      overview TEXT NOT NULL,
      scheduled_date TEXT,
      priority TEXT NOT NULL CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
      responsible_user_id INTEGER REFERENCES users(id),
      estimate_hours REAL,
      actual_hours REAL,
      planning_notes TEXT,
      feedback_notes TEXT,
      crew_type TEXT NOT NULL DEFAULT 'specific' CHECK(crew_type IN ('specific', 'open_optional', 'all_expected')),
      state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending', 'completed', 'abandoned', 'not_required', 'planned', 'missed')),
      completed_at TEXT,
      work_description TEXT,
      problems TEXT,
      instance_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_task_id INTEGER NOT NULL REFERENCES scheduled_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export default db;
