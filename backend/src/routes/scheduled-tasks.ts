import { Router } from 'express';
import db from '../db/database';
import { promoteNextPlannedTask } from '../services/scheduler';

const router = Router();

function enrichTask(task: any) {
  // crew_participation records with user name and status
  task.crew_participation = db.prepare(`
    SELECT cp.*, u.name as user_name, u.role as user_role, u.email as user_email
    FROM crew_participation cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.scheduled_task_id = ?
    ORDER BY cp.status, u.name
  `).all(task.id);

  // Keep backward-compat crew array (non-declined)
  task.crew = task.crew_participation.filter((cp: any) => cp.status !== 'declined').map((cp: any) => ({
    id: cp.user_id,
    name: cp.user_name,
    role: cp.user_role,
    email: cp.user_email,
    participation_status: cp.status,
    participation_source: cp.source,
  }));

  task.equipment = db.prepare('SELECT e.* FROM equipment e JOIN task_equipment te ON e.id = te.equipment_id WHERE te.scheduled_task_id = ?').all(task.id);
  task.notes = db.prepare(`
    SELECT n.*, u.name as user_name
    FROM task_notes n
    LEFT JOIN users u ON n.user_id = u.id
    WHERE n.scheduled_task_id = ?
    ORDER BY n.created_at ASC
  `).all(task.id);
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
  const { state, type, view, user_id, order, required_task_id, participation_type } = req.query as any;

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
    query += ` AND st.state NOT IN ('completed','abandoned','not_required','missed','ended')`;
  }

  if (type) { query += ` AND st.type = ?`; params.push(type); }
  if (required_task_id) { query += ` AND st.required_task_id = ?`; params.push(required_task_id); }
  if (participation_type) { query += ` AND st.participation_type = ?`; params.push(participation_type); }

  if (view === 'mine' && user_id) {
    query += ` AND (
      st.responsible_user_id = ?
      OR EXISTS (SELECT 1 FROM crew_participation cp WHERE cp.scheduled_task_id = st.id AND cp.user_id = ? AND cp.status != 'declined')
      OR st.participants IN ('open_optional','all_expected')
    )`;
    params.push(user_id, user_id);
  } else if (view === 'responsible' && user_id) {
    query += ` AND st.responsible_user_id = ?`;
    params.push(user_id);
  } else if (view === 'unassigned') {
    query += ` AND st.responsible_user_id IS NULL`;
  } else if (view === 'involved' && user_id) {
    query += ` AND EXISTS (SELECT 1 FROM crew_participation cp WHERE cp.scheduled_task_id = st.id AND cp.user_id = ? AND cp.status != 'declined')`;
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
  const { user_id, required_task_id } = req.query as any;
  let query = `
    SELECT st.*, u.name as responsible_user_name
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ? AND st.state IN ('completed','abandoned','not_required','missed','ended')
  `;
  const params: any[] = [req.params.teamId];
  if (user_id) {
    query += ` AND (
      st.responsible_user_id = ?
      OR EXISTS (SELECT 1 FROM crew_participation cp WHERE cp.scheduled_task_id = st.id AND cp.user_id = ?)
    )`;
    params.push(user_id, user_id);
  }
  if (required_task_id) {
    query += ` AND st.required_task_id = ?`;
    params.push(required_task_id);
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
      rt.frequency_days, rt.type as required_task_type
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
    type, short_description, task_overview, scheduled_date, priority,
    responsible_user_id, estimate_hours, planning_notes, location,
    participants, participation_type, volunteer_limit,
    crew_ids, equipment_ids, required_task_id, parent_scheduled_task_id, created_by_user_id
  } = req.body;
  if (!type || !short_description || !task_overview) return res.status(400).json({ error: 'type, short_description, task_overview required' });

  const id = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, required_task_id, parent_scheduled_task_id, type,
      short_description, task_overview, scheduled_date, priority, responsible_user_id,
      estimate_hours, planning_notes, location, participants, participation_type,
      volunteer_limit, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.teamId, required_task_id || null, parent_scheduled_task_id || null, type,
    short_description, task_overview, scheduled_date || null, priority || 'medium',
    responsible_user_id || null, estimate_hours || null, planning_notes || null,
    location || 'Base', participants || 'crew', participation_type || 'picked',
    volunteer_limit || null, created_by_user_id || null
  ).lastInsertRowid as number;

  if (crew_ids) {
    for (const uid of crew_ids) {
      db.prepare(`
        INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status)
        VALUES (?, ?, 'manually_added', ?, 'invited')
      `).run(id, uid, created_by_user_id || null);
    }
  }
  if (equipment_ids) for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(id, eqId);

  const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any;
  res.json(enrichTask(task));
});

