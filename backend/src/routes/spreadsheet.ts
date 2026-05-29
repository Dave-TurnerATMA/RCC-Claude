import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { importSpreadsheet } from '../services/spreadsheet';
import db from '../db/database';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads/spreadsheets');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.ods'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
  },
});

// POST /api/spreadsheet/import
// Uploads a spreadsheet, infers schema via Claude, creates a table, and imports data.
router.post('/spreadsheet/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const result = await importSpreadsheet(req.file.path, req.file.originalname);
    fs.unlink(req.file.path, () => {}); // clean up temp file
    res.json({
      success: true,
      tableName: result.tableName,
      description: result.schema.description,
      columns: result.schema.columns,
      rowsInserted: result.rowsInserted,
      skippedRows: result.skippedRows,
      errors: result.errors,
    });
  } catch (err: unknown) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err instanceof Error ? err.message : 'Import failed' });
  }
});

// GET /api/spreadsheet/tables
// List all dynamically-imported spreadsheet tables (those not in the core schema).
const CORE_TABLES = new Set([
  'teams', 'users', 'equipment', 'required_tasks', 'required_task_equipment',
  'required_task_crew', 'required_task_logs', 'scheduled_tasks', 'task_crew',
  'task_equipment', 'task_notes', 'task_uploads', 'notifications',
]);

router.get('/spreadsheet/tables', (_req, res) => {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all() as { name: string }[];

  const imported = tables.filter(t => !CORE_TABLES.has(t.name));

  const result = imported.map(t => {
    const info = db.prepare(`PRAGMA table_info(${t.name})`).all() as {
      name: string; type: string; notnull: number; pk: number;
    }[];
    const count = (db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get() as { cnt: number }).cnt;
    return { tableName: t.name, columns: info, rowCount: count };
  });

  res.json(result);
});

// GET /api/spreadsheet/tables/:tableName/rows?limit=100&offset=0
router.get('/spreadsheet/tables/:tableName/rows', (req, res) => {
  const { tableName } = req.params;
  // Validate table name to prevent SQL injection (alphanumeric + underscore only)
  if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  if (CORE_TABLES.has(tableName)) {
    return res.status(403).json({ error: 'Access to core tables not allowed via this endpoint' });
  }

  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(tableName);
  if (!tableExists) return res.status(404).json({ error: 'Table not found' });

  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const offset = parseInt(req.query.offset as string) || 0;

  const rows = db.prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`).all(limit, offset);
  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM ${tableName}`).get() as { cnt: number }).cnt;

  res.json({ rows, total, limit, offset });
});

export default router;
