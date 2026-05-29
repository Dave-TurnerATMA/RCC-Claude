import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './db/database';
import { seedDatabase } from './db/seed';
import teamsRouter from './routes/teams';
import usersRouter from './routes/users';
import requiredTasksRouter from './routes/required-tasks';
import scheduledTasksRouter from './routes/scheduled-tasks';
import equipmentRouter from './routes/equipment';
import notificationsRouter from './routes/notifications';
import dashboardRouter from './routes/dashboard';
import uploadsRouter from './routes/uploads';
import spreadsheetRouter from './routes/spreadsheet';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve built frontend in production
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

initializeDatabase();
seedDatabase();

app.use('/api/teams', teamsRouter);
app.use('/api/teams', usersRouter);
app.use('/api/teams', requiredTasksRouter);
app.use('/api/teams', scheduledTasksRouter);
app.use('/api/teams', equipmentRouter);
app.use('/api/teams', notificationsRouter);
app.use('/api/teams', dashboardRouter);
app.use('/api', uploadsRouter);
app.use('/api', spreadsheetRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// SPA fallback — must be after all API routes
if (require('fs').existsSync(FRONTEND_DIST)) {
  app.get('*', (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Community Preparation Planning API running on port ${PORT}`);
});

export default app;
