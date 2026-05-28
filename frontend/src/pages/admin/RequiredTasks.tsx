import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';
import PriorityBadge from '../../components/PriorityBadge';

export default function RequiredTasks() {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewTask, setViewTask] = useState<any>(null);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    const [taskData, userData, eqData] = await Promise.all([
      api.getRequiredTasks(team.id),
      api.getUsers(team.id),
      api.getEquipment(team.id),
    ]);
    setTasks(taskData);
    setUsers(userData.filter((u: any) => u.status === 'active'));
    setEquipment(eqData);
    setLoading(false);
  }, [team]);

  useEffect(() => { load(); }, [load]);

  const archive = async (task: any) => {
    if (!confirm(`Archive "${task.short_description}"? This will hide it from the list.`)) return;
    await api.updateRequiredTask(team!.id, task.id, { archived: 1, updated_by_user_id: user!.id });
    load();
  };

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20 flex items-center justify-between">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.requiredTasks')}</h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + {t('common.add')}
        </button>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : tasks.map(task => (
          <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm flex-1">{task.short_description}</h3>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                <span>🔄 Every {task.frequency_days} days</span>
                <span>⏱ {task.estimate_hours}h est.</span>
                <span>📋 {task.planned_instances} planned</span>
                <span>✅ {task.completed_count || 0} done</span>
              </div>
              {task.responsible_user_name && (
                <div className="text-xs text-gray-600 mb-3">
                  👤 Default: {task.responsible_user_name}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setViewTask(task)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
                  View Details
                </button>
                <button onClick={() => setEditTask(task)} className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                  {t('common.edit')}
                </button>
                <button onClick={() => archive(task)} className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors">
                  Archive
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && tasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📋</div>
            <div className="font-medium text-gray-700">No required tasks yet</div>
            <div className="text-sm text-gray-500 mt-1">Create your first recurring task</div>
          </div>
        )}
      </div>

      {(showCreate || editTask) && (
        <RequiredTaskForm
          task={editTask}
          users={users}
          equipment={equipment}
          onClose={() => { setShowCreate(false); setEditTask(null); load(); }}
        />
      )}
      {viewTask && (
        <RequiredTaskDetail task={viewTask} onClose={() => setViewTask(null)} />
      )}
    </div>
  );
}

function RequiredTaskForm({ task, users, equipment, onClose }: any) {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [form, setForm] = useState({
    short_description: task?.short_description || '',
    overview: task?.overview || '',
    priority: task?.priority || 'medium',
    first_scheduled_date: task?.first_scheduled_date || '',
    frequency_days: task?.frequency_days?.toString() || '30',
    default_responsible_user_id: task?.default_responsible_user_id?.toString() || '',
    estimate_hours: task?.estimate_hours?.toString() || '1',
    planned_instances: task?.planned_instances?.toString() || '2',
  });
  const [crewIds, setCrewIds] = useState<number[]>(task?.crew?.map((c: any) => c.id) || []);
  const [eqIds, setEqIds] = useState<number[]>(task?.equipment?.map((e: any) => e.id) || []);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleCrew = (id: number) => setCrewIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleEq = (id: number) => setEqIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    if (!form.short_description || !form.overview || !form.priority || !form.first_scheduled_date || !form.estimate_hours) {
      alert('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        short_description: form.short_description,
        overview: form.overview,
        priority: form.priority,
        first_scheduled_date: form.first_scheduled_date,
        frequency_days: Number(form.frequency_days),
        default_responsible_user_id: form.default_responsible_user_id ? Number(form.default_responsible_user_id) : null,
        estimate_hours: Number(form.estimate_hours),
        planned_instances: Number(form.planned_instances),
        crew_ids: crewIds,
        equipment_ids: eqIds,
        [task ? 'updated_by_user_id' : 'created_by_user_id']: user!.id,
      };
      if (task) {
        await api.updateRequiredTask(team!.id, task.id, payload);
      } else {
        await api.createRequiredTask(team!.id, payload);
      }
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <Modal isOpen title={task ? 'Edit Required Task' : 'New Required Task'} onClose={onClose} size="xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.shortDescription')} *</label>
          <input type="text" value={form.short_description} onChange={e => set('short_description', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.overview')} *</label>
          <textarea value={form.overview} onChange={e => set('overview', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.priority')} *</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.estimateHours')} *</label>
            <input type="number" min="0" max="100" step="0.5" value={form.estimate_hours} onChange={e => set('estimate_hours', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.firstScheduledDate')} *</label>
            <input type="date" value={form.first_scheduled_date} min={tomorrow.toISOString().split('T')[0]} onChange={e => set('first_scheduled_date', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.frequencyDays')} *</label>
            <select value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="7">Weekly (7)</option>
              <option value="14">Fortnightly (14)</option>
              <option value="30">Monthly (30)</option>
              <option value="60">Every 2 months (60)</option>
              <option value="90">Quarterly (90)</option>
              <option value="180">Semi-annual (180)</option>
              <option value="365">Annual (365)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.plannedInstances')}</label>
            <input type="number" min="1" max="10" value={form.planned_instances} onChange={e => set('planned_instances', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.responsible')}</label>
            <select value={form.default_responsible_user_id} onChange={e => set('default_responsible_user_id', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">-- None --</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('task.crew')} (default)</label>
          <div className="flex flex-wrap gap-2">
            {users.map((u: any) => (
              <button key={u.id} onClick={() => toggleCrew(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${crewIds.includes(u.id) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {crewIds.includes(u.id) ? '✓ ' : ''}{u.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('task.equipment')} (default)</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {equipment.map((eq: any) => (
              <button key={eq.id} onClick={() => toggleEq(eq.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${eqIds.includes(eq.id) ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {eqIds.includes(eq.id) ? '✓ ' : ''}{eq.name_en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {loading ? 'Saving...' : (task ? t('common.update') : t('common.create'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RequiredTaskDetail({ task, onClose }: { task: any; onClose: () => void }) {
  const { team } = useApp();
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (team) api.getRequiredTask(team.id, task.id).then(setDetail);
  }, [task, team]);

  return (
    <Modal isOpen title={task.short_description} onClose={onClose} size="lg">
      {!detail ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{detail.overview}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Frequency</div>
              <div className="font-medium">Every {detail.frequency_days} days</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Estimate</div>
              <div className="font-medium">{detail.estimate_hours} hours</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Completed</div>
              <div className="font-medium">{detail.completed_count || 0} times</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Open Instances</div>
              <div className="font-medium">{detail.open_instances || 0}</div>
            </div>
          </div>

          {detail.logs?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Activity Log</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {detail.logs.map((log: any) => (
                  <div key={log.id} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{log.user_name}</span>
                      <span className="text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-600 mt-0.5">{log.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
