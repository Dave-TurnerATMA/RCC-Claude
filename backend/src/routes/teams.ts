import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/', (_req, res) => {
  const teams = db.prepare('SELECT id, name FROM teams ORDER BY name').all();
  res.json(teams);
});

export default router;
