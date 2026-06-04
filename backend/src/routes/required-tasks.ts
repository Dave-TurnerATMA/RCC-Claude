import { Router } from 'express';
import db from '../db/database';
import { createScheduledTasksForRequired } from '../services/scheduler';
import { generateTaskSummary } from '../services/ai';

const router = Router();

function enrichRT(t: any) {
  return {
    ...t,
    crew: db.prepare('SELECT u.id, u.name, u.role FROM users u JOIN required_task_crew rtc ON u.id = rtc.user_id WHERE rtc.required_task_id = ?').all(t.id),
    equipment: db.prepare('SELECT e.* FROM equipment e JOIN required_task_equipment rte ON e.id = rte.equipment_id WHERE rte.required_task_id = ?').all(t.id),
    steps: db.prepare('SELECT * FROM required_task_steps WHERE required_task_id = ? ORDER BY display_order').all(t.id),
  };
}

function saveSteps(requiredTaskId: number, steps: string[]) {
  db.prepare('DELETE FROM required_task_steps WHERE required_task_id = ?').run(requiredTaskId);
  for (let i = 0; i < steps.length; i++) {
    const text = (steps[i] || '').trim();
    if (text) db.prepare('INSERT INTO required_task_steps (required_task_id, step_text, display_order) VALUES (?, ?, ?)').run(requiredTaskId, text, i);
  }
}

// Categories
router.get('/:teamId/required-task-categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM required_task_categories WHERE team_id = ? ORDER BY display_order, name').all(req.params.teamId);
  res.json(cats);
});

