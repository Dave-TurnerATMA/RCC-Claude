import { Router } from 'express';
import db from '../db/database';
import { promoteNextPlannedTask } from '../services/scheduler';

const router = Router();

function enrichTask(task: any) {
  task.crew = db.prepare('SELECT u.id, u.name, u.role, u.email FROM users u JOIN task_crew tc ON u.id = tc.user_id WHERE tc.scheduled_task_id = ?').all(task.id);
  task.equipment = db.prepare('SELECT e.* FROM equipment e JOIN task_equipment te ON e.id = te.equipment_id WHERE te.scheduled_task_id = ?').all(task.id);
  task.notes = db.prepare('SELECT n.*, u.name as user_name FROM task_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.scheduled_task_id = ? ORDER BY n.created_at ASC').all(task.id);
  task.uploads = db.prepare('SELECT * FROM task_uploads WHERE scheduled_task_id = ? ORDER BY created_at DESC').all(task.id);
  if (task.required_task_id) {
    const steps = db.prepare('SELECT * FROM required_task_steps WHERE required_task_id = ? ORDER BY display_order').all(task.required_task_id) as any[];
    const checkedSet = new Set(
      (db.prepare('SELECT step_id FROM scheduled_task_step_checks WHERE scheduled_task_id = ?').all(task.id) as any[]).map(r => r.step_id)
    );
    task.steps = steps.map(s => ({ ...s, checked: checkedSet.has(s.id) }));
  } else {
    task.steps = [];
  }
  return task;
}

router.get('/:teamId/scheduled-tasks', (req, res) => {
  const { state, type, view, user_id, order } = req.query as any;

  // Auto-mark missed: recurring tasks that are overdue
  db.prepare(
    "UPDATE scheduled_tasks SET state='missed', updated_at=datetime('now') WHERE team_id=? AND type='recurring' AND state IN ('pending','planned') AND scheduled_date < date('now')"
  ).run(req.params.teamId);

  let query = `
    SELECT st.*, u.name as responsible_user_name, u.email as responsible_user_email
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ?
  `;
  const params: any[] = [req.params.teamId];

  if (state) {
    if (state === 'active') {
      query += ` AND st.state IN ('pending','planned')`;
    } else {
      query += ` AND st.state = ?`; params.push(state);
    }
  } else {
    query += ` AND st.state NOT IN ('completed','abandoned','not_required','missed')`;
  }

  if (type) { query += ` AND st.type = ?`; params.push(type); }

  if (view === 'mine' && user_id) {
    query += ` AND (st.responsible_user_id = ? OR EXISTS (SELECT 1 FROM task_crew tc WHERE tc.scheduled_task_id = st.id AND tc.user_id = ?) OR st.crew_type IN ('open_optional','all_expected'))`;
    params.push(user_id, user_id);
  } else if (view === 'responsible' && user_id) {
    query += ` AND st.responsible_user_id = ?`;
    params.push(user_id);
  } else if (view === 'unassigned') {
    query += ` AND st.responsible_user_id IS NULL`;
  } else if (view === 'involved' && user_id) {
    query += ` AND EXISTS (SELECT 1 FROM task_crew tc WHERE tc.scheduled_task_id = st.id AND tc.user_id = ?)`;
    params.push(user_id);
  }

  const orderMap: Record<string, string> = {
    priority: "CASE st.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, st.scheduled_date ASC",
    estimate: 'st.estimate_hours ASC NULLS LAST, st.scheduled_date ASC',
    date: "st.scheduled_date ASC NULLS LAST, CASE st.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END",
  };
  query += ` ORDER BY ${orderMap[order as string] || orderMap.date}`;

  const tasks = db.prepare(query).all(...params);
  res.json(tasks.map(enrichTask));
});

router.get('/:teamId/scheduled-tasks/history', (req, res) => {
  const { user_id } = req.query as any;
  let query = `
    SELECT st.*, u.name as responsible_user_name
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ? AND st.state IN ('completed','abandoned','not_required','missed')
  `;
  const params: any[] = [req.params.teamId];
  if (user_id) {
    query += ` AND (st.responsible_user_id = ? OR EXISTS (SELECT 1 FROM task_crew tc WHERE tc.scheduled_task_id = st.id AND tc.user_id = ?))`;
    params.push(user_id, user_id);
  }
  query += ' ORDER BY st.completed_at DESC, st.updated_at DESC LIMIT 100';
  const tasks = db.prepare(query).all(...params);
  res.json(tasks.map(enrichTask));
});

