import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';

const STATE_COLORS: Record<string, string> = {
  pending: '#3b82f6',
  planned: '#8b5cf6',
  completed: '#10b981',
  abandoned: '#6b7280',
  missed: '#ef4444',
  not_required: '#9ca3af',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (team) {
      api.getDashboard(team.id)
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [team?.id]);

  if (loading) {
    return (
      <div>
        <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
          <h1 className="font-bold text-gray-900 text-lg">{t('nav.dashboard')}</h1>
        </div>
        <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (!data) return null;

  const tasksByState: any[] = data.tasksByState || [];
  const overdueCount: number = data.overdueCount || 0;
  const totalDaysOverdue: number = data.totalDaysOverdue || 0;
  const topPerformers: any[] = data.topPerformers || [];
  const activityByDay: any[] = data.activityByDay || [];
  const upcomingTasks: any[] = data.upcomingTasks || [];
  const openOneOffStats: any = data.openOneOffStats || {};

  const stateChartData = tasksByState
    .filter((s: any) => s.count > 0)
    .map((s: any) => ({
      name: t(`state.${s.state}`, s.state),
      value: s.count,
      color: STATE_COLORS[s.state] || '#6b7280',
    }));

  const activityChartData = activityByDay.map((d: any) => ({
    date: d.date?.slice(5) || '',
    count: d.count || 0,
  }));

  const pendingCount = tasksByState.find((s: any) => s.state === 'pending')?.count || 0;
  const completedCount = tasksByState.find((s: any) => s.state === 'completed')?.count || 0;

  return (
    <div className="pb-6">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.dashboard')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{team?.name}</p>
      </div>

      <div className="p-3 space-y-4">
        {/* Key stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="text-xs text-red-600 font-medium mb-1">⚠️ {t('dashboard.overdueTasks')}</div>
            <div className="text-3xl font-bold text-red-700">{overdueCount}</div>
            <div className="text-xs text-red-500 mt-1">{totalDaysOverdue} {t('dashboard.totalDaysOverdue')}</div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xs text-blue-600 font-medium mb-1">📋 {t('dashboard.pendingTasks')}</div>
            <div className="text-3xl font-bold text-blue-700">{pendingCount}</div>
            <div className="text-xs text-blue-500 mt-1">{t('dashboard.activeRightNow')}</div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-xs text-green-600 font-medium mb-1">✅ {t('dashboard.completedAllTime')}</div>
            <div className="text-3xl font-bold text-green-700">{completedCount}</div>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="text-xs text-orange-600 font-medium mb-1">🔁 {t('dashboard.openOneOffTasks')}</div>
            <div className="text-3xl font-bold text-orange-700">{openOneOffStats.count || 0}</div>
            <div className="text-xs text-orange-500 mt-1">
              {t('dashboard.avgDaysOld', { days: Math.round(openOneOffStats.avg_age_days || 0) })}
            </div>
          </div>
        </div>

        {/* Overdue urgency bar */}
        {totalDaysOverdue > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">⏰ {t('dashboard.overdueUrgency')}</div>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#fee2e2" strokeWidth="14" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#dc2626" strokeWidth="14"
                    strokeDasharray={`${Math.min((totalDaysOverdue / Math.max(totalDaysOverdue, 100)) * 100, 100) * 2.389} 238.9`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-red-700">{totalDaysOverdue}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed">
                <div className="font-semibold text-gray-900 mb-0.5">{t('dashboard.actionRequired')}</div>
                <div>{overdueCount} {t('dashboard.overdueTasksWithDays', { days: totalDaysOverdue })}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks by state pie chart */}
        {stateChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">{t('dashboard.tasksByStatus')}</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stateChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stateChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
              {stateChartData.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top performers */}
        {topPerformers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">🏆 {t('dashboard.topPerformers')}</div>
            <div style={{ height: Math.max(topPerformers.length * 44, 120) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPerformers}
                  layout="vertical"
                  margin={{ left: 5, right: 30, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="user_name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="task_count" name={t('dashboard.tasksCompleted')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Activity last 14 days */}
        {activityChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">📈 {t('dashboard.activityLast14Days')}</div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityChartData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name={t('dashboard.tasksCompleted')} fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Upcoming tasks */}
        {upcomingTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">📅 {t('dashboard.upcomingTasks')}</div>
            <div className="space-y-0">
              {upcomingTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-500 w-14 flex-shrink-0">
                    {new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 text-sm text-gray-900 truncate">{task.short_description}</div>
                  <div className={`text-xs font-medium flex-shrink-0 ${task.state === 'pending' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {t(`state.${task.state}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {tasksByState.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📊</div>
            <div className="font-medium text-gray-700">No data yet</div>
            <div className="text-sm text-gray-500 mt-1">Tasks will appear here once created</div>
          </div>
        )}
      </div>
    </div>
  );
}
