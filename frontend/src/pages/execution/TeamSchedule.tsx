import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';
import PriorityBadge from '../../components/PriorityBadge';
import StateBadge from '../../components/StateBadge';
import TaskManageModal from '../../components/TaskManageModal';
import CreateTaskModal from '../../components/CreateTaskModal';

export default function TeamSchedule() {
  const { t } = useTranslation();
  const { team, user, isAdmin, isTeamLead } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('active');
  const [order, setOrder] = useState('date');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    const params: any = { order };
    if (stateFilter !== 'active') params.state = stateFilter;
    if (filter === 'unassigned') params.view = 'unassigned';
    else if (filter === 'mine') params.view = 'responsible';
    else if (filter === 'involved') { params.view = 'mine'; params.user_id = String(user!.id); }
    if (filter === 'mine' || filter === 'involved') params.user_id = String(user!.id);
    const [taskData, userData] = await Promise.all([
      api.getScheduledTasks(team.id, params),
      api.getUsers(team.id),
    ]);
    setTasks(taskData);
    setUsers(userData);
    setLoading(false);
  }, [team, user, filter, stateFilter, order]);

  useEffect(() => { load(); }, [load]);

  const isOverdue = (task: any) => task.scheduled_date && new Date(task.scheduled_date) < new Date() && task.state === 'pending';

  const takeResponsibility = async (task: any) => {
    await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: user!.id });
    load();
  };

  const FILTERS = [
    { id: 'all', label: t('filters.allTasks') },
    { id: 'unassigned', label: t('filters.unassigned') },
    { id: 'mine', label: t('filters.myResponsibility') },
    { id: 'involved', label: t('filters.involved') },
  ];

  const STATE_FILTERS = [
    { id: 'active', label: 'Active' },
    { id: 'pending', label: t('state.pending') },
    { id: 'planned', label: t('state.planned') },
    { id: 'completed', label: t('state.completed') },
    { id: 'missed', label: t('state.missed') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="bg-white border-b sticky top-16 z-20 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-gray-900 text-lg">{t('nav.teamSchedule')}</h1>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1">
            <span>+</span> {t('common.create')}
          </button>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1.5 pb-1">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === f.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
            {STATE_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <select value={order} onChange={e => setOrder(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
            <option value="date">{t('filters.byDate')}</option>
            <option value="priority">{t('filters.byPriority')}</option>
            <option value="estimate">{t('filters.byEstimate')}</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div>{t('common.noData')}</div>
          </div>
        ) : tasks.map(task => (
          <TaskCard
            key={task.id} task={task} isOverdue={isOverdue(task)}
            onManage={() => setSelectedTask(task)}
            onTakeResponsibility={() => takeResponsibility(task)}
            onAssign={async (userId: number) => {
              await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: userId });
              load();
            }}
            users={users} isAdmin={isAdmin} isTeamLead={isTeamLead}
            currentUserId={user!.id}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskManageModal task={selectedTask} onClose={() => { setSelectedTask(null); load(); }} />
      )}
      {showCreate && (
        <CreateTaskModal onClose={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function TaskCard({ task, isOverdue, onManage, onTakeResponsibility, onAssign, users, isAdmin, isTeamLead, currentUserId }: any) {
  const { t } = useTranslation();
  const [showAssign, setShowAssign] = useState(false);

  const cardClass = isOverdue
    ? 'bg-red-50 border-l-4 border-l-red-500'
    : task.state === 'planned'
    ? 'bg-purple-50 border-l-4 border-l-purple-400'
    : 'bg-white border-l-4 border-l-blue-400';

  const daysOverdue = isOverdue
    ? Math.floor((Date.now() - new Date(task.scheduled_date).getTime()) / 86400000)
    : 0;

  const typeColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    one_off: 'bg-gray-100 text-gray-700',
    follow_up: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className={`rounded-xl shadow-sm border border-gray-100 ${cardClass} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">{task.short_description}</h3>
          <PriorityBadge priority={task.priority} />
        </div>

        {isOverdue && (
          <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-2">
            <span>⚠️</span> {daysOverdue} {t('task.daysOverdue')}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <StateBadge state={task.state} />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[task.type] || 'bg-gray-100 text-gray-600'}`}>
            {t(`type.${task.type}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <span>📅</span>
            <span>{task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👤</span>
            <span className={`truncate ${!task.responsible_user_name ? 'text-orange-600 font-medium' : ''}`}>
              {task.responsible_user_name || t('task.noResponsible')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>👥</span>
            <span>{task.crew?.length || 0} {t('task.crewCount')}</span>
          </div>
          {task.estimate_hours && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{task.state === 'completed' ? (task.actual_hours || '—') : task.estimate_hours} {t('common.hours')}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onManage} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
            {t('common.manage')}
          </button>
          {!task.responsible_user_name && task.state === 'pending' && (
            <button onClick={onTakeResponsibility} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
              {t('task.takeResponsibility')}
            </button>
          )}
          {isAdmin && task.state !== 'completed' && (
            <button onClick={() => setShowAssign(!showAssign)} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
              {t('common.assign')}
            </button>
          )}
        </div>

        {showAssign && (
          <div className="mt-2 border-t pt-2">
            <select onChange={e => { if (e.target.value) { onAssign(Number(e.target.value)); setShowAssign(false); } }}
              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" defaultValue="">
              <option value="">-- Select user --</option>
              {users.filter((u: any) => u.status === 'active').map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