router.get('/:teamId/scheduled-tasks/:id', (req, res) => {
  const task = db.prepare(`
    SELECT st.*, u.name as responsible_user_name,
      rt.short_description as required_task_short_description,
      rt.task_overview as required_task_overview,
      rt.top_tips as required_task_top_tips,
      rt.frequency_days, rt.is_recurring
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    LEFT JOIN required_tasks rt ON st.required_task_id = rt.id
    WHERE st.id = ? AND st.team_id = ?
  `).get(req.params.id, req.params.teamId) as any;
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(enrichTask(task));
});

router.post('/:teamId/scheduled-tasks', (req, res) => {
  const {
    type, short_description, overview, scheduled_date, priority,
    responsible_user_id, estimate_hours, planning_notes, crew_ids, equipment_ids,
    crew_type, required_task_id, parent_task_id, created_by
  } = req.body;
  if (!type || !short_description || !overview) return res.status(400).json({ error: 'type, short_description, overview required' });

  const id = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, required_task_id, parent_task_id, type, short_description, overview,
      scheduled_date, priority, responsible_user_id, estimate_hours, planning_notes, crew_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.teamId, required_task_id || null, parent_task_id || null, type, short_description, overview,
    scheduled_date || null, priority || 'medium', responsible_user_id || null,
    estimate_hours || null, planning_notes || null, crew_type || 'specific', created_by || null
  ).lastInsertRowid as number;

  if (crew_ids) for (const uid of crew_ids) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(id, uid);
  if (equipment_ids) for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(id, eqId);

  const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any;
  res.json(enrichTask(task));
});

router.put('/:teamId/scheduled-tasks/:id', (req, res) => {
  const {
    short_description, overview, scheduled_date, priority, responsible_user_id,
    estimate_hours, planning_notes, feedback_notes, crew_type, crew_ids, equipment_ids
  } = req.body;
  const existing = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE scheduled_tasks SET
      short_description = COALESCE(?, short_description),
      overview = COALESCE(?, overview),
      scheduled_date = COALESCE(?, scheduled_date),
      priority = COALESCE(?, priority),
      responsible_user_id = CASE WHEN ? IS NOT NULL THEN ? ELSE responsible_user_id END,
      estimate_hours = COALESCE(?, estimate_hours),
      planning_notes = COALESCE(?, planning_notes),
      feedback_notes = COALESCE(?, feedback_notes),
      crew_type = COALESCE(?, crew_type),
      updated_at = datetime('now')
    WHERE id = ? AND team_id = ?
  `).run(
    short_description ?? null, overview ?? null, scheduled_date ?? null, priority ?? null,
    responsible_user_id !== undefined ? responsible_user_id : null,
    responsible_user_id !== undefined ? responsible_user_id : null,
    estimate_hours ?? null, planning_notes ?? null, feedback_notes ?? null, crew_type ?? null,
    req.params.id, req.params.teamId
  );

  if (crew_ids !== undefined) {
    db.prepare('DELETE FROM task_crew WHERE scheduled_task_id = ?').run(req.params.id);
    for (const uid of crew_ids) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(req.params.id, uid);
  }
  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM task_equipment WHERE scheduled_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }

  const updated = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(req.params.id) as any;
  res.json(enrichTask(updated));
});

router.post('/:teamId/scheduled-tasks/:id/complete', (req, res) => {
  const {
    completed_at, work_description, actual_hours, problems,
    additional_crew_ids, state: newState, equipment_ids, follow_up_task, feedback_notes
  } = req.body;

  const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!task) return res.status(404).json({ error: 'Not found' });
  if (task.state !== 'pending') return res.status(400).json({ error: 'Only pending tasks can be completed' });

  const finalState = newState || 'completed';
  if (task.type === 'recurring' && finalState === 'abandoned') {
    return res.status(400).json({ error: 'Recurring tasks cannot be abandoned. Use "not_required" instead.' });
  }

  db.prepare(`
    UPDATE scheduled_tasks SET
      state=?, completed_at=?, work_description=?, actual_hours=?, problems=?, feedback_notes=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(
    finalState, completed_at || new Date().toISOString(),
    work_description || null, actual_hours || null, problems || null,
    feedback_notes || null, req.params.id
  );

  if (additional_crew_ids) for (const uid of additional_crew_ids) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(req.params.id, uid);
  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM task_equipment WHERE scheduled_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }

  let followUpId = null;
  if (follow_up_task && follow_up_task.short_description) {
    followUpId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, parent_task_id, type, short_description, overview, priority, responsible_user_id, estimate_hours, scheduled_date)
      VALUES (?, ?, 'follow_up', ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.teamId, req.params.id,
      follow_up_task.short_description, follow_up_task.overview || follow_up_task.short_description,
      follow_up_task.priority || 'medium', follow_up_task.responsible_user_id || null,
      follow_up_task.estimate_hours || null, follow_up_task.scheduled_date || null
    ).lastInsertRowid;
  }

  if (task.required_task_id && finalState === 'completed') {
    promoteNextPlannedTask(task.required_task_id, Number(req.params.teamId));
  }

  res.json({ success: true, follow_up_id: followUpId });
});

