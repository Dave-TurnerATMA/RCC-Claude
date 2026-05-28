import { Router } from 'express';
import db from '../db/database';
import { createScheduledTasksForRequired } from '../services/scheduler';
import { generateTaskSummary } from '../services/ai';

const router = Router();

router.get('/:teamId/required-tasks', (req, res) => {
  const tasks = db.prepare(`
    SELECT rt.*, u.name as responsible_user_name,
      (SELECT COUNT(*) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state NOT IN ('completed','abandoned','missed')) as open_instances,
      (SELECT COUNT(*) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as completed_count
    FROM required_tasks rt
    LEFT JOIN users u ON rt.default_responsible_user_id = u.id
    WHERE rt.team_id = ? AND rt.archived = 0
    ORDER BY CASE rt.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, rt.short_description
  `).all(req.params.teamId);

  const fullTasks = tasks.map((t: any) => ({
    ...t,
    crew: db.prepare('SELECT u.* FROM users u JOIN required_task_crew rtc ON u.id = rtc.user_id WHERE rtc.required_task_id = ?').all(t.id),
    equipment: db.prepare('SELECT e.* FROM equipment e JOIN required_task_equipment rte ON e.id = rte.equipment_id WHERE rte.required_task_id = ?').all(t.id),
  }));

  res.json(fullTasks);
});

router.get('/:teamId/required-tasks/:id', (req, res) => {
  const task = db.prepare(`
    SELECT rt.*, u.name as responsible_user_name
    FROM required_tasks rt
    LEFT JOIN users u ON rt.default_responsible_user_id = u.id
    WHERE rt.id = ? AND rt.team_id = ?
  `).get(req.params.id, req.params.teamId) as any;
  if (!task) return res.status(404).json({ error: 'Not found' });

  task.crew = db.prepare('SELECT u.* FROM users u JOIN required_task_crew rtc ON u.id = rtc.user_id WHERE rtc.required_task_id = ?').all(task.id);
  task.equipment = db.prepare('SELECT e.* FROM equipment e JOIN required_task_equipment rte ON e.id = rte.equipment_id WHERE rte.required_task_id = ?').all(task.id);
  task.logs = db.prepare('SELECT l.*, u.name as user_name FROM required_task_logs l JOIN users u ON l.user_id = u.id WHERE l.required_task_id = ? ORDER BY l.created_at DESC').all(task.id);
  task.history = db.prepare(`
    SELECT st.*, u.name as responsible_name,
      (SELECT COUNT(*) FROM task_crew tc WHERE tc.scheduled_task_id = st.id) as crew_count
    FROM scheduled_tasks st LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.required_task_id = ? AND st.state = 'completed'
    ORDER BY st.completed_at DESC LIMIT 10
  `).all(task.id);

  res.json(task);
});

router.get('/:teamId/required-tasks/:id/summary', async (req, res) => {
  try {
    const summary = await generateTaskSummary(Number(req.params.id));
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:teamId/required-tasks', (req, res) => {
  const { short_description, overview, priority, first_scheduled_date, frequency_days, default_responsible_user_id, estimate_hours, planned_instances, equipment_ids, crew_ids, created_by_user_id } = req.body;
  if (!short_description || !overview || !priority || !first_scheduled_date || !estimate_hours) {
    return res.status(400).json({ error: 'Missing required fields: short_description, overview, priority, first_scheduled_date, estimate_hours' });
  }

  const id = db.prepare(`
    INSERT INTO required_tasks (team_id, short_description, overview, priority, first_scheduled_date, frequency_days, default_responsible_user_id, estimate_hours, planned_instances)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.teamId, short_description, overview, priority, first_scheduled_date, frequency_days || 30, default_responsible_user_id || null, estimate_hours, planned_instances || 2).lastInsertRowid as number;

  if (equipment_ids) for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(id, eqId);
  if (crew_ids) for (const uid of crew_ids) db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(id, uid);
  if (created_by_user_id) db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_type, details) VALUES (?, ?, ?, ?)').run(id, created_by_user_id, 'created', 'Required task created');

  createScheduledTasksForRequired(id, Number(req.params.teamId));
  res.json({ id, short_description });
});

router.put('/:teamId/required-tasks/:id', (req, res) => {
  const { short_description, overview, priority, first_scheduled_date, frequency_days, default_responsible_user_id, estimate_hours, planned_instances, equipment_ids, crew_ids, archived, updated_by_user_id } = req.body;
  const existing = db.prepare('SELECT * FROM required_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE required_tasks SET
      short_description = COALESCE(?, short_description),
      overview = COALESCE(?, overview),
      priority = COALESCE(?, priority),
      first_scheduled_date = COALESCE(?, first_scheduled_date),
      frequency_days = COALESCE(?, frequency_days),
      default_responsible_user_id = ?,
      estimate_hours = COALESCE(?, estimate_hours),
      planned_instances = COALESCE(?, planned_instances),
      archived = COALESCE(?, archived),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(short_description || null, overview || null, priority || null, first_scheduled_date || null, frequency_days || null,
    default_responsible_user_id !== undefined ? default_responsible_user_id : existing.default_responsible_user_id,
    estimate_hours || null, planned_instances || null, archived ?? null, req.params.id);

  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM required_task_equipment WHERE required_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }
  if (crew_ids !== undefined) {
    db.prepare('DELETE FROM required_task_crew WHERE required_task_id = ?').run(req.params.id);
    for (const uid of crew_ids) db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(req.params.id, uid);
  }

  if (updated_by_user_id) {
    const changes: string[] = [];
    if (short_description && short_description !== existing.short_description) changes.push('Description updated');
    if (priority && priority !== existing.priority) changes.push(`Priority changed to ${priority}`);
    if (archived === 1 && existing.archived === 0) changes.push('Task archived');
    if (changes.length > 0) db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_type, details) VALUES (?, ?, ?, ?)').run(req.params.id, updated_by_user_id, 'updated', changes.join('; '));
  }

  res.json({ success: true });
});

export default router;
