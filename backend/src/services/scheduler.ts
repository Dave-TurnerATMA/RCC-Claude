import db from '../db/database';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Creates Pending + Planned STs for a required task when scheduled_date is set
export function createScheduledTasksForRequired(requiredTaskId: number, teamId: number) {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ? AND team_id = ?').get(requiredTaskId, teamId) as any;
  if (!rt || !rt.scheduled_date) return;

  // Don't create if there's already a pending/planned ST for this RT
  const existingActive = (db.prepare(
    "SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE required_task_id = ? AND state IN ('pending','planned')"
  ).get(requiredTaskId) as any).cnt;
  if (existingActive > 0) return;

  const type = rt.type === 'recurring' ? 'recurring' : 'planned';
  const participants = rt.participants || 'crew';

  // Get crew defaults (only active users)
  const crewDefaults = db.prepare(`
    SELECT rtcd.user_id FROM required_task_crew_defaults rtcd
    JOIN users u ON u.id = rtcd.user_id
    WHERE rtcd.required_task_id = ? AND u.status = 'active'
  `).all(requiredTaskId) as any[];

  // Create the first (Pending) ST
  const firstId = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, task_overview,
      scheduled_date, priority, state, responsible_user_id, estimate_hours, participants, participation_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'picked')
  `).run(
    teamId, requiredTaskId, type, rt.short_description, rt.task_overview,
    rt.scheduled_date, rt.priority, rt.default_responsible_user_id || null,
    rt.estimate_hours || null, participants
  ).lastInsertRowid as number;

  for (const { user_id } of crewDefaults) {
    db.prepare(`
      INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status)
      VALUES (?, ?, 'required_task_default', NULL, 'invited')
    `).run(firstId, user_id);
  }

  if (rt.type !== 'recurring' || !rt.frequency_days) return;

  const count = rt.planned_instances || 2;
  for (let i = 1; i <= count; i++) {
    const date = addDays(rt.scheduled_date, rt.frequency_days * i);
    const plannedId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, task_overview,
        scheduled_date, priority, state, responsible_user_id, estimate_hours, participants, participation_type)
      VALUES (?, ?, 'recurring', ?, ?, ?, ?, 'planned', ?, ?, ?, 'picked')
    `).run(
      teamId, requiredTaskId, rt.short_description, rt.task_overview,
      date, rt.priority, rt.default_responsible_user_id || null,
      rt.estimate_hours || null, participants
    ).lastInsertRowid as number;

    for (const { user_id } of crewDefaults) {
      db.prepare(`
        INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status)
        VALUES (?, ?, 'required_task_default', NULL, 'invited')
      `).run(plannedId, user_id);
    }
  }
}

// Called after a recurring task is completed — promotes next planned to pending
// and ensures correct number of planned instances exist
export function promoteNextPlannedTask(requiredTaskId: number, teamId: number) {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(requiredTaskId) as any;
  if (!rt || rt.type !== 'recurring' || !rt.frequency_days) return;

  const crewDefaults = db.prepare(`
    SELECT rtcd.user_id FROM required_task_crew_defaults rtcd
    JOIN users u ON u.id = rtcd.user_id
    WHERE rtcd.required_task_id = ? AND u.status = 'active'
  `).all(requiredTaskId) as any[];

  const participants = rt.participants || 'crew';

  // Promote earliest planned → pending
  const nextPlanned = db.prepare(
    "SELECT * FROM scheduled_tasks WHERE required_task_id = ? AND state = 'planned' ORDER BY scheduled_date ASC LIMIT 1"
  ).get(requiredTaskId) as any;

  if (nextPlanned) {
    db.prepare("UPDATE scheduled_tasks SET state='pending', updated_at=datetime('now') WHERE id = ?").run(nextPlanned.id);
  } else {
    // No planned exists — create a new pending
    const lastTask = db.prepare(
      "SELECT * FROM scheduled_tasks WHERE required_task_id = ? AND state NOT IN ('abandoned','ended') ORDER BY scheduled_date DESC LIMIT 1"
    ).get(requiredTaskId) as any;
    if (!lastTask) return;
    const nextDate = addDays(lastTask.scheduled_date, rt.frequency_days);
    const newId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, task_overview,
        scheduled_date, priority, state, responsible_user_id, estimate_hours, participants, participation_type)
      VALUES (?, ?, 'recurring', ?, ?, ?, ?, 'pending', ?, ?, ?, 'picked')
    `).run(
      teamId, requiredTaskId, rt.short_description, rt.task_overview,
      nextDate, rt.priority, rt.default_responsible_user_id || null,
      rt.estimate_hours || null, participants
    ).lastInsertRowid as number;

    for (const { user_id } of crewDefaults) {
      db.prepare(`
        INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status)
        VALUES (?, ?, 'required_task_default', NULL, 'invited')
      `).run(newId, user_id);
    }
  }

  // Ensure correct number of planned instances exist
  const plannedCount = (db.prepare(
    "SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE required_task_id = ? AND state = 'planned'"
  ).get(requiredTaskId) as any).cnt;
  const needed = (rt.planned_instances || 2) - plannedCount;

  if (needed > 0) {
    const lastTask = db.prepare(
      "SELECT * FROM scheduled_tasks WHERE required_task_id = ? AND state NOT IN ('abandoned','ended') ORDER BY scheduled_date DESC LIMIT 1"
    ).get(requiredTaskId) as any;
    if (!lastTask) return;
    for (let i = 1; i <= needed; i++) {
      const date = addDays(lastTask.scheduled_date, rt.frequency_days * i);
      const newId = db.prepare(`
        INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, task_overview,
          scheduled_date, priority, state, responsible_user_id, estimate_hours, participants, participation_type)
        VALUES (?, ?, 'recurring', ?, ?, ?, ?, 'planned', ?, ?, ?, 'picked')
      `).run(
        teamId, requiredTaskId, rt.short_description, rt.task_overview,
        date, rt.priority, rt.default_responsible_user_id || null,
        rt.estimate_hours || null, participants
      ).lastInsertRowid as number;

      for (const { user_id } of crewDefaults) {
        db.prepare(`
          INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status)
          VALUES (?, ?, 'required_task_default', NULL, 'invited')
        `).run(newId, user_id);
      }
    }
  }
}

// Mark overdue recurring tasks as missed (called periodically or on request)
export function markMissedTasks(teamId: number, _db: any = db) {
  _db.prepare(`
    UPDATE scheduled_tasks SET state='missed', updated_at=datetime('now')
    WHERE team_id=? AND type='recurring' AND state IN ('pending','planned')
    AND scheduled_date < date('now')
  `).run(teamId);
}
