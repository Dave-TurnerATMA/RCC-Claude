import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (team) api.getDashboard(team.id).then(setData).finally(() => setLoading(false));
  }, [team]);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">{t('common.loading')}</div>;
  if (!data) return null;

  const totalDaysOverdue = data.totalDaysOverdue || 0;
  const maxOverdueDial = Math.max(totalDaysOverdue, 1);
  const dialPercent = Math.min((totalDaysOverdue / Math.max(maxOverdueDial, 100)) * 100, 100);

  const stateData = data.tasksByState?.map((s: any) => ({
    name: t(`state.${s.state}`, s.state),
    value: s.count,
    color: STATE_COLORS[s.state] || '#6b7280',
  })) || [];

  const priorityData = data.pendingByPriority?.map((p: any) => ({
    name: t(`priority.${p.priority}`, p.priority),
    count: p.count,
    fill: PRIORITY_COLORS[p.priority] || '#6b7280',
  })) || [];

  const completedData = data.completedByDay?.map((d: any) => ({
    date: d.date?.slice(5),
    count: d.count,
  })) || [];

  return (
    <div className="pb-6">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.dashboard')}</h1>
      </div>

      <div className="p-3 space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="text-xs text-red-600 font-medium mb-1">⚠️ Overdue Tasks</div>
            <div className="text-3xl font-bold text-red-700">{data.overdueTasks?.length || 0}</div>
            <div className="text-xs text-red-500 mt-1">{totalDaysOverdue} total days overdue</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xs text-blue-600 font-medium mb-1">📋 Pending Tasks</div>
            <div className="text-3xl font-bold text-blue-700">
              {data.tasksByState?.find((s: any) => s.state === 'pending')?.count || 0}
            </div>
            <div className="text-xs text-blue-500 mt-1">Active right now</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-xs text-green-600 font-medium mb-1">✅ Completed (all time)</div>
            <div className="text-3xl font-bold text-green-700">
              {data.tasksByState?.find((s: any) => s.state === 'completed')?.count || 0}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="text-xs text-orange-600 font-medium mb-1">🔁 One-Off Tasks Open</div>
            <div className="text-3xl font-bold text-orange-700">{data.oneOffStats?.total || 0}</div>
            <div className="text-xs text-orange-500 mt-1">Avg {data.oneOffStats?.avg_age_days || 0} days old</div>
          </div>
        </div>

        {/* Overdue tasks dial */}
        {totalDaysOverdue > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">Total Overdue Days</div>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#fee2e2" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#dc2626" strokeWidth="12"
                    strokeDasharray={`${dialPercent * 2.51327} 251.327`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-red-700">{totalDaysOverdue}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900 mb-1">Action Required</div>
                <div>{data.overdueTasks?.length || 0} overdue tasks with a combined {totalDaysOverdue} days delay</div>
              </div>
            </div>
          </div>
        )}

        {/* Task status pie chart */}
        {stateData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">Tasks by Status</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stateData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {stateData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top performers */}
        {data.topPerformers?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">🏆 Top Contributors (Last 30 Days)</div>
            <div style={{ height: Math.max(data.topPerformers.length * 40, 120) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topPerformers} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="tasks_completed" name="Tasks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Completed activity */}
        {completedData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">Activity (Last 30 Days)</div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completedData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Priority breakdown */}
        {priorityData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">Open Tasks by Priority</div>
            <div className="space-y-2">
              {priorityData.sort((a: any, b: any) => {
                const order = ['urgent', 'high', 'medium', 'low'];
                return order.indexOf(a.name.toLowerCase()) - order.indexOf(b.name.toLowerCase());
              }).map((p: any) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="text-xs font-medium text-gray-700 w-16">{p.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(p.count / Math.max(...priorityData.map((x: any) => x.count))) * 100}%`, backgroundColor: p.fill }} />
                  </div>
                  <div className="text-xs font-bold text-gray-900 w-6 text-right">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming tasks */}
        {data.upcomingTasks?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-bold text-gray-900 mb-3">📅 Upcoming (Next 30 Days)</div>
            <div className="space-y-2">
              {data.upcomingTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="text-xs text-gray-500 w-16 flex-shrink-0">
                    {new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 text-sm text-gray-900 truncate">{task.short_description}</div>
                  <div className={`text-xs font-medium ${task.state === 'pending' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {task.state}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
