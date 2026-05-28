import db from '../db/database';

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

export function createScheduledTasksForRequired(requiredTaskId: number, teamId: number) {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(requiredTaskId) as any;
  if (!rt) return;

  const crew = db.prepare('SELECT user_id FROM required_task_crew WHERE required_task_id = ?').all(requiredTaskId) as any[];
  const equipment = db.prepare('SELECT equipment_id FROM required_task_equipment WHERE required_task_id = ?').all(requiredTaskId) as any[];

  const existing = (db.prepare('SELECT COUNT(*) as count FROM scheduled_tasks WHERE required_task_id = ?').get(requiredTaskId) as any).count;
  if (existing > 0) return;

  let currentDate = rt.first_scheduled_date;

  const pendingId = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, instance_number)
    VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, 'pending', 1)
  `).run(teamId, requiredTaskId, rt.short_description, rt.overview, currentDate, rt.priority, rt.default_responsible_user_id, rt.estimate_hours).lastInsertRowid as number;

  for (const c of crew) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(pendingId, c.user_id);
  for (const e of equipment) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(pendingId, e.equipment_id);

  for (let i = 0; i < rt.planned_instances; i++) {
    currentDate = addDays(currentDate, rt.frequency_days);
    const plannedId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, instance_number)
      VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, 'planned', ?)
    `).run(teamId, requiredTaskId, rt.short_description, rt.overview, currentDate, rt.priority, rt.default_responsible_user_id, rt.estimate_hours, i + 2).lastInsertRowid as number;

    for (const c of crew) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(plannedId, c.user_id);
    for (const e of equipment) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(plannedId, e.equipment_id);
  }
}

export function promoteNextPlannedTask(requiredTaskId: number, teamId: number) {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(requiredTaskId) as any;
  if (!rt) return;

  const nextPlanned = db.prepare(`
    SELECT * FROM scheduled_tasks
    WHERE required_task_id = ? AND state = 'planned'
    ORDER BY scheduled_date ASC LIMIT 1
  `).get(requiredTaskId) as any;

  if (nextPlanned) {
    db.prepare("UPDATE scheduled_tasks SET state = 'pending', updated_at = datetime('now') WHERE id = ?").run(nextPlanned.id);
  }

  const plannedCount = (db.prepare("SELECT COUNT(*) as count FROM scheduled_tasks WHERE required_task_id = ? AND state = 'planned'").get(requiredTaskId) as any).count;

  if (plannedCount < rt.planned_instances) {
    const latest = db.prepare('SELECT MAX(scheduled_date) as max_date, MAX(instance_number) as max_instance FROM scheduled_tasks WHERE required_task_id = ?').get(requiredTaskId) as any;
    const newDate = addDays(latest.max_date, rt.frequency_days);
    const newInstance = (latest.max_instance || 0) + 1;

    const crew = db.prepare('SELECT user_id FROM required_task_crew WHERE required_task_id = ?').all(requiredTaskId) as any[];
    const equipment = db.prepare('SELECT equipment_id FROM required_task_equipment WHERE required_task_id = ?').all(requiredTaskId) as any[];

    const newId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, instance_number)
      VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, 'planned', ?)
    `).run(teamId, requiredTaskId, rt.short_description, rt.overview, newDate, rt.priority, rt.default_responsible_user_id, rt.estimate_hours, newInstance).lastInsertRowid as number;

    for (const c of crew) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(newId, c.user_id);
    for (const e of equipment) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(newId, e.equipment_id);
  }
}
