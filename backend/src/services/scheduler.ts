import db from '../db/database';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Called when a required task gets its scheduled_date set for the first time
export function createScheduledTasksForRequired(requiredTaskId: number, teamId: number) {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ? AND team_id = ?').get(requiredTaskId, teamId) as any;
  if (!rt || !rt.scheduled_date) return;

  const type = rt.is_recurring ? 'recurring' : 'planned';
  const crewIds = (db.prepare('SELECT user_id FROM required_task_crew WHERE required_task_id = ?').all(requiredTaskId) as any[]).map(r => r.user_id);
  const equipIds = (db.prepare('SELECT equipment_id FROM required_task_equipment WHERE required_task_id = ?').all(requiredTaskId) as any[]).map(r => r.equipment_id);

  const firstId = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, state, responsible_user_id, estimate_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(teamId, requiredTaskId, type, rt.short_description, rt.overview, rt.scheduled_date, rt.priority, rt.default_responsible_user_id || null, rt.estimate_hours || null).lastInsertRowid;

  for (const uid of crewIds) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(firstId, uid);
  for (const eqId of equipIds) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(firstId, eqId);

  if (!rt.is_recurring || !rt.frequency_days) return;

  const count = rt.planned_instances || 2;
  for (let i = 1; i <= count; i++) {
    const date = addDays(rt.scheduled_date, rt.frequency_days * i);
    const id = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, state, responsible_user_id, estimate_hours)
      VALUES (?, ?, 'recurring', ?, ?, ?, ?, 'planned', ?, ?)
    `).run(teamId, requiredTaskId, rt.short_description, rt.overview, date, rt.priority, rt.default_responsible_user_id || null, rt.estimate_hours || null).lastInsertRowid;
    for (const uid of crewIds) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(id, uid);
    for (const eqId of equipIds) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(id, eqId);
  }
}

// Called after a recurring task is completed
export function promoteNextPlannedTask(requiredTaskId: number, teamId: number) {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(requiredTaskId) as any;
  if (!rt || !rt.is_recurring || !rt.frequency_days) return;

  const crewIds = (db.prepare('SELECT user_id FROM required_task_crew WHERE required_task_id = ?').all(requiredTaskId) as any[]).map(r => r.user_id);

  // Promote earliest planned → pending
  const nextPlanned = db.prepare(
    "SELECT * FROM scheduled_tasks WHERE required_task_id = ? AND state = 'planned' ORDER BY scheduled_date ASC LIMIT 1"
  ).get(requiredTaskId) as any;

  if (nextPlanned) {
    db.prepare("UPDATE scheduled_tasks SET state = 'pending', updated_at = datetime('now') WHERE id = ?").run(nextPlanned.id);
  } else {
    const lastTask = db.prepare(
      "SELECT * FROM scheduled_tasks WHERE required_task_id = ? AND state NOT IN ('abandoned') ORDER BY scheduled_date DESC LIMIT 1"
    ).get(requiredTaskId) as any;
    if (!lastTask) return;
    const nextDate = addDays(lastTask.scheduled_date, rt.frequency_days);
    const id = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, state, responsible_user_id, estimate_hours)
      VALUES (?, ?, 'recurring', ?, ?, ?, ?, 'pending', ?, ?)
    `).run(rt.team_id, requiredTaskId, rt.short_description, rt.overview, nextDate, rt.priority, rt.default_responsible_user_id || null, rt.estimate_hours || null).lastInsertRowid;
    for (const uid of crewIds) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(id, uid);
  }

  // Ensure correct number of planned instances
  const plannedCount = (db.prepare("SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE required_task_id = ? AND state = 'planned'").get(requiredTaskId) as any).cnt;
  const needed = (rt.planned_instances || 2) - plannedCount;

  if (needed > 0) {
    const lastTask = db.prepare(
      "SELECT * FROM scheduled_tasks WHERE required_task_id = ? AND state NOT IN ('abandoned') ORDER BY scheduled_date DESC LIMIT 1"
    ).get(requiredTaskId) as any;
    if (!lastTask) return;
    for (let i = 1; i <= needed; i++) {
      const date = addDays(lastTask.scheduled_date, rt.frequency_days * i);
      const id = db.prepare(`
        INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, state, responsible_user_id, estimate_hours)
        VALUES (?, ?, 'recurring', ?, ?, ?, ?, 'planned', ?, ?)
      `).run(rt.team_id, requiredTaskId, rt.short_description, rt.overview, date, rt.priority, rt.default_responsible_user_id || null, rt.estimate_hours || null).lastInsertRowid;
      for (const uid of crewIds) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(id, uid);
    }
  }
}
