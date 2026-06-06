import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.*,
      COALESCE((
        SELECT COUNT(*) FROM scheduled_tasks st
        WHERE st.responsible_user_id = u.id AND st.state IN ('pending','planned')
      ), 0) as active_task_count
    FROM users u
    WHERE u.team_id = ?
    ORDER BY u.name
  `).all(req.params.teamId);
  res.json(users);
});

router.post('/:teamId/users', (req, res) => {
  const { name, email, role, language } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role required' });
  try {
    const id = db.prepare(
      'INSERT INTO users (team_id, name, email, role, status, language) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.params.teamId, name, email, role, 'active', language || 'en').lastInsertRowid;
    res.json({ id, team_id: Number(req.params.teamId), name, email, role, status: 'active', language: language || 'en' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:teamId/users/:id', (req, res) => {
  const { name, email, role, status, language, covering_user_id } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND team_id = ?').get(req.params.id, req.params.teamId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Active → Inactive: require covering user, reassign scheduled tasks
  if (status === 'inactive' && user.status === 'active') {
    if (!covering_user_id) return res.status(400).json({ error: 'covering_user_id required when deactivating a user' });
    db.prepare(
      "UPDATE scheduled_tasks SET responsible_user_id = ?, updated_at = datetime('now') WHERE responsible_user_id = ? AND state IN ('pending','planned')"
    ).run(covering_user_id, req.params.id);
    const coveringUser = db.prepare('SELECT name FROM users WHERE id = ?').get(covering_user_id) as any;
    const admins = db.prepare("SELECT id FROM users WHERE team_id = ? AND role = 'administrator' AND status = 'active'").all(req.params.teamId) as any[];
    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)')
        .run(req.params.teamId, admin.id,
          `${user.name} has been deactivated. Their pending tasks have been reassigned to ${coveringUser?.name || 'covering user'}.`);
    }
    db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)')
      .run(req.params.teamId, covering_user_id,
        `Tasks from ${user.name} have been reassigned to you while they are inactive.`);
  }

  // Inactive → Retired: blocked until no active crew participations, no defaults, not default responsible
  if (status === 'retired' && user.status === 'inactive') {
    const inCrewDefaults = (db.prepare('SELECT COUNT(*) as cnt FROM required_task_crew_defaults WHERE user_id = ?').get(req.params.id) as any).cnt;
    const isDefaultResponsible = (db.prepare('SELECT COUNT(*) as cnt FROM required_tasks WHERE default_responsible_user_id = ? AND is_archived = 0').get(req.params.id) as any).cnt;
    const isResponsibleOnActive = (db.prepare(
      "SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE responsible_user_id = ? AND state IN ('pending','planned')"
    ).get(req.params.id) as any).cnt;
    const inActiveCrew = (db.prepare(
      "SELECT COUNT(*) as cnt FROM crew_participation cp JOIN scheduled_tasks st ON cp.scheduled_task_id = st.id WHERE cp.user_id = ? AND cp.status IN ('invited','confirmed') AND st.state IN ('pending','planned')"
    ).get(req.params.id) as any).cnt;

    if (inCrewDefaults > 0 || isDefaultResponsible > 0 || isResponsibleOnActive > 0 || inActiveCrew > 0) {
      return res.status(400).json({
        error: 'User cannot be retired while they have active task crew memberships, default responsibilities, or are responsible for pending/planned tasks. Remove them from all active task assignments first.'
      });
    }
  }

  // Cannot go retired from active
  if (status === 'retired' && user.status === 'active') {
    return res.status(400).json({ error: 'User must be inactive before retiring' });
  }

  // Retired → any: not permitted
  if (user.status === 'retired') {
    return res.status(400).json({ error: 'Retired users cannot change status' });
  }

  db.prepare(
    'UPDATE users SET name=COALESCE(?,name), email=COALESCE(?,email), role=COALESCE(?,role), status=COALESCE(?,status), language=COALESCE(?,language) WHERE id=?'
  ).run(name ?? null, email ?? null, role ?? null, status ?? null, language ?? null, req.params.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
