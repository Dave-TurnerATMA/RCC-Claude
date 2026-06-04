import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/notifications/:userId', (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? AND team_id = ? AND is_read = 0
    ORDER BY created_at DESC LIMIT 50
  `).all(req.params.userId, req.params.teamId);
  res.json(notifications);
});

router.put('/:teamId/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
