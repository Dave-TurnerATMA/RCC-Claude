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
    const [taskData, userData] = await Promise.all([
      api.getScheduledTasks(team.id, { view: 'mine', user_id: String(user.id) }),
      api.getUsers(team.id),
    ]);
    setTasks(taskData);
    setUsers(userData.filter((u: any) => u.status === 'active'));
    setLoading(false);
  }, [team, user]);

  useEffect(() => { load(); }, [load]);

  const isOverdue = (task: any) => task.scheduled_date && new Date(task.scheduled_date) < new Date() && task.state === 'pending';

  const reassign = async (task: any, newUserId: number) => {
    await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: newUserId });
    // Send notification
    const newUser = users.find(u => u.id === newUserId);
    if (newUser) {
      // Notification is created server-side in a full impl; here just reload
    }
    setReassignTask(null);
    load();
  };

  const leaveTeam = async (task: any) => {
    await api.removeCrew(team!.id, task.id, user!.id);
    load();
  };

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.yourSchedule')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tasks you're responsible for or involved in</p>
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
        ) : tasks.map(task => (
          <MyTaskCard
            key={task.id}
            task={task}
            isOverdue={isOverdue(task)}
            currentUserId={user!.id}
            onComplete={() => setSelectedTask(task)}
            onDetails={() => setTaskForDetails(task)}
            onReassign={() => setReassignTask(task)}
            onLeaveTeam={() => leaveTeam(task)}
            users={users}
          />
        ))}
      </div>

      {selectedTask && (
        <CompleteTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onCompleted={load}
        />
      )}
      {taskForDetails && (
        <TaskDetailsModal task={taskForDetails} onClose={() => setTaskForDetails(null)} />
      )}
      {reassignTask && (
        <ReassignModal
          task={reassignTask}
          users={users.filter(u => u.id !== user?.id)}
          onReassign={(uid: number) => reassign(reassignTask, uid)}
          onClose={() => setReassignTask(null)}
        />
      )}
    </div>
  );
}

function MyTaskCard({ task, isOverdue, currentUserId, onComplete, onDetails, onReassign, onLeaveTeam, users }: any) {
  const { t } = useTranslation();
  const isResponsible = task.responsible_user_id === currentUserId;
  const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(task.scheduled_date).getTime()) / 86400000) : 0;

  const cardBg = isOverdue
    ? 'bg-red-50 border-l-4 border-l-red-500'
    : task.state === 'planned'
    ? 'bg-purple-50 border-l-4 border-l-purple-400'
    : 'bg-white border-l-4 border-l-green-400';

  return (
    <div className={`rounded-xl shadow-sm border border-gray-100 ${cardBg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm flex-1">{task.short_description}</h3>
          <PriorityBadge priority={task.priority} />
        </div>

        {isOverdue && (
          <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-2">
            <span>⚠️</span> {daysOverdue} {t('task.daysOverdue')}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <StateBadge state={task.state} />
          {isResponsible && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
              👤 Responsible
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <span>📅</span>
            <span>{task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👥</span>
            <span>{task.crew?.length || 0} {t('task.crewCount')}</span>
          </div>
          {task.estimate_hours && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{task.estimate_hours} {t('common.hours')}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={onDetails} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors flex items-center gap-1">
            📊 Details
          </button>
          {task.state === 'pending' && isResponsible && (
            <>
              <button onClick={onComplete} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors">
                ✅ Complete
              </button>
              <button onClick={onReassign} className="py-2 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-colors">
                {t('task.reassign')}
              </button>
            </>
          )}
          {!isResponsible && task.state === 'pending' && (
            <button onClick={onLeaveTeam} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
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
        <h3 className="font-bold text-gray-900 mb-4">Reassign Task</h3>
        <p className="text-sm text-gray-600 mb-4">Select who to reassign: <strong>{task.short_description}</strong></p>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">-- Select user --</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={() => selected && onReassign(Number(selected))} disabled={!selected}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700">Reassign</button>
        </div>
      </div>
    </div>
  );
}