router.put('/:teamId/scheduled-tasks/:id', (req, res) => {
  const {
    short_description, task_overview, scheduled_date, priority, responsible_user_id,
    estimate_hours, planning_notes, feedback_notes, participants, participation_type,
    volunteer_limit, location, equipment_ids
  } = req.body;
  const existing = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE scheduled_tasks SET
      short_description = COALESCE(?, short_description),
      task_overview = COALESCE(?, task_overview),
      scheduled_date = COALESCE(?, scheduled_date),
      priority = COALESCE(?, priority),
      responsible_user_id = CASE WHEN ? IS NOT NULL THEN ? ELSE responsible_user_id END,
      estimate_hours = COALESCE(?, estimate_hours),
      planning_notes = COALESCE(?, planning_notes),
      feedback_notes = COALESCE(?, feedback_notes),
      participants = COALESCE(?, participants),
      participation_type = COALESCE(?, participation_type),
      volunteer_limit = COALESCE(?, volunteer_limit),
      location = COALESCE(?, location),
      updated_at = datetime('now')
    WHERE id = ? AND team_id = ?
  `).run(
    short_description ?? null, task_overview ?? null, scheduled_date ?? null, priority ?? null,
    responsible_user_id !== undefined ? responsible_user_id : null,
    responsible_user_id !== undefined ? responsible_user_id : null,
    estimate_hours ?? null, planning_notes ?? null, feedback_notes ?? null,
    participants ?? null, participation_type ?? null, volunteer_limit ?? null, location ?? null,
    req.params.id, req.params.teamId
  );

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
    additional_crew_ids, state: newState, equipment_ids, follow_up_task,
    feedback_notes, step_checks, completed_by_user_id
  } = req.body;

  const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!task) return res.status(404).json({ error: 'Not found' });
  if (task.state !== 'pending') return res.status(400).json({ error: 'Only pending tasks can be completed' });

  const finalState = newState || 'completed';
  if (task.type === 'recurring' && finalState === 'abandoned') {
    return res.status(400).json({ error: 'Recurring tasks cannot be abandoned. Use "not_required" instead.' });
  }

  const terminalStates = ['completed', 'abandoned', 'not_required'];
  if (!terminalStates.includes(finalState)) {
    return res.status(400).json({ error: `Invalid completion state: ${finalState}` });
  }

  db.prepare(`
    UPDATE scheduled_tasks SET
      state=?, completed_at=?, work_description=?, actual_hours=?,
      problems=?, feedback_notes=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    finalState, completed_at || new Date().toISOString(),
    work_description || null, actual_hours || null,
    problems || null, feedback_notes || null, req.params.id
  );

  // Add additional crew as confirmed participants
  if (additional_crew_ids) {
    for (const uid of additional_crew_ids) {
      db.prepare(`
        INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status, confirmed_at)
        VALUES (?, ?, 'manually_added', ?, 'confirmed', datetime('now'))
      `).run(req.params.id, uid, completed_by_user_id || null);
    }
  }

  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM task_equipment WHERE scheduled_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }

  // Save step checks
  if (step_checks && Array.isArray(step_checks)) {
    for (const { step_id, checked } of step_checks) {
      if (checked) {
        db.prepare(`
          INSERT OR REPLACE INTO scheduled_task_step_checks (scheduled_task_id, step_id, checked, checked_at, checked_by_user_id)
          VALUES (?, ?, 1, datetime('now'), ?)
        `).run(req.params.id, step_id, completed_by_user_id || null);
      } else {
        db.prepare('DELETE FROM scheduled_task_step_checks WHERE scheduled_task_id = ? AND step_id = ?').run(req.params.id, step_id);
      }
    }
  }

  let followUpId = null;
  if (follow_up_task && follow_up_task.short_description) {
    followUpId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, parent_scheduled_task_id, type, short_description, task_overview,
        priority, responsible_user_id, estimate_hours, scheduled_date, created_by_user_id)
      VALUES (?, ?, 'follow_up', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.teamId, req.params.id,
      follow_up_task.short_description,
      follow_up_task.task_overview || follow_up_task.short_description,
      follow_up_task.priority || 'medium',
      follow_up_task.responsible_user_id || null,
      follow_up_task.estimate_hours || null,
      follow_up_task.scheduled_date || null,
      completed_by_user_id || null
    ).lastInsertRowid;
  }

  if (task.required_task_id && finalState === 'completed') {
    promoteNextPlannedTask(task.required_task_id, Number(req.params.teamId));
  }

  res.json({ success: true, follow_up_id: followUpId });
});

