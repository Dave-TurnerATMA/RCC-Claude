import { Router } from 'express';
import db from '../db/database';
import { createScheduledTasksForRequired } from '../services/scheduler';
import { generateTaskSummary } from '../services/ai';

const router = Router();

function enrichRT(t: any) {
  return {
    ...t,
    crew_defaults: db.prepare(`
      SELECT u.id, u.name, u.role, u.status
      FROM users u
      JOIN required_task_crew_defaults rtcd ON u.id = rtcd.user_id
      WHERE rtcd.required_task_id = ?
      ORDER BY u.name
    `).all(t.id),
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

// ── Main Tasks ────────────────────────────────────────────────────────────────

router.get('/:teamId/main-tasks', (req, res) => {
  const mainTasks = db.prepare('SELECT * FROM main_tasks WHERE team_id = ? ORDER BY display_order, short_description').all(req.params.teamId) as any[];

  const result = mainTasks.map(mt => {
    const subTasks = db.prepare(`
      SELECT rt.*,
        u.name as responsible_user_name,
        (SELECT COUNT(*) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as completion_count,
        (SELECT MAX(st.completed_at) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as last_completed_at,
        (SELECT AVG(st.actual_hours) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed' AND st.actual_hours IS NOT NULL) as avg_effort,
        (SELECT AVG((SELECT COUNT(*) FROM crew_participation cp WHERE cp.scheduled_task_id = st.id AND cp.status != 'declined')) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as avg_crew_size
      FROM required_tasks rt
      LEFT JOIN users u ON rt.default_responsible_user_id = u.id
      WHERE rt.main_task_id = ? AND rt.team_id = ? AND rt.is_archived = 0
      ORDER BY rt.short_description
    `).all(mt.id, req.params.teamId);

    return {
      ...mt,
      sub_tasks: subTasks.map(enrichRT),
    };
  });

  res.json(result);
});

router.post('/:teamId/main-tasks', (req, res) => {
  const { short_description, display_order } = req.body;
  if (!short_description) return res.status(400).json({ error: 'short_description required' });
  const id = db.prepare('INSERT INTO main_tasks (team_id, short_description, display_order) VALUES (?, ?, ?)')
    .run(req.params.teamId, short_description, display_order || 0).lastInsertRowid;
  res.json({ id, team_id: Number(req.params.teamId), short_description, display_order: display_order || 0, sub_tasks: [] });
});

router.put('/:teamId/main-tasks/:id', (req, res) => {
  const { short_description, display_order } = req.body;
  db.prepare('UPDATE main_tasks SET short_description=COALESCE(?,short_description), display_order=COALESCE(?,display_order) WHERE id=? AND team_id=?')
    .run(short_description ?? null, display_order ?? null, req.params.id, req.params.teamId);
  res.json({ success: true });
});

router.delete('/:teamId/main-tasks/:id', (req, res) => {
  const subTaskCount = (db.prepare('SELECT COUNT(*) as cnt FROM required_tasks WHERE main_task_id = ? AND is_archived = 0').get(req.params.id) as any).cnt;
  if (subTaskCount > 0) return res.status(400).json({ error: 'Main task has sub-tasks. Archive or reassign them first.' });
  db.prepare('DELETE FROM main_tasks WHERE id = ? AND team_id = ?').run(req.params.id, req.params.teamId);
  res.json({ success: true });
});

// ── Required Tasks (Sub Tasks) ────────────────────────────────────────────────

router.get('/:teamId/required-tasks', (req, res) => {
  const tasks = db.prepare(`
    SELECT rt.*,
      u.name as responsible_user_name,
      mt.short_description as main_task_name,
      (SELECT COUNT(*) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as completion_count,
      (SELECT MAX(st.completed_at) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as last_completed_at,
      (SELECT AVG(st.actual_hours) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed' AND st.actual_hours IS NOT NULL) as avg_effort,
      (SELECT AVG((SELECT COUNT(*) FROM crew_participation cp WHERE cp.scheduled_task_id = st.id AND cp.status != 'declined')) FROM scheduled_tasks st WHERE st.required_task_id = rt.id AND st.state = 'completed') as avg_crew_size
    FROM required_tasks rt
    LEFT JOIN users u ON rt.default_responsible_user_id = u.id
    LEFT JOIN main_tasks mt ON rt.main_task_id = mt.id
    WHERE rt.team_id = ? AND rt.is_archived = 0
    ORDER BY mt.display_order, rt.short_description
  `).all(req.params.teamId);

  res.json(tasks.map(enrichRT));
});

router.post('/:teamId/required-tasks', (req, res) => {
  const {
    short_description, task_overview, priority, type, scheduled_date,
    default_responsible_user_id, estimate_hours, frequency_days,
    planned_instances, top_tips, participants, main_task_id, created_by_user_id, origin, steps, crew_default_ids
  } = req.body;

  if (!short_description || !task_overview) return res.status(400).json({ error: 'short_description and task_overview required' });
  if (!type || !['one_off', 'recurring'].includes(type)) return res.status(400).json({ error: 'type must be one_off or recurring' });

  const id = db.prepare(`
    INSERT INTO required_tasks (team_id, main_task_id, short_description, task_overview, priority, type,
      scheduled_date, default_responsible_user_id, estimate_hours, frequency_days,
      planned_instances, top_tips, participants, origin, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.teamId, main_task_id || null, short_description, task_overview,
    priority || 'medium', type, scheduled_date || null,
    default_responsible_user_id || null, estimate_hours || null,
    frequency_days || null, planned_instances || 2, top_tips || null,
    participants || 'crew', origin || 'manual', created_by_user_id || null
  ).lastInsertRowid as number;

  if (Array.isArray(crew_default_ids)) {
    for (const uid of crew_default_ids) {
      db.prepare('INSERT OR IGNORE INTO required_task_crew_defaults (required_task_id, user_id) VALUES (?, ?)').run(id, uid);
    }
  }
  if (Array.isArray(steps)) saveSteps(id, steps);

  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)')
    .run(id, created_by_user_id || null, 'Required task created');

  if (scheduled_date) {
    createScheduledTasksForRequired(id, Number(req.params.teamId));
  }

  const created = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(id) as any;
  res.json(enrichRT(created));
});

router.put('/:teamId/required-tasks/:id', (req, res) => {
  const {
    short_description, task_overview, priority, scheduled_date,
    default_responsible_user_id, estimate_hours, frequency_days,
    planned_instances, top_tips, participants, main_task_id, updated_by, steps, crew_default_ids
  } = req.body;

  const existing = db.prepare('SELECT * FROM required_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const changes: string[] = [];
  if (short_description && short_description !== existing.short_description) changes.push('Description changed');
  if (priority && priority !== existing.priority) changes.push(`Priority changed to ${priority}`);
  if (scheduled_date !== undefined && scheduled_date !== existing.scheduled_date) changes.push(`Scheduled date changed to ${scheduled_date || 'none'}`);
  if (frequency_days !== undefined && frequency_days !== existing.frequency_days) changes.push(`Frequency changed to ${frequency_days} days`);

  // Handle scheduled_date changes per spec
  if (scheduled_date === null && existing.scheduled_date !== null) {
    // Clearing: One-Off → Abandoned; Recurring → Ended
    const newState = existing.type === 'one_off' ? 'abandoned' : 'ended';
    db.prepare(
      `UPDATE scheduled_tasks SET state=?, updated_at=datetime('now') WHERE required_task_id=? AND state IN ('pending','planned')`
    ).run(newState, req.params.id);
    changes.push(`Scheduled date cleared; pending/planned tasks set to ${newState}`);
  } else if (scheduled_date && !existing.scheduled_date) {
    // Was null, now set: create scheduled tasks after update
    db.prepare("UPDATE required_tasks SET scheduled_date=? WHERE id=?").run(scheduled_date, req.params.id);
    createScheduledTasksForRequired(Number(req.params.id), Number(req.params.teamId));
  } else if (scheduled_date && existing.scheduled_date && scheduled_date !== existing.scheduled_date) {
    // Date changed: check no completed STs exist
    const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE required_task_id = ? AND state = 'completed'").get(req.params.id) as any).cnt;
    if (completedCount > 0) {
      return res.status(400).json({ error: 'Scheduled date cannot be changed once any linked Scheduled Task has been completed.' });
    }
    // Update pending, delete and recreate planned
    db.prepare("UPDATE scheduled_tasks SET scheduled_date=?, updated_at=datetime('now') WHERE required_task_id=? AND state='pending'").run(scheduled_date, req.params.id);
    db.prepare("DELETE FROM scheduled_tasks WHERE required_task_id=? AND state='planned'").run(req.params.id);
    // Recreate planned after updating the RT date
    db.prepare("UPDATE required_tasks SET scheduled_date=? WHERE id=?").run(scheduled_date, req.params.id);
    createScheduledTasksForRequired(Number(req.params.id), Number(req.params.teamId));
  }

  db.prepare(`
    UPDATE required_tasks SET
      main_task_id = COALESCE(?, main_task_id),
      short_description = COALESCE(?, short_description),
      task_overview = COALESCE(?, task_overview),
      priority = COALESCE(?, priority),
      scheduled_date = CASE WHEN ? = '__CLEAR__' THEN NULL WHEN ? IS NOT NULL THEN ? ELSE scheduled_date END,
      default_responsible_user_id = CASE WHEN ? IS NOT NULL THEN ? ELSE default_responsible_user_id END,
      estimate_hours = COALESCE(?, estimate_hours),
      frequency_days = COALESCE(?, frequency_days),
      planned_instances = COALESCE(?, planned_instances),
      top_tips = COALESCE(?, top_tips),
      participants = COALESCE(?, participants),
      updated_at = datetime('now')
    WHERE id = ? AND team_id = ?
  `).run(
    main_task_id ?? null,
    short_description ?? null, task_overview ?? null, priority ?? null,
    scheduled_date === null ? '__CLEAR__' : null,
    scheduled_date !== undefined && scheduled_date !== null ? scheduled_date : null,
    scheduled_date !== undefined && scheduled_date !== null ? scheduled_date : null,
    default_responsible_user_id !== undefined ? String(default_responsible_user_id) : null,
    default_responsible_user_id !== undefined ? default_responsible_user_id : null,
    estimate_hours ?? null, frequency_days ?? null,
    planned_instances ?? null, top_tips ?? null,
    participants ?? null,
    req.params.id, req.params.teamId
  );

  if (Array.isArray(crew_default_ids)) {
    db.prepare('DELETE FROM required_task_crew_defaults WHERE required_task_id = ?').run(req.params.id);
    for (const uid of crew_default_ids) {
      db.prepare('INSERT OR IGNORE INTO required_task_crew_defaults (required_task_id, user_id) VALUES (?, ?)').run(req.params.id, uid);
    }
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
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)')
    .run(req.params.id, req.body.user_id || null, 'Task archived');
  res.json({ success: true });
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

router.get('/:teamId/required-tasks/:id/summary', async (req, res) => {
  try {
    const summary = await generateTaskSummary(Number(req.params.id));
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
