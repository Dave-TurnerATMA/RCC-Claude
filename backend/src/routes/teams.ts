import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/', (_req, res) => {
  const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
  res.json(teams);
});

router.post('/', (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code required' });
  try {
    const id = db.prepare('INSERT INTO teams (name, code) VALUES (?, ?)').run(name, code).lastInsertRowid;
    res.json({ id, name, code });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