router.post('/:teamId/scheduled-tasks/:id/progress', (req, res) => {
  const { work_description, problems, equipment_ids, planning_notes } = req.body;
  db.prepare(`
    UPDATE scheduled_tasks SET
      work_description = COALESCE(?, work_description),
      problems = COALESCE(?, problems),
      planning_notes = COALESCE(?, planning_notes),
      updated_at = datetime('now')
    WHERE id = ? AND team_id = ?
  `).run(work_description ?? null, problems ?? null, planning_notes ?? null, req.params.id, req.params.teamId);

  if (equipment_ids !== undefined) {
    db.prepare('DELETE FROM task_equipment WHERE scheduled_task_id = ?').run(req.params.id);
    for (const eqId of equipment_ids) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(req.params.id, eqId);
  }
  res.json({ success: true });
});

// Crew management
router.post('/:teamId/scheduled-tasks/:id/crew', (req, res) => {
  const { user_id, source, added_by_user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!task) return res.status(404).json({ error: 'Not found' });

  // Check volunteer limit
  if (task.volunteer_limit) {
    const activeCount = (db.prepare(
      "SELECT COUNT(*) as cnt FROM crew_participation WHERE scheduled_task_id = ? AND status != 'declined'"
    ).get(req.params.id) as any).cnt;
    if (activeCount >= task.volunteer_limit) {
      return res.status(400).json({ error: 'Volunteer limit reached for this task' });
    }
  }

  const participationSource = source || 'manually_added';
  const status = participationSource === 'self_added' ? 'confirmed' : 'invited';
  const confirmedAt = participationSource === 'self_added' ? new Date().toISOString() : null;

  try {
    db.prepare(`
      INSERT INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, user_id, participationSource, added_by_user_id || null, status, confirmedAt);
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'User is already a crew member' });
    }
    throw e;
  }

  res.json({ success: true });
});

router.delete('/:teamId/scheduled-tasks/:id/crew/:userId', (req, res) => {
  db.prepare("UPDATE crew_participation SET status='declined' WHERE scheduled_task_id = ? AND user_id = ?")
    .run(req.params.id, req.params.userId);
  res.json({ success: true });
});

router.post('/:teamId/scheduled-tasks/:id/crew/:userId/confirm', (req, res) => {
  db.prepare(`
    UPDATE crew_participation SET status='confirmed', confirmed_at=datetime('now')
    WHERE scheduled_task_id = ? AND user_id = ?
  `).run(req.params.id, req.params.userId);
  res.json({ success: true });
});

router.post('/:teamId/scheduled-tasks/:id/notes', (req, res) => {
  const { user_id, note_text } = req.body;
  if (!user_id || !note_text) return res.status(400).json({ error: 'user_id and note_text required' });
  const id = db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note_text) VALUES (?, ?, ?)')
    .run(req.params.id, user_id, note_text).lastInsertRowid;
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
    db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)')
      .run(req.params.teamId, admin.id,
        `${user.name} has requested to take over the task: "${task.short_description}"`);
  }
  res.json({ success: true });
});

router.post('/:teamId/scheduled-tasks/:id/step-checks', (req, res) => {
  const { step_id, checked, user_id } = req.body;
  if (!step_id) return res.status(400).json({ error: 'step_id required' });
  if (checked) {
    db.prepare(`
      INSERT OR REPLACE INTO scheduled_task_step_checks (scheduled_task_id, step_id, checked, checked_at, checked_by_user_id)
      VALUES (?, ?, 1, datetime('now'), ?)
    `).run(req.params.id, step_id, user_id || null);
  } else {
    db.prepare('DELETE FROM scheduled_task_step_checks WHERE scheduled_task_id = ? AND step_id = ?').run(req.params.id, step_id);
  }
  res.json({ success: true });
});

export default router;
