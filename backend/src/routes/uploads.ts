import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db/database';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/teams/:teamId/scheduled-tasks/:taskId/uploads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { user_id } = req.body;
  const id = db.prepare('INSERT INTO task_uploads (scheduled_task_id, user_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)').run(
    req.params.taskId, user_id, req.file.originalname, `/uploads/${req.file.filename}`, req.file.mimetype
  ).lastInsertRowid;
  res.json({ id, file_name: req.file.originalname, file_path: `/uploads/${req.file.filename}`, file_type: req.file.mimetype });
});

export default router;
