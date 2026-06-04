import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import PriorityBadge from '../../components/PriorityBadge';
import StateBadge from '../../components/StateBadge';
import CompleteTaskModal from '../../components/CompleteTaskModal';
import TaskDetailsModal from '../../components/TaskDetailsModal';

export default function YourSchedule() {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskForDetails, setTaskForDetails] = useState<any>(null);
  const [reassignTask, setReassignTask] = useState<any>(null);

  const load = useCallback(async () => {
    if (!team || !user) return;
    setLoading(true);
    try {
      const [taskData, userData] = await Promise.all([
        api.getScheduledTasks(team.id, { view: 'mine', user_id: String(user.id) }),
        api.getUsers(team.id),
      ]);
      setTasks(taskData);
      setUsers(userData.filter((u: any) => u.status === 'active'));
    } finally {
      setLoading(false);
    }
  }, [team?.id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (task: any) => task.scheduled_date && task.scheduled_date < today && task.state === 'pending';

  const leaveTeam = async (task: any) => {
    try {
      await api.removeCrew(team!.id, task.id, user!.id);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const reassign = async (task: any, newUserId: number) => {
    try {
      await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: newUserId });
      setReassignTask(null);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const overdueTasks = tasks.filter(isOverdue);
  const otherTasks = tasks.filter(t => !isOverdue(t));

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.yourSchedule')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tasks you're responsible for, involved in, or open to all</p>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎉</div>
            <div className="font-medium text-gray-700 mb-1">You're all caught up!</div>
            <div className="text-sm text-gray-500">No pending tasks assigned to you</div>
          </div>
        ) : (
          <>
            {overdueTasks.length > 0 && (
              <div>
                <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">⚠️ Overdue ({overdueTasks.length})</div>
                {overdueTasks.map(task => (
                  <MyTaskCard key={task.id} task={task} isOverdue currentUserId={user!.id}
                    onComplete={() => setSelectedTask(task)}
                    onDetails={() => setTaskForDetails(task)}
                    onReassign={() => setReassignTask(task)}
                    onLeaveTeam={() => leaveTeam(task)} />
                ))}
              </div>
            )}
            {otherTasks.length > 0 && (
              <div>
                {overdueTasks.length > 0 && <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 mt-4">Active Tasks</div>}
                {otherTasks.map(task => (
                  <MyTaskCard key={task.id} task={task} isOverdue={false} currentUserId={user!.id}
                    onComplete={() => setSelectedTask(task)}
                    onDetails={() => setTaskForDetails(task)}
                    onReassign={() => setReassignTask(task)}
                    onLeaveTeam={() => leaveTeam(task)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedTask && (
        <CompleteTaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onCompleted={load} />
      )}
      {taskForDetails && (
        <TaskDetailsModal task={taskForDetails} onClose={() => setTaskForDetails(null)} onRefresh={load} />
      )}
      {reassignTask && (
        <ReassignModal task={reassignTask} users={users.filter(u => u.id !== user?.id)}
          onReassign={(uid: number) => reassign(reassignTask, uid)}
          onClose={() => setReassignTask(null)} />
      )}
    </div>
  );
}

function MyTaskCard({ task, isOverdue, currentUserId, onComplete, onDetails, onReassign, onLeaveTeam }: any) {
  const { t } = useTranslation();
  const isResponsible = task.responsible_user_id === currentUserId;
  const today = new Date().toISOString().slice(0, 10);
  const daysOverdue = isOverdue && task.scheduled_date
    ? Math.floor((new Date(today).getTime() - new Date(task.scheduled_date + 'T00:00:00').getTime()) / 86400000)
    : 0;

  const cardBg = isOverdue
    ? 'bg-red-50 border-l-4 border-l-red-500'
    : task.state === 'planned'
    ? 'bg-purple-50 border-l-4 border-l-purple-400'
    : 'bg-white border-l-4 border-l-green-400';

  return (
    <div className={`rounded-xl shadow-sm border border-gray-100 ${cardBg} overflow-hidden mb-3`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm flex-1">{task.short_description}</h3>
          <PriorityBadge priority={task.priority} />
        </div>

        {isOverdue && (
          <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-2">
            ⚠️ {daysOverdue} {t('task.daysOverdue')}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <StateBadge state={task.state} />
          {isResponsible && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">Responsible</span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{t(`type.${task.type}`)}</span>
          {task.crew_type === 'open_optional' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">Open – Optional</span>
          )}
          {task.crew_type === 'all_expected' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-medium">All – Expected</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
          <div>📅 {task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString() : '—'}</div>
          <div>👥 {task.crew?.length || 0} {t('task.crewCount')}</div>
          {task.estimate_hours && <div>⏱️ {task.estimate_hours}h est.</div>}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={onDetails} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700">
            {t('task.details')}
          </button>
          {task.state === 'pending' && (
            <button onClick={onComplete} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
              {t('common.complete')}
            </button>
          )}
          {task.state === 'pending' && isResponsible && (
            <button onClick={onReassign} className="py-2 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium">
              {t('task.reassign')}
            </button>
          )}
          {!isResponsible && task.state === 'pending' && task.crew?.some((c: any) => c.id === currentUserId) && (
            <button onClick={onLeaveTeam} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
              {t('task.removeFromTeam')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReassignModal({ task, users, onReassign, onClose }: any) {
  const [selected, setSelected] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-3">Reassign Task</h3>
        <p className="text-sm text-gray-600 mb-4"><strong>{task.short_description}</strong></p>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4">
          <option value="">Select user...</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium">Cancel</button>
          <button onClick={() => selected && onReassign(Number(selected))} disabled={!selected}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40">Reassign</button>
        </div>
      </div>
    </div>
  );
}
