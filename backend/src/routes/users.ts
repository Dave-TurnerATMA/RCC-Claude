import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.*,
      COALESCE((SELECT COUNT(*) FROM scheduled_tasks st WHERE st.responsible_user_id = u.id AND st.state IN ('pending','planned')), 0) as active_task_count
    FROM users u
    WHERE u.team_id = ?
    ORDER BY u.name
  `).all(req.params.teamId);
  res.json(users);
});

router.get('/:teamId/users/:userId', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND team_id = ?').get(req.params.userId, req.params.teamId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/:teamId/users', (req, res) => {
  const { name, email, role, language } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role required' });
  try {
    const id = db.prepare('INSERT INTO users (team_id, name, email, role, language) VALUES (?, ?, ?, ?, ?)').run(req.params.teamId, name, email, role, language || 'en').lastInsertRowid;
    res.json({ id, team_id: req.params.teamId, name, email, role, status: 'active', language: language || 'en' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:teamId/users/:userId', (req, res) => {
  const { name, email, role, status, language, covering_user_id } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND team_id = ?').get(req.params.userId, req.params.teamId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (status === 'inactive' && user.status === 'active') {
    if (!covering_user_id) return res.status(400).json({ error: 'covering_user_id required when deactivating a user' });
    db.prepare("UPDATE scheduled_tasks SET responsible_user_id = ? WHERE responsible_user_id = ? AND state IN ('pending','planned')").run(covering_user_id, req.params.userId);
    const admins = db.prepare("SELECT id FROM users WHERE team_id = ? AND role = 'administrator' AND status = 'active'").all(req.params.teamId) as any[];
    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(req.params.teamId, admin.id, 'user_deactivated', `${user.name} has been deactivated. Their active tasks have been reassigned to the covering user.`);
    }
  }

  db.prepare('UPDATE users SET name=COALESCE(?,name), email=COALESCE(?,email), role=COALESCE(?,role), status=COALESCE(?,status), language=COALESCE(?,language) WHERE id=?').run(name || null, email || null, role || null, status || null, language || null, req.params.userId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  res.json(updated);
});

export default router;
