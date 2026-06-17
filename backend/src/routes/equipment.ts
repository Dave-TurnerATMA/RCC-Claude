import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/equipment', (req, res) => {
  const items = db.prepare('SELECT * FROM equipment WHERE team_id = ? ORDER BY name_en').all(req.params.teamId);
  res.json(items);
});

router.post('/:teamId/equipment', (req, res) => {
  const { name_en, name_es, name_id } = req.body;
  if (!name_en) return res.status(400).json({ error: 'name_en required' });
  const id = db.prepare('INSERT INTO equipment (team_id, name_en, name_es, name_id) VALUES (?, ?, ?, ?)').run(req.params.teamId, name_en, name_es || name_en, name_id || name_en).lastInsertRowid;
  res.json({ id, name_en, name_es: name_es || name_en, name_id: name_id || name_en });
});

router.put('/:teamId/equipment/:id', (req, res) => {
  const { name_en, name_es, name_id } = req.body;
  db.prepare('UPDATE equipment SET name_en=COALESCE(?,name_en), name_es=COALESCE(?,name_es), name_id=COALESCE(?,name_id) WHERE id=? AND team_id=?').run(name_en || null, name_es || null, name_id || null, req.params.id, req.params.teamId);
  res.json({ success: true });
});

export default router;
