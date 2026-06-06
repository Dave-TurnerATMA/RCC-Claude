import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import PriorityBadge from '../../components/PriorityBadge';
import StateBadge from '../../components/StateBadge';
import CompleteTaskModal from '../../components/CompleteTaskModal';
import TaskManageModal from '../../components/TaskManageModal';

export default function TeamActivity() {
  const { t } = useTranslation();
  const { team, user, isAdmin } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('active');
  const [order, setOrder] = useState('date');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskToComplete, setTaskToComplete] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    short_description: '',
    task_overview: '',
    priority: 'medium',
    scheduled_date: '',
    estimate_hours: '',
    responsible_user_id: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const params: any = { order };
      if (stateFilter === 'active') params.state = 'active';
      else if (stateFilter !== 'all') params.state = stateFilter;
      if (filter === 'unassigned') params.view = 'unassigned';
      else if (filter === 'responsible') { params.view = 'responsible'; params.user_id = String(user!.id); }
      else if (filter === 'involved') { params.view = 'involved'; params.user_id = String(user!.id); }
      const [taskData, userData] = await Promise.all([
        api.getScheduledTasks(team.id, params),
        api.getUsers(team.id),
      ]);
      setTasks(taskData);
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  }, [team?.id, user?.id, filter, stateFilter, order]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (task: any) => task.scheduled_date && task.scheduled_date < today && task.state === 'pending';

  const takeResponsibility = async (task: any) => {
    try {
      await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: user!.id });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const assignTo = async (taskId: number, userId: number) => {
    try {
      await api.updateScheduledTask(team!.id, taskId, { responsible_user_id: userId });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleCreate = async () => {
    if (!createForm.short_description || !createForm.task_overview) return;
    setSaving(true);
    try {
      await api.createScheduledTask(team!.id, {
        type: 'manual',
        short_description: createForm.short_description,
        task_overview: createForm.task_overview,
        priority: createForm.priority,
        scheduled_date: createForm.scheduled_date || null,
        estimate_hours: createForm.estimate_hours ? parseFloat(createForm.estimate_hours) : null,
        responsible_user_id: createForm.responsible_user_id ? parseInt(createForm.responsible_user_id) : null,
        created_by_user_id: user?.id,
      });
      setShowCreate(false);
      setCreateForm({ short_description: '', task_overview: '', priority: 'medium', scheduled_date: '', estimate_hours: '', responsible_user_id: '' });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const FILTERS = [
    { id: 'all', label: t('filters.allTasks') },
    { id: 'unassigned', label: t('filters.unassigned') },
    { id: 'responsible', label: t('filters.myResponsibility') },
    { id: 'involved', label: t('filters.involved') },
  ];

  const STATE_FILTERS = [
    { id: 'active', label: t('state.active') },
    { id: 'pending', label: t('state.pending') },
    { id: 'planned', label: t('state.planned') },
    { id: 'completed', label: t('state.completed') },
    { id: 'missed', label: t('state.missed') },
  ];

  return (
    <div className="flex flex-col">
      {/* Filters header */}
      <div className="bg-white border-b sticky top-16 z-20 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-gray-900 text-lg">{t('nav.teamActivity')}</h1>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
            + {t('common.create')}
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

      {/* Task list */}
      <div className="flex-1 p-3 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div>{t('common.noData')}</div>
          </div>
        ) : tasks.map(task => (
          <ActivityCard key={task.id} task={task} isOverdue={isOverdue(task)}
            currentUserId={user!.id} users={users} isAdmin={isAdmin}
            onManage={() => setSelectedTask(task)}
            onComplete={() => setTaskToComplete(task)}
            onTakeResponsibility={() => takeResponsibility(task)}
            onAssign={(uid: number) => assignTo(task.id, uid)} />
        ))}
      </div>

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('task.newTask')}</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.shortDescription')} *</label>
                <input type="text" value={createForm.short_description}
                  onChange={e => setCreateForm(p => ({ ...p, short_description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.overview')} *</label>
                <textarea value={createForm.task_overview}
                  onChange={e => setCreateForm(p => ({ ...p, task_overview: e.target.value }))} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.priority')}</label>
                  <select value={createForm.priority} onChange={e => setCreateForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {['urgent', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.scheduledDate')}</label>
                  <input type="date" value={createForm.scheduled_date}
                    onChange={e => setCreateForm(p => ({ ...p, scheduled_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.estimateHours')}</label>
                  <input type="number" min="0" step="0.5" value={createForm.estimate_hours}
                    onChange={e => setCreateForm(p => ({ ...p, estimate_hours: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.responsible')}</label>
                  <select value={createForm.responsible_user_id}
                    onChange={e => setCreateForm(p => ({ ...p, responsible_user_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">{t('common.none')}</option>
                    {users.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium">{t('common.cancel')}</button>
                <button onClick={handleCreate} disabled={!createForm.short_description || !createForm.task_overview || saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40">
                  {saving ? t('common.loading') : t('common.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskManageModal task={selectedTask} onClose={() => { setSelectedTask(null); load(); }} onRefresh={load} />
      )}
      {taskToComplete && (
        <CompleteTaskModal task={taskToComplete} onClose={() => setTaskToComplete(null)} onCompleted={() => { setTaskToComplete(null); load(); }} />
      )}
    </div>
  );
}

function ActivityCard({ task, isOverdue, currentUserId, users, isAdmin, onManage, onComplete, onTakeResponsibility, onAssign }: any) {
  const { t } = useTranslation();
  const [showAssign, setShowAssign] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const daysOverdue = isOverdue && task.scheduled_date
    ? Math.floor((new Date(today).getTime() - new Date(task.scheduled_date + 'T00:00:00').getTime()) / 86400000)
    : 0;

  const cardBg = isOverdue
    ? 'bg-red-50 border-l-4 border-l-red-500'
    : task.state === 'planned'
    ? 'bg-purple-50 border-l-4 border-l-purple-400'
    : 'bg-white border-l-4 border-l-blue-400';

  const isUnassigned = !task.responsible_user_id;
  const isMyTask = task.responsible_user_id === currentUserId;
  const crewCount = (task.crew_participation || task.crew || []).filter((c: any) => c.status !== 'declined').length;

  return (
    <div className={`rounded-xl shadow-sm border border-gray-100 ${cardBg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm flex-1">{task.short_description}</h3>
          <PriorityBadge priority={task.priority} />
        </div>

        {isOverdue && (
          <div className="text-xs text-red-600 font-medium mb-2">⚠️ {daysOverdue} {t('task.daysOverdue')}</div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <StateBadge state={task.state} />
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{t(`type.${task.type}`)}</span>
          {isUnassigned && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{t('common.unassigned')}</span>}
          {isMyTask && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Mine</span>}
          {task.participants === 'open_optional' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Open</span>
          )}
          {task.participants === 'all_expected' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">All Expected</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
          <div>📅 {task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString() : '—'}</div>
          <div className={isUnassigned ? 'text-orange-600' : ''}>
            👤 {task.responsible_user_name || t('task.noResponsible')}
          </div>
          <div>👥 {crewCount} crew</div>
          {task.estimate_hours && <div>⏱️ {task.actual_hours || task.estimate_hours}h</div>}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={onManage} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700">
            {t('common.manage')}
          </button>
          {task.state === 'pending' && (
            <button onClick={onComplete} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
              {t('common.complete')}
            </button>
          )}
          {isUnassigned && task.state === 'pending' && (
            <button onClick={onTakeResponsibility} className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
              {t('task.takeResponsibility')}
            </button>
          )}
          {isAdmin && task.state !== 'completed' && (
            <button onClick={() => setShowAssign(!showAssign)} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
              {t('common.assign')}
            </button>
          )}
        </div>

        {showAssign && (
          <div className="mt-2 border-t pt-2">
            <select onChange={e => { if (e.target.value) { onAssign(Number(e.target.value)); setShowAssign(false); } }} defaultValue=""
              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5">
              <option value="">Select user...</option>
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