router.post('/:teamId/scheduled-tasks/:id/progress', (req, res) => {
  const { work_description, problems, additional_crew_ids, equipment_ids, planning_notes } = req.body;
  db.prepare(`
    UPDATE scheduled_tasks SET
      work_description = COALESCE(?, work_description),
      problems = COALESCE(?, problems),
      planning_notes = COALESCE(?, planning_notes),
      updated_at = datetime('now')
    WHERE id = ? AND team_id = ?
  `).run(work_description ?? null, problems ?? null, planning_notes ?? null, req.params.id, req.params.teamId);

  if (additional_crew_ids) for (const uid of additional_crew_ids) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(req.params.id, uid);
  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM task_equipment WHERE scheduled_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }
  res.json({ success: true });
});

router.post('/:teamId/scheduled-tasks/:id/crew', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(req.params.id, user_id);
  res.json({ success: true });
});

router.delete('/:teamId/scheduled-tasks/:id/crew/:userId', (req, res) => {
  db.prepare('DELETE FROM task_crew WHERE scheduled_task_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ success: true });
});

router.post('/:teamId/scheduled-tasks/:id/notes', (req, res) => {
  const { user_id, note } = req.body;
  if (!user_id || !note) return res.status(400).json({ error: 'user_id and note required' });
  const id = db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note) VALUES (?, ?, ?)').run(req.params.id, user_id, note).lastInsertRowid;
  const noteRecord = db.prepare('SELECT n.*, u.name as user_name FROM task_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?').get(id);
  res.json(noteRecord);
});

router.post('/:teamId/scheduled-tasks/:id/request-takeover', (req, res) => {
  const { user_id } = req.body;
  const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;
  if (!task || !user) return res.status(404).json({ error: 'Not found' });
  const admins = db.prepare("SELECT id FROM users WHERE team_id = ? AND role IN ('administrator','team_lead') AND status = 'active'").all(req.params.teamId) as any[];
  for (const admin of admins) {
    db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)')
      .run(req.params.teamId, admin.id, 'takeover_request',
        `${user.name} has requested to take over the task: "${task.short_description}"`);
  }
  res.json({ success: true });
});

router.post('/:teamId/scheduled-tasks/:id/step-checks', (req, res) => {
  const { step_id, checked } = req.body;
  if (!step_id) return res.status(400).json({ error: 'step_id required' });
  if (checked) {
    db.prepare('INSERT OR IGNORE INTO scheduled_task_step_checks (scheduled_task_id, step_id) VALUES (?, ?)').run(req.params.id, step_id);
  } else {
    db.prepare('DELETE FROM scheduled_task_step_checks WHERE scheduled_task_id = ? AND step_id = ?').run(req.params.id, step_id);
  }
  res.json({ success: true });
});

export default router;
