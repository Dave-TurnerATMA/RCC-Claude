import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/dashboard', (req, res) => {
  const teamId = req.params.teamId;

  const tasksByState = db.prepare('SELECT state, COUNT(*) as count FROM scheduled_tasks WHERE team_id = ? GROUP BY state').all(teamId);
  const tasksByType = db.prepare('SELECT type, COUNT(*) as count FROM scheduled_tasks WHERE team_id = ? GROUP BY type').all(teamId);

  const overdueTasks = db.prepare(`
    SELECT st.*, u.name as responsible_user_name,
      CAST(julianday('now') - julianday(scheduled_date) AS INTEGER) as days_overdue
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ? AND st.state = 'pending' AND st.scheduled_date < date('now')
    ORDER BY st.scheduled_date ASC
  `).all(teamId) as any[];

  const totalDaysOverdue = overdueTasks.reduce((sum: number, t: any) => sum + (t.days_overdue || 0), 0);

  const oneOffStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      ROUND(AVG(CAST(julianday('now') - julianday(created_at) AS REAL)), 1) as avg_age_days,
      MAX(CAST(julianday('now') - julianday(created_at) AS INTEGER)) as max_age_days
    FROM scheduled_tasks
    WHERE team_id = ? AND type = 'one_off' AND state = 'pending'
  `).get(teamId) as any;

  const topPerformers = db.prepare(`
    SELECT u.name, u.id, u.role, COUNT(*) as tasks_completed
    FROM scheduled_tasks st
    JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ? AND st.state = 'completed' AND st.completed_at >= datetime('now', '-30 days')
    GROUP BY u.id, u.name
    ORDER BY tasks_completed DESC LIMIT 10
  `).all(teamId);

  const upcomingTasks = db.prepare(`
    SELECT st.*, u.name as responsible_user_name
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ? AND st.state IN ('pending','planned') AND st.scheduled_date BETWEEN date('now') AND date('now', '+30 days')
    ORDER BY st.scheduled_date ASC LIMIT 10
  `).all(teamId);

  const completedByDay = db.prepare(`
    SELECT date(completed_at) as date, COUNT(*) as count
    FROM scheduled_tasks
    WHERE team_id = ? AND state = 'completed' AND completed_at >= datetime('now', '-30 days')
    GROUP BY date(completed_at)
    ORDER BY date
  `).all(teamId);

  const pendingByPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM scheduled_tasks
    WHERE team_id = ? AND state IN ('pending','planned')
    GROUP BY priority
  `).all(teamId);

  res.json({
    tasksByState,
    tasksByType,
    overdueTasks,
    totalDaysOverdue,
    oneOffStats,
    topPerformers,
    upcomingTasks,
    completedByDay,
    pendingByPriority,
  });
});

export default router;
