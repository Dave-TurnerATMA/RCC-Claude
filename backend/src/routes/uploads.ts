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

router.post('/uploads/:scheduledTaskId', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const id = db.prepare(
    'INSERT INTO task_uploads (scheduled_task_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.scheduledTaskId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size).lastInsertRowid;
  res.json({ id, filename: req.file.filename, original_name: req.file.originalname, url: `/uploads/${req.file.filename}` });
});

export default router;