router.post('/:teamId/required-task-categories', (req, res) => {
  const { name, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = db.prepare('INSERT INTO required_task_categories (team_id, name, display_order) VALUES (?, ?, ?)').run(req.params.teamId, name, display_order || 0).lastInsertRowid;
  res.json({ id, team_id: Number(req.params.teamId), name, display_order: display_order || 0 });
});

router.put('/:teamId/required-task-categories/:id', (req, res) => {
  const { name, display_order, is_complete } = req.body;
  db.prepare('UPDATE required_task_categories SET name=COALESCE(?,name), display_order=COALESCE(?,display_order), is_complete=COALESCE(?,is_complete) WHERE id=? AND team_id=?')
    .run(name ?? null, display_order ?? null, is_complete ?? null, req.params.id, req.params.teamId);
  res.json({ success: true });
});

router.delete('/:teamId/required-task-categories/:id', (req, res) => {
  const inUse = (db.prepare('SELECT COUNT(*) as cnt FROM required_tasks WHERE category_id = ? AND is_archived = 0').get(req.params.id) as any).cnt;
  if (inUse > 0) return res.status(400).json({ error: 'Category has active required tasks. Archive or reassign them first.' });
  db.prepare('DELETE FROM required_task_categories WHERE id = ? AND team_id = ?').run(req.params.id, req.params.teamId);
  res.json({ success: true });
});

// Required Tasks
router.get('/:teamId/required-tasks', (req, res) => {
  const tasks = db.prepare(`
    SELECT rt.*,
      u.name as responsible_user_name,
      c.name as category_name,
      (SELECT COUNT(*) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as completion_count,
      (SELECT MAX(st.completed_at) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as last_completed_at,
      (SELECT AVG(st.actual_hours) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed' AND st.actual_hours IS NOT NULL) as avg_effort,
      (SELECT AVG((SELECT COUNT(*) FROM task_crew tc WHERE tc.scheduled_task_id = st.id)) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as avg_crew_size
    FROM required_tasks rt
    LEFT JOIN users u ON rt.default_responsible_user_id = u.id
    LEFT JOIN required_task_categories c ON rt.category_id = c.id
    WHERE rt.team_id = ? AND rt.is_archived = 0
    ORDER BY c.display_order, rt.short_description
  `).all(req.params.teamId);

  res.json(tasks.map(enrichRT));
});

router.post('/:teamId/required-tasks', (req, res) => {
  const {
    short_description, overview, priority, is_recurring, scheduled_date,
    default_responsible_user_id, estimate_hours, task_overview, frequency_days,
    planned_instances, top_tips, equipment_ids, crew_ids, category_id, created_by, origin, steps, crew_type
  } = req.body;

  if (!short_description || !overview) return res.status(400).json({ error: 'short_description and overview required' });

  const id = db.prepare(`
    INSERT INTO required_tasks (team_id, category_id, short_description, overview, priority, is_recurring,
      scheduled_date, default_responsible_user_id, estimate_hours, task_overview, frequency_days,
      planned_instances, top_tips, crew_type, origin, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.teamId, category_id || null, short_description, overview,
    priority || 'medium', is_recurring ? 1 : 0, scheduled_date || null,
    default_responsible_user_id || null, estimate_hours || null, task_overview || null,
    frequency_days || null, planned_instances || 2, top_tips || null,
    crew_type || 'specific', origin || 'manual', created_by || null
  ).lastInsertRowid as number;

  if (equipment_ids) for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(id, eqId);
  if (crew_ids) for (const uid of crew_ids) db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(id, uid);
  if (Array.isArray(steps)) saveSteps(id, steps);

  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)')
    .run(id, created_by || null, 'Required task created');

  if (scheduled_date) {
    createScheduledTasksForRequired(id, Number(req.params.teamId));
  }

  const created = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(id) as any;
  res.json(enrichRT(created));
});

router.put('/:teamId/required-tasks/:id', (req, res) => {
  const {
    short_description, overview, priority, is_recurring, scheduled_date,
    default_responsible_user_id, estimate_hours, task_overview, frequency_days,
    planned_instances, top_tips, equipment_ids, crew_ids, category_id, updated_by, steps, crew_type
  } = req.body;

  const existing = db.prepare('SELECT * FROM required_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  // Validate crew_type lock: cannot change FROM 'specific' if crew members exist
  if (crew_type !== undefined && crew_type !== existing.crew_type && existing.crew_type === 'specific') {
    const rtCrewCount = (db.prepare('SELECT COUNT(*) as cnt FROM required_task_crew WHERE required_task_id = ?').get(req.params.id) as any).cnt;
    const stCrewCount = (db.prepare(`
      SELECT COUNT(*) as cnt FROM task_crew tc
      JOIN scheduled_tasks st ON tc.scheduled_task_id = st.id
      WHERE st.required_task_id = ? AND st.state IN ('pending','planned')
    `).get(req.params.id) as any).cnt;
    if (rtCrewCount > 0 || stCrewCount > 0) {
      return res.status(400).json({ error: 'Cannot change Participants type from Crew while crew members are assigned. Remove all crew members first.' });
    }
  }

  const changes: string[] = [];
  if (short_description && short_description !== existing.short_description) changes.push(`Description changed`);
  if (priority && priority !== existing.priority) changes.push(`Priority changed to ${priority}`);
  if (scheduled_date !== undefined && scheduled_date !== existing.scheduled_date) changes.push(`Scheduled date changed to ${scheduled_date || 'none'}`);
  if (frequency_days !== undefined && frequency_days !== existing.frequency_days) changes.push(`Frequency changed to ${frequency_days} days`);
  if (crew_type !== undefined && crew_type !== existing.crew_type) changes.push(`Participants changed to ${crew_type}`);

  // Handle scheduled_date changes
  if (scheduled_date === null && existing.scheduled_date !== null) {
    // Clearing scheduled_date: abandon pending/planned scheduled tasks
    db.prepare(
      "UPDATE scheduled_tasks SET state='abandoned', updated_at=datetime('now') WHERE required_task_id=? AND state IN ('pending','planned')"
    ).run(req.params.id);
    changes.push('Scheduled date cleared; pending/planned tasks abandoned');
  } else if (scheduled_date && !existing.scheduled_date) {
    // Was null, now set: create scheduled tasks
    db.prepare(`
      UPDATE required_tasks SET scheduled_date=? WHERE id=?
    `).run(scheduled_date, req.params.id);
    createScheduledTasksForRequired(Number(req.params.id), Number(req.params.teamId));
  } else if (scheduled_date && existing.scheduled_date && scheduled_date !== existing.scheduled_date) {
    // Changed future date: update pending tasks
    db.prepare(
      "UPDATE scheduled_tasks SET scheduled_date=?, updated_at=datetime('now') WHERE required_task_id=? AND state='pending'"
    ).run(scheduled_date, req.params.id);
  }

  db.prepare(`
    UPDATE required_tasks SET
      category_id = COALESCE(?, category_id),
      short_description = COALESCE(?, short_description),
      overview = COALESCE(?, overview),
      priority = COALESCE(?, priority),
      scheduled_date = CASE WHEN ? IS NOT NULL THEN ? ELSE scheduled_date END,
      default_responsible_user_id = COALESCE(?, default_responsible_user_id),
      estimate_hours = COALESCE(?, estimate_hours),
      task_overview = COALESCE(?, task_overview),
      frequency_days = COALESCE(?, frequency_days),
      planned_instances = COALESCE(?, planned_instances),
      top_tips = COALESCE(?, top_tips),
      crew_type = COALESCE(?, crew_type),
      updated_at = datetime('now')
    WHERE id = ? AND team_id = ?
  `).run(
    category_id ?? null, short_description ?? null, overview ?? null, priority ?? null,
    scheduled_date !== undefined ? scheduled_date : null,
    scheduled_date !== undefined ? scheduled_date : null,
    default_responsible_user_id !== undefined ? default_responsible_user_id : null,
    estimate_hours ?? null, task_overview ?? null, frequency_days ?? null,
    planned_instances ?? null, top_tips ?? null, crew_type ?? null,
    req.params.id, req.params.teamId
  );

  // Sync crew_type to associated pending/planned scheduled tasks
  if (crew_type !== undefined && crew_type !== existing.crew_type) {
    db.prepare(
      "UPDATE scheduled_tasks SET crew_type=?, updated_at=datetime('now') WHERE required_task_id=? AND state IN ('pending','planned')"
    ).run(crew_type, req.params.id);
  }

  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM required_task_equipment WHERE required_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }
  if (crew_ids !== undefined) {
    db.prepare('DELETE FROM required_task_crew WHERE required_task_id = ?').run(req.params.id);
    for (const uid of crew_ids) db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(req.params.id, uid);
  }
  if (Array.isArray(steps)) saveSteps(Number(req.params.id), steps);

  if (changes.length > 0) {
    db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)')
      .run(req.params.id, updated_by || null, changes.join('; '));
  }

  const updated = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(req.params.id) as any;
  res.json(enrichRT(updated));
});

router.post('/:teamId/required-tasks/:id/archive', (req, res) => {
  const existing = db.prepare('SELECT * FROM required_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE required_tasks SET is_archived=1, updated_at=datetime('now') WHERE id=?").run(req.params.id);
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(req.params.id, req.body.user_id || null, 'Task archived');
  res.json({ success: true });
});

router.delete('/:teamId/required-tasks/:id', (req, res) => {
  const completions = (db.prepare("SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE required_task_id = ? AND state = 'completed'").get(req.params.id) as any).cnt;
  if (completions > 0) return res.status(400).json({ error: 'Cannot delete a task with completion history. Archive it instead.' });
  db.prepare('DELETE FROM required_task_crew WHERE required_task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM required_task_equipment WHERE required_task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM required_task_logs WHERE required_task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM required_task_steps WHERE required_task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM scheduled_tasks WHERE required_task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM required_tasks WHERE id = ? AND team_id = ?').run(req.params.id, req.params.teamId);
  res.json({ success: true });
});

router.get('/:teamId/required-tasks/:id/summary', async (req, res) => {
  try {
    const summary = await generateTaskSummary(Number(req.params.id));
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:teamId/required-tasks/:id/logs', (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.name as user_name
    FROM required_task_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.required_task_id = ?
    ORDER BY l.created_at DESC
  `).all(req.params.id);
  res.json(logs);
});

export default router;
