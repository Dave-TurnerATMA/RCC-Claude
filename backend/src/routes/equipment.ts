import { Router } from 'express';
import db from '../db/database';
import { translateEquipment } from '../services/ai';

const router = Router();

router.get('/:teamId/equipment', (req, res) => {
  const items = db.prepare('SELECT * FROM equipment WHERE team_id = ? ORDER BY name_en').all(req.params.teamId);
  res.json(items);
});

router.post('/:teamId/equipment', async (req, res) => {
  const { name_en, name_es, name_id } = req.body;
  if (!name_en) return res.status(400).json({ error: 'name_en required' });

  let finalEs = name_es || name_en;
  let finalId = name_id || name_en;

  // Auto-translate if translations not provided
  if (!name_es || !name_id) {
    try {
      const translated = await translateEquipment(name_en);
      if (!name_es) finalEs = translated.name_es;
      if (!name_id) finalId = translated.name_id;
    } catch (e) {
      // fallback to English
    }
  }

  const id = db.prepare('INSERT INTO equipment (team_id, name_en, name_es, name_id) VALUES (?, ?, ?, ?)')
    .run(req.params.teamId, name_en, finalEs, finalId).lastInsertRowid;
  res.json({ id, team_id: Number(req.params.teamId), name_en, name_es: finalEs, name_id: finalId });
});

router.put('/:teamId/equipment/:id', (req, res) => {
  const { name_en, name_es, name_id } = req.body;
  db.prepare('UPDATE equipment SET name_en=COALESCE(?,name_en), name_es=COALESCE(?,name_es), name_id=COALESCE(?,name_id) WHERE id=? AND team_id=?')
    .run(name_en ?? null, name_es ?? null, name_id ?? null, req.params.id, req.params.teamId);
  const updated = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id);
  res.json(updated);
});

router.delete('/:teamId/equipment/:id', (req, res) => {
  const inRequiredTasks = (db.prepare('SELECT COUNT(*) as cnt FROM required_task_equipment WHERE equipment_id = ?').get(req.params.id) as any).cnt;
  const inScheduledTasks = (db.prepare('SELECT COUNT(*) as cnt FROM task_equipment WHERE equipment_id = ?').get(req.params.id) as any).cnt;
  if (inRequiredTasks > 0 || inScheduledTasks > 0) {
    return res.status(400).json({ error: 'Cannot delete equipment that is referenced by tasks. Remove it from all tasks first.' });
  }
  db.prepare('DELETE FROM equipment WHERE id = ? AND team_id = ?').run(req.params.id, req.params.teamId);
  res.json({ success: true });
});

export default router;
