import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';
import PriorityBadge from '../../components/PriorityBadge';
import StateBadge from '../../components/StateBadge';

export default function PlannedTasks() {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [mainTasks, setMainTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSubTask, setEditSubTask] = useState<any>(null);
  const [showCreateSubTask, setShowCreateSubTask] = useState(false);
  const [selectedMainTaskId, setSelectedMainTaskId] = useState<number | null>(null);
  const [editMainTask, setEditMainTask] = useState<any>(null);
  const [showCreateMainTask, setShowCreateMainTask] = useState(false);
  const [viewSubTask, setViewSubTask] = useState<any>(null);
  const [scheduledSubTask, setScheduledSubTask] = useState<any>(null);
  const [expandedMainTasks, setExpandedMainTasks] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const [mtData, userData, eqData] = await Promise.all([
        api.getMainTasks(team.id),
        api.getUsers(team.id),
        api.getEquipment(team.id),
      ]);
      setMainTasks(mtData);
      setUsers(userData.filter((u: any) => u.status === 'active'));
      setEquipment(eqData);
      setExpandedMainTasks(new Set(mtData.map((mt: any) => mt.id)));
    } finally {
      setLoading(false);
    }
  }, [team?.id]);

  useEffect(() => { load(); }, [load]);

  const archiveSubTask = async (subTask: any) => {
    if (!window.confirm(`Archive "${subTask.short_description}"? It will be hidden but history preserved.`)) return;
    try {
      await api.archiveRequiredTask(team!.id, subTask.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteMainTask = async (mt: any) => {
    if ((mt.sub_tasks || []).length > 0) {
      alert(`Cannot delete "${mt.short_description}" — it has ${mt.sub_tasks.length} sub-task(s). Archive or reassign them first.`);
      return;
    }
    if (!window.confirm(`Delete main task "${mt.short_description}"?`)) return;
    try {
      await api.deleteMainTask(team!.id, mt.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleMainTask = (id: number) => {
    setExpandedMainTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Collect all sub-tasks without a main task
  const allSubTasks = mainTasks.flatMap((mt: any) => mt.sub_tasks || []);
  const ungroupedSubTasks: any[] = []; // Sub-tasks without main_task_id come back from required-tasks endpoint
  // (main-tasks endpoint already groups them)

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20 flex items-center justify-between">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.plannedTasks')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateMainTask(true)}
            className="border border-gray-300 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            + Group
          </button>
          <button onClick={() => { setSelectedMainTaskId(null); setShowCreateSubTask(true); }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + {t('common.add')}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : (
          <>
            {mainTasks.map(mt => {
              const subTasks = mt.sub_tasks || [];
              const expanded = expandedMainTasks.has(mt.id);
              return (
                <div key={mt.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Main task header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <button onClick={() => toggleMainTask(mt.id)} className="flex-1 flex items-center gap-2 text-left">
                      <span className="text-sm font-bold text-gray-800">{mt.short_description}</span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{subTasks.length}</span>
                      <span className="text-gray-400 text-xs ml-auto">{expanded ? '▼' : '▶'}</span>
                    </button>
                    <button onClick={() => setEditMainTask(mt)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                      Edit
                    </button>
                    <button onClick={() => deleteMainTask(mt)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                      Delete
                    </button>
                    <button onClick={() => { setSelectedMainTaskId(mt.id); setShowCreateSubTask(true); }}
                      className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50">
                      + Task
                    </button>
                  </div>

                  {/* Sub tasks */}
                  {expanded && (
                    <div className="divide-y divide-gray-50">
                      {subTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No tasks in this group</div>
                      ) : (
                        subTasks.map((subTask: any) => (
                          <SubTaskRow key={subTask.id} task={subTask}
                            onView={() => setViewSubTask(subTask)}
                            onEdit={() => setEditSubTask(subTask)}
                            onArchive={() => archiveSubTask(subTask)}
                            onScheduled={() => setScheduledSubTask(subTask)} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {mainTasks.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📋</div>
                <div className="font-medium text-gray-700">No planned tasks yet</div>
                <div className="text-sm text-gray-500 mt-1">Create a group and add your first task</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {(showCreateSubTask || editSubTask) && (
        <SubTaskForm
          task={editSubTask}
          users={users}
          equipment={equipment}
          mainTasks={mainTasks}
          defaultMainTaskId={selectedMainTaskId}
          onClose={() => { setShowCreateSubTask(false); setEditSubTask(null); setSelectedMainTaskId(null); load(); }}
        />
      )}

      {(showCreateMainTask || editMainTask) && (
        <MainTaskForm
          mainTask={editMainTask}
          onClose={() => { setShowCreateMainTask(false); setEditMainTask(null); load(); }}
        />
      )}

      {viewSubTask && (
        <SubTaskDetail task={viewSubTask} onClose={() => setViewSubTask(null)} />
      )}

      {scheduledSubTask && (
        <ScheduledTasksModal task={scheduledSubTask} onClose={() => setScheduledSubTask(null)} />
      )}
    </div>
  );
}

function SubTaskRow({ task, onView, onEdit, onArchive, onScheduled }: any) {
  const hasSchedule = !!task.scheduled_date;
  const isRecurring = task.type === 'recurring';
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2 mb-1.5">
        <h3 className="font-medium text-gray-900 text-sm flex-1">{task.short_description}</h3>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2.5">
        {isRecurring ? (
          task.frequency_days && <span>🔄 Every {task.frequency_days} days</span>
        ) : (
          <span>📌 One-off</span>
        )}
        {task.estimate_hours && <span>⏱ {task.estimate_hours}h est.</span>}
        {task.completion_count > 0 && <span>✅ {task.completion_count} done</span>}
        {isRecurring && task.completion_count > 0 ? (
          <>
            {task.last_completed_scheduled_date && <span>↩ {new Date(task.last_completed_scheduled_date + 'T00:00:00').toLocaleDateString()}</span>}
            {task.next_scheduled_date && <span>→ {new Date(task.next_scheduled_date + 'T00:00:00').toLocaleDateString()}</span>}
          </>
        ) : task.scheduled_date ? (
          <span>📅 {new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString()}</span>
        ) : null}
        {task.responsible_user_name && <span>👤 {task.responsible_user_name}</span>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onView} className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
          Details
        </button>
        <button onClick={onEdit} className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
          Edit
        </button>
        <button
          onClick={hasSchedule ? onScheduled : undefined}
          disabled={!hasSchedule}
          title={hasSchedule ? 'View scheduled instances' : 'No scheduled date set'}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors ${
            hasSchedule
              ? 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}>
          📅 Scheduled
        </button>
        <button onClick={onArchive} className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium">
          Archive
        </button>
      </div>
    </div>
  );
}

function MainTaskForm({ mainTask, onClose }: any) {
  const { team } = useApp();
  const [name, setName] = useState(mainTask?.short_description || '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (mainTask) {
        await api.updateMainTask(team!.id, mainTask.id, { short_description: name });
      } else {
        await api.createMainTask(team!.id, { short_description: name });
      }
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={mainTask ? 'Edit Group' : 'New Group'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
            placeholder="e.g. Water & Sanitation"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={loading || !name.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700">
            {loading ? 'Saving...' : (mainTask ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function SubTaskForm({ task, users, equipment, mainTasks, defaultMainTaskId, onClose }: any) {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [taskType, setTaskType] = useState<'one_off' | 'recurring'>(task ? task.type : 'one_off');
  const [form, setForm] = useState({
    short_description: task?.short_description || '',
    task_overview: task?.task_overview || '',
    top_tips: task?.top_tips || '',
    priority: task?.priority || 'medium',
    scheduled_date: task?.scheduled_date || '',
    frequency_days: task?.frequency_days?.toString() || '30',
    default_responsible_user_id: task?.default_responsible_user_id?.toString() || '',
    estimate_hours: task?.estimate_hours?.toString() || '1',
    planned_instances: task?.planned_instances?.toString() || '2',
    participants: task?.participants || 'crew',
    main_task_id: task?.main_task_id?.toString() || (defaultMainTaskId?.toString() || ''),
  });
  const [crewDefaultIds, setCrewDefaultIds] = useState<number[]>(
    task?.crew_defaults?.map((c: any) => c.id) || []
  );
  const [steps, setSteps] = useState<string[]>(task?.steps?.map((s: any) => s.step_text) || []);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleCrew = (id: number) => setCrewDefaultIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const addStep = () => setSteps(prev => [...prev, '']);
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i));
  const setStep = (i: number, v: string) => setSteps(prev => prev.map((s, idx) => idx === i ? v : s));

  const submit = async () => {
    if (!form.short_description.trim()) { alert('Short description is required'); return; }
    if (!form.task_overview.trim()) { alert('Task overview is required'); return; }
    setLoading(true);
    try {
      const payload: any = {
        short_description: form.short_description,
        task_overview: form.task_overview,
        top_tips: form.top_tips,
        priority: form.priority,
        type: taskType,
        scheduled_date: form.scheduled_date || null,
        frequency_days: taskType === 'recurring' ? Number(form.frequency_days) : null,
        default_responsible_user_id: form.default_responsible_user_id ? Number(form.default_responsible_user_id) : null,
        estimate_hours: Number(form.estimate_hours),
        planned_instances: taskType === 'recurring' ? Number(form.planned_instances) : null,
        participants: form.participants,
        main_task_id: form.main_task_id ? Number(form.main_task_id) : null,
        crew_default_ids: crewDefaultIds,
        steps: steps.filter(s => s.trim()),
      };
      if (task) {
        payload.updated_by = user!.id;
        await api.updateRequiredTask(team!.id, task.id, payload);
      } else {
        payload.created_by_user_id = user!.id;
        await api.createRequiredTask(team!.id, payload);
      }
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={task ? 'Edit Task' : 'New Task'} onClose={onClose} size="xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.shortDescription')} *</label>
          <input type="text" value={form.short_description} onChange={e => set('short_description', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief task name" />
        </div>

        {/* Task type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => !task?.scheduled_date && setTaskType('one_off')}
              disabled={!!task?.scheduled_date}
              className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${taskType === 'one_off' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'} ${task?.scheduled_date ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              One-Off
            </button>
            <button type="button"
              onClick={() => !task?.scheduled_date && setTaskType('recurring')}
              disabled={!!task?.scheduled_date}
              className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${taskType === 'recurring' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'} ${task?.scheduled_date ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              Recurring
            </button>
          </div>
          {task?.scheduled_date && <p className="text-xs text-orange-600 mt-1">Type cannot be changed once a scheduled date is set.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overview / Instructions *</label>
          <textarea value={form.task_overview} onChange={e => set('task_overview', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe what needs to be done..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Top Tips</label>
          <textarea value={form.top_tips} onChange={e => set('top_tips', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Helpful tips for the crew..." />
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Task Steps (optional checklist)</label>
            <button type="button" onClick={addStep}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
              + Add Step
            </button>
          </div>
          {steps.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No steps defined.</p>
          ) : (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                  <input type="text" value={step} onChange={e => setStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <button type="button" onClick={() => removeStep(i)}
                    className="text-red-400 hover:text-red-600 text-sm px-1 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <select value={form.main_task_id} onChange={e => set('main_task_id', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">-- No Group --</option>
              {mainTasks.map((mt: any) => <option key={mt.id} value={mt.id}>{mt.short_description}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.priority')}</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Scheduled Date <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${taskType === 'recurring' ? 'text-gray-700' : 'text-gray-400'}`}>Frequency</label>
            <select value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)}
              disabled={taskType !== 'recurring'}
              className={`w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm ${taskType !== 'recurring' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}>
              <option value="7">Weekly (7 days)</option>
              <option value="14">Fortnightly (14)</option>
              <option value="30">Monthly (30)</option>
              <option value="60">Every 2 months</option>
              <option value="90">Quarterly (90)</option>
              <option value="180">Semi-annual (180)</option>
              <option value="365">Annual (365)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimate (hours)</label>
            <input type="number" min="0" max="200" step="0.5" value={form.estimate_hours}
              onChange={e => set('estimate_hours', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${taskType === 'recurring' ? 'text-gray-700' : 'text-gray-400'}`}>Planned Instances</label>
            <input type="number" min="1" max="10" value={form.planned_instances}
              onChange={e => set('planned_instances', e.target.value)}
              disabled={taskType !== 'recurring'}
              className={`w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm ${taskType !== 'recurring' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Responsible</label>
            <select value={form.default_responsible_user_id} onChange={e => set('default_responsible_user_id', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
              <option value="">-- None --</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
            <select value={form.participants} onChange={e => set('participants', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
              <option value="crew">Crew (specific people)</option>
              <option value="none">None (responsible only)</option>
              <option value="open_optional">Open – Optional</option>
              <option value="all_expected">All – Expected</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Crew</label>
          <div className="flex flex-wrap gap-2">
            {users.map((u: any) => (
              <button key={u.id} type="button" onClick={() => toggleCrew(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  crewDefaultIds.includes(u.id)
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {crewDefaultIds.includes(u.id) ? '✓ ' : ''}{u.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={submit} disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {loading ? 'Saving...' : (task ? t('common.update') : t('common.create'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ScheduledTasksModal({ task, onClose }: { task: any; onClose: () => void }) {
  const { team } = useApp();
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) return;
    setLoading(true);
    Promise.all([
      api.getScheduledTasks(team.id, { required_task_id: String(task.id) }),
      api.getScheduledTaskHistory(team.id, { required_task_id: String(task.id) }),
    ]).then(([active, history]) => {
      setActiveTasks(active);
      setHistoryTasks(history);
    }).finally(() => setLoading(false));
  }, [team?.id, task.id]);

  const isOneOff = task.type === 'one_off';
  const allTasks = [...activeTasks, ...(showHistory ? historyTasks : [])].sort((a, b) =>
    (a.scheduled_date || '').localeCompare(b.scheduled_date || '')
  );
  const singleTask = allTasks[0] ?? activeTasks[0] ?? historyTasks[0];

  return (
    <Modal isOpen title={`${task.short_description} — Scheduled`} onClose={onClose} size="lg">
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : isOneOff ? (
        <div className="space-y-4">
          {!singleTask ? (
            <div className="text-center py-8 text-gray-400 text-sm">No scheduled instance found.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <StateBadge state={singleTask.state} size="md" />
                <PriorityBadge priority={singleTask.priority} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-0.5">Scheduled Date</div>
                  <div className="font-medium">
                    {singleTask.scheduled_date
                      ? new Date(singleTask.scheduled_date + 'T00:00:00').toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-0.5">Responsible</div>
                  <div className="font-medium">{singleTask.responsible_user_name || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-0.5">Crew</div>
                  <div className="font-medium">{singleTask.crew?.length || 0} members</div>
                </div>
                {singleTask.estimate_hours && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-0.5">Estimate</div>
                    <div className="font-medium">{singleTask.estimate_hours}h</div>
                  </div>
                )}
              </div>
              {historyTasks.length > 0 && (
                <button onClick={() => setShowHistory(h => !h)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline">
                  {showHistory ? 'Hide history' : `Show history (${historyTasks.length} past instance${historyTasks.length !== 1 ? 's' : ''})`}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {activeTasks.length} active · {historyTasks.length} historical
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600" />
              <span className="text-xs text-gray-600">Show history</span>
            </label>
          </div>

          {allTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No scheduled instances found.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allTasks.map(st => {
                const isPast = st.scheduled_date && st.scheduled_date < new Date().toISOString().slice(0, 10);
                return (
                  <div key={st.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      st.state === 'completed' ? 'bg-green-50 border-green-100' :
                      st.state === 'pending' && isPast ? 'bg-red-50 border-red-100' :
                      st.state === 'pending' ? 'bg-white border-gray-200' :
                      st.state === 'planned' ? 'bg-purple-50 border-purple-100' :
                      'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-gray-900">
                          {st.scheduled_date
                            ? new Date(st.scheduled_date + 'T00:00:00').toLocaleDateString()
                            : '—'}
                        </span>
                        {st.state === 'pending' && isPast && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        {st.responsible_user_name && <span>👤 {st.responsible_user_name}</span>}
                        {(st.crew?.length > 0) && <span>👥 {st.crew.length} crew</span>}
                        {st.actual_hours && <span>⏱ {st.actual_hours}h actual</span>}
                      </div>
                    </div>
                    <StateBadge state={st.state} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function SubTaskDetail({ task, onClose }: { task: any; onClose: () => void }) {
  const { team } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [tab, setTab] = useState<'details' | 'logs' | 'ai'>('details');

  useEffect(() => {
    if (team) {
      api.getRequiredTaskLogs(team.id, task.id).then(setLogs).catch(() => {});
    }
  }, [team?.id, task.id]);

  const loadSummary = async () => {
    if (!team) return;
    setLoadingSummary(true);
    try {
      const result = await api.getTaskSummary(team.id, task.id);
      setSummary(result.summary || result.message || 'No summary available.');
    } catch (e: any) {
      setSummary('Failed to load AI summary: ' + e.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <Modal isOpen title={task.short_description} onClose={onClose} size="lg">
      <div className="flex border-b mb-4 -mx-1">
        {[
          { id: 'details', label: 'Details' },
          { id: 'logs', label: `Logs (${logs.length})` },
          { id: 'ai', label: '🤖 AI Insights' },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === tb.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-4">
          {task.task_overview && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Overview</div>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{task.task_overview}</p>
            </div>
          )}
          {task.top_tips && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Top Tips</div>
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 rounded-xl p-3">{task.top_tips}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Type</div>
              <div className="font-medium capitalize">{(task.type || 'one_off').replace('_', ' ')}</div>
            </div>
            {task.type === 'recurring' && task.frequency_days && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-0.5">Frequency</div>
                <div className="font-medium">Every {task.frequency_days} days</div>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Estimate</div>
              <div className="font-medium">{task.estimate_hours || '—'} hours</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Completed</div>
              <div className="font-medium">{task.completion_count || 0} times</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Last Done</div>
              <div className="font-medium">
                {task.last_completed_scheduled_date
                  ? new Date(task.last_completed_scheduled_date + 'T00:00:00').toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Next Time</div>
              <div className="font-medium">
                {task.next_scheduled_date
                  ? new Date(task.next_scheduled_date + 'T00:00:00').toLocaleDateString()
                  : '—'}
              </div>
            </div>
          </div>
          {(task.crew_defaults || []).length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Default Crew</div>
              <div className="flex flex-wrap gap-1.5">
                {task.crew_defaults.map((c: any) => (
                  <span key={c.id} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No activity logged yet</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-gray-900">{log.user_name || 'System'}</span>
                  <span className="text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-gray-600">{log.change_description}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'ai' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Get AI-powered insights based on past completion history for this task.</p>
          {!summary ? (
            <button onClick={loadSummary} disabled={loadingSummary}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-purple-700 transition-colors">
              {loadingSummary ? '🤖 Generating insights...' : '🤖 Generate AI Insights'}
            </button>
          ) : (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
