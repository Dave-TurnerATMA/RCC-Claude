import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';
import PriorityBadge from '../../components/PriorityBadge';

export default function RequiredTasks() {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [viewTask, setViewTask] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const [catData, taskData, userData, eqData] = await Promise.all([
        api.getCategories(team.id),
        api.getRequiredTasks(team.id),
        api.getUsers(team.id),
        api.getEquipment(team.id),
      ]);
      setCategories(catData);
      setTasks(taskData);
      setUsers(userData.filter((u: any) => u.status === 'active'));
      setEquipment(eqData);
      // Expand all categories by default
      setExpandedCategories(new Set(catData.map((c: any) => c.id)));
    } finally {
      setLoading(false);
    }
  }, [team?.id]);

  useEffect(() => { load(); }, [load]);

  const archive = async (task: any) => {
    if (!window.confirm(`Archive "${task.short_description}"? It will be hidden but history preserved.`)) return;
    try {
      await api.archiveRequiredTask(team!.id, task.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteCategory = async (cat: any) => {
    const tasksInCat = tasks.filter(t => t.category_id === cat.id);
    if (tasksInCat.length > 0) {
      alert(`Cannot delete category "${cat.name}" — it has ${tasksInCat.length} task(s). Archive or reassign them first.`);
      return;
    }
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await api.deleteCategory(team!.id, cat.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleCategory = (id: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uncategorizedTasks = tasks.filter(t => !t.category_id);

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20 flex items-center justify-between">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.requiredTasks')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateCategory(true)}
            className="border border-gray-300 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            + Category
          </button>
          <button onClick={() => { setSelectedCategoryId(null); setShowCreateTask(true); }}
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
            {categories.map(cat => {
              const catTasks = tasks.filter(t => t.category_id === cat.id);
              const expanded = expandedCategories.has(cat.id);
              return (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <button onClick={() => toggleCategory(cat.id)} className="flex-1 flex items-center gap-2 text-left">
                      <span className="text-sm font-bold text-gray-800">{cat.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{catTasks.length}</span>
                      <span className="text-gray-400 text-xs ml-auto">{expanded ? '▼' : '▶'}</span>
                    </button>
                    <button onClick={() => setEditCategory(cat)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                      Edit
                    </button>
                    <button onClick={() => deleteCategory(cat)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                      Delete
                    </button>
                    <button onClick={() => { setSelectedCategoryId(cat.id); setShowCreateTask(true); }}
                      className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50">
                      + Task
                    </button>
                  </div>

                  {/* Category tasks */}
                  {expanded && (
                    <div className="divide-y divide-gray-50">
                      {catTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No tasks in this category</div>
                      ) : (
                        catTasks.map(task => (
                          <TaskRow key={task.id} task={task}
                            onView={() => setViewTask(task)}
                            onEdit={() => setEditTask(task)}
                            onArchive={() => archive(task)} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized tasks */}
            {uncategorizedTasks.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-600">Uncategorized</span>
                  <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full ml-2">{uncategorizedTasks.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {uncategorizedTasks.map(task => (
                    <TaskRow key={task.id} task={task}
                      onView={() => setViewTask(task)}
                      onEdit={() => setEditTask(task)}
                      onArchive={() => archive(task)} />
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && categories.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📋</div>
                <div className="font-medium text-gray-700">No required tasks yet</div>
                <div className="text-sm text-gray-500 mt-1">Create a category and add your first recurring task</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {(showCreateTask || editTask) && (
        <RequiredTaskForm
          task={editTask}
          users={users}
          equipment={equipment}
          categories={categories}
          defaultCategoryId={selectedCategoryId}
          onClose={() => { setShowCreateTask(false); setEditTask(null); setSelectedCategoryId(null); load(); }}
        />
      )}

      {(showCreateCategory || editCategory) && (
        <CategoryForm
          category={editCategory}
          onClose={() => { setShowCreateCategory(false); setEditCategory(null); load(); }}
        />
      )}

      {viewTask && (
        <RequiredTaskDetail task={viewTask} onClose={() => setViewTask(null)} />
      )}
    </div>
  );
}

function TaskRow({ task, onView, onEdit, onArchive }: any) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2 mb-1.5">
        <h3 className="font-medium text-gray-900 text-sm flex-1">{task.short_description}</h3>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2.5">
        {task.frequency_days && <span>🔄 Every {task.frequency_days} days</span>}
        {task.estimate_hours && <span>⏱ {task.estimate_hours}h est.</span>}
        {task.completion_count > 0 && <span>✅ {task.completion_count} done</span>}
        {task.last_completed_at && (
          <span>Last: {new Date(task.last_completed_at).toLocaleDateString()}</span>
        )}
        {task.responsible_user_name && <span>👤 {task.responsible_user_name}</span>}
      </div>
      <div className="flex gap-2">
        <button onClick={onView} className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
          Details
        </button>
        <button onClick={onEdit} className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
          Edit
        </button>
        <button onClick={onArchive} className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium">
          Archive
        </button>
      </div>
    </div>
  );
}

function CategoryForm({ category, onClose }: any) {
  const { team } = useApp();
  const [name, setName] = useState(category?.name || '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (category) {
        await api.updateCategory(team!.id, category.id, { name });
      } else {
        await api.createCategory(team!.id, { name });
      }
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={category ? 'Edit Category' : 'New Category'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
            placeholder="e.g. Flood Preparedness"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={loading || !name.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700">
            {loading ? 'Saving...' : (category ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RequiredTaskForm({ task, users, equipment, categories, defaultCategoryId, onClose }: any) {
  const { t } = useTranslation();
  const { team, user } = useApp();
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
    crew_type: task?.crew_type || 'specific',
    category_id: task?.category_id?.toString() || (defaultCategoryId?.toString() || ''),
  });
  const [crewIds, setCrewIds] = useState<number[]>(task?.crew?.map((c: any) => c.id) || []);
  const [eqIds, setEqIds] = useState<number[]>(task?.equipment?.map((e: any) => e.id) || []);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleCrew = (id: number) => setCrewIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleEq = (id: number) => setEqIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    if (!form.short_description.trim()) {
      alert('Short description is required');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        short_description: form.short_description,
        overview: form.task_overview,
        task_overview: form.task_overview,
        top_tips: form.top_tips,
        priority: form.priority,
        scheduled_date: form.scheduled_date || null,
        frequency_days: Number(form.frequency_days),
        default_responsible_user_id: form.default_responsible_user_id ? Number(form.default_responsible_user_id) : null,
        estimate_hours: Number(form.estimate_hours),
        planned_instances: Number(form.planned_instances),
        crew_type: form.crew_type,
        category_id: form.category_id ? Number(form.category_id) : null,
        crew_ids: crewIds,
        equipment_ids: eqIds,
      };
      if (task) {
        payload.updated_by_user_id = user!.id;
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
    <Modal isOpen title={task ? 'Edit Required Task' : 'New Required Task'} onClose={onClose} size="xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.shortDescription')} *</label>
          <input type="text" value={form.short_description} onChange={e => set('short_description', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief task name" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overview / Instructions</label>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">-- No Category --</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">First Scheduled Date</label>
            <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planned Instances</label>
            <input type="number" min="1" max="10" value={form.planned_instances}
              onChange={e => set('planned_instances', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Responsible</label>
            <select value={form.default_responsible_user_id} onChange={e => set('default_responsible_user_id', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">-- None --</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crew Type</label>
            <select value={form.crew_type} onChange={e => set('crew_type', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="specific">Specific crew</option>
              <option value="open_optional">Open (optional)</option>
              <option value="all_expected">All expected</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Crew</label>
          <div className="flex flex-wrap gap-2">
            {users.map((u: any) => (
              <button key={u.id} type="button" onClick={() => toggleCrew(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  crewIds.includes(u.id)
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {crewIds.includes(u.id) ? '✓ ' : ''}{u.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Equipment</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {equipment.map((eq: any) => (
              <button key={eq.id} type="button" onClick={() => toggleEq(eq.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  eqIds.includes(eq.id)
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {eqIds.includes(eq.id) ? '✓ ' : ''}{eq.name_en}
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

function RequiredTaskDetail({ task, onClose }: { task: any; onClose: () => void }) {
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
              <div className="text-xs text-gray-500 mb-0.5">Frequency</div>
              <div className="font-medium">Every {task.frequency_days} days</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Estimate</div>
              <div className="font-medium">{task.estimate_hours} hours</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Completed</div>
              <div className="font-medium">{task.completion_count || 0} times</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-0.5">Last Done</div>
              <div className="font-medium">
                {task.last_completed_at
                  ? new Date(task.last_completed_at).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
          </div>
          {task.crew?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Default Crew</div>
              <div className="flex flex-wrap gap-1.5">
                {task.crew.map((c: any) => (
                  <span key={c.id} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {task.equipment?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Default Equipment</div>
              <div className="flex flex-wrap gap-1.5">
                {task.equipment.map((e: any) => (
                  <span key={e.id} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                    🔧 {e.name_en}
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
