import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/notifications/:userId', (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE (user_id = ? OR user_id IS NULL) AND team_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.params.userId, req.params.teamId);
  res.json(notifications);
});

router.put('/:teamId/notifications/:notifId/read', (req, res) => {
  db.prepare('UPDATE notifications SET read_status = 1 WHERE id = ?').run(req.params.notifId);
  res.json({ success: true });
});

router.put('/:teamId/notifications/read-all/:userId', (req, res) => {
  db.prepare('UPDATE notifications SET read_status = 1 WHERE (user_id = ? OR user_id IS NULL) AND team_id = ?').run(req.params.userId, req.params.teamId);
  res.json({ success: true });
});

export default router;
