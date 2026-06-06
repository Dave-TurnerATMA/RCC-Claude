import { Router } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:teamId/dashboard', (req, res) => {
  const teamId = req.params.teamId;

  const tasksByState = db.prepare(
    "SELECT state, COUNT(*) as count FROM scheduled_tasks WHERE team_id = ? GROUP BY state"
  ).all(teamId);

  const overdueRows = db.prepare(`
    SELECT CAST(julianday('now') - julianday(scheduled_date) AS INTEGER) as days_overdue
    FROM scheduled_tasks
    WHERE team_id = ? AND state = 'pending' AND scheduled_date < date('now')
  `).all(teamId) as any[];

  const overdueCount = overdueRows.length;
  const totalDaysOverdue = overdueRows.reduce((s, r) => s + (r.days_overdue || 0), 0);

  // Top performers based on crew_participation records (confirmed) on completed tasks
  const topPerformers = db.prepare(`
    SELECT u.name as user_name, u.id,
      COUNT(DISTINCT CASE WHEN st.responsible_user_id = u.id THEN st.id END) as responsible_count,
      COUNT(DISTINCT CASE WHEN cp.user_id = u.id THEN st.id END) as crew_count,
      (
        COUNT(DISTINCT CASE WHEN st.responsible_user_id = u.id THEN st.id END) +
        COUNT(DISTINCT CASE WHEN cp.user_id = u.id THEN st.id END)
      ) as task_count
    FROM users u
    LEFT JOIN scheduled_tasks st ON (st.responsible_user_id = u.id OR 1=1)
      AND st.team_id = ? AND st.state = 'completed'
      AND st.completed_at >= datetime('now', '-30 days')
    LEFT JOIN crew_participation cp ON cp.scheduled_task_id = st.id
      AND cp.user_id = u.id AND cp.status = 'confirmed'
    WHERE u.team_id = ?
    GROUP BY u.id, u.name
    HAVING task_count > 0
    ORDER BY task_count DESC LIMIT 10
  `).all(teamId, teamId);

  const activityByDay = db.prepare(`
    SELECT date(completed_at) as date, COUNT(*) as count
    FROM scheduled_tasks
    WHERE team_id = ? AND state = 'completed' AND completed_at >= datetime('now', '-14 days')
    GROUP BY date(completed_at)
    ORDER BY date ASC
  `).all(teamId);

  const upcomingTasks = db.prepare(`
    SELECT st.*, u.name as responsible_user_name
    FROM scheduled_tasks st
    LEFT JOIN users u ON st.responsible_user_id = u.id
    WHERE st.team_id = ? AND st.state IN ('pending','planned')
      AND st.scheduled_date BETWEEN date('now') AND date('now', '+14 days')
    ORDER BY st.scheduled_date ASC LIMIT 20
  `).all(teamId);

  const openOneOffStats = db.prepare(`
    SELECT
      COUNT(*) as count,
      ROUND(AVG(CAST(julianday('now') - julianday(created_at) AS REAL)), 1) as avg_age_days
    FROM scheduled_tasks
    WHERE team_id = ? AND type IN ('manual','planned') AND state IN ('pending','planned')
  `).get(teamId) as any;

  res.json({
    tasksByState,
    overdueCount,
    totalDaysOverdue,
    topPerformers,
    activityByDay,
    upcomingTasks,
    openOneOffStats: {
      count: openOneOffStats?.count || 0,
      avg_age_days: openOneOffStats?.avg_age_days || 0
    }
  });
});

export default router;
