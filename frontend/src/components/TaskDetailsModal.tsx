import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';

interface Props {
  task: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function TaskDetailsModal({ task, onClose, onRefresh }: Props) {
  const { t } = useTranslation();
  const { team, user, isAdmin } = useApp();
  const [fullTask, setFullTask] = useState<any>(task);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'team' | 'notes' | 'history' | 'ai'>('overview');
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (team && task.id) {
      api.getScheduledTask(team.id, task.id).then(setFullTask).catch(() => {});
      if (task.required_task_id) {
        api.getScheduledTaskHistory(team.id, { required_task_id: String(task.required_task_id) }).catch(() => {});
        // Fetch history via scheduled tasks history filtering by required_task_id
        api.getScheduledTasks(team.id, { state: 'completed' })
          .then(tasks => setHistory(tasks.filter((t: any) => t.required_task_id === task.required_task_id)))
          .catch(() => {});
      }
    }
  }, [team?.id, task.id]);

  const loadSummary = async () => {
    if (!task.required_task_id || !team || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const result = await api.getTaskSummary(team.id, task.required_task_id);
      setSummary(result.summary);
      setTab('ai');
    } catch {
      setSummary('Unable to generate summary at this time.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !team) return;
    setAddingNote(true);
    try {
      await api.addNote(team.id, task.id, { user_id: user?.id, note: noteText });
      setNoteText('');
      const updated = await api.getScheduledTask(team.id, task.id);
      setFullTask(updated);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAddingNote(false);
    }
  };

  const joinCrew = async () => {
    if (!team || !user) return;
    try {
      await api.addCrew(team.id, task.id, user.id);
      const updated = await api.getScheduledTask(team.id, task.id);
      setFullTask(updated);
      onRefresh?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const leaveCrew = async () => {
    if (!team || !user) return;
    try {
      await api.removeCrew(team.id, task.id, user.id);
      const updated = await api.getScheduledTask(team.id, task.id);
      setFullTask(updated);
      onRefresh?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const TABS = [
    { id: 'overview', label: t('task.details') },
    { id: 'team', label: t('task.team') },
    { id: 'notes', label: `${t('task.notes')} (${fullTask.notes?.length || 0})` },
    ...(task.required_task_id ? [
      { id: 'history', label: `${t('task.history')} (${history.length})` },
      { id: 'ai', label: t('task.aiInsights') },
    ] : []),
  ];

  const isInCrew = fullTask.crew?.some((c: any) => c.id === user?.id);
  const avgEffort = history.filter(h => h.actual_hours).length > 0
    ? (history.reduce((s, h) => s + (h.actual_hours || 0), 0) / history.filter(h => h.actual_hours).length).toFixed(1)
    : null;

  return (
    <Modal isOpen title={fullTask.short_description} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {fullTask.estimate_hours && (
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-sm font-bold text-blue-700">{fullTask.estimate_hours}h</div>
              <div className="text-xs text-blue-500">{t('task.estimateHours')}</div>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-sm font-bold text-gray-700">{fullTask.crew?.length || 0}</div>
            <div className="text-xs text-gray-500">{t('task.crew')}</div>
          </div>
          {avgEffort && (
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-sm font-bold text-green-700">{avgEffort}h</div>
              <div className="text-xs text-green-500">{t('task.avgEffort')}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto gap-1">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => { setTab(tb.id as any); if (tb.id === 'ai' && !summary) loadSummary(); }}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === tb.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">{fullTask.overview}</p>
            {fullTask.steps?.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-blue-800 uppercase mb-3">📋 Task Steps</div>
                <div className="space-y-2">
                  {fullTask.steps.map((step: any) => (
                    <label key={step.id} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked={step.checked}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          step.checked = checked;
                          try { await api.updateStepCheck(team!.id, fullTask.id, step.id, checked); } catch {}
                        }}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 border-gray-300 flex-shrink-0" />
                      <span className={`text-sm ${step.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{step.step_text}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-blue-500 mt-2">Not all steps need to be ticked to complete the task.</p>
              </div>
            )}
            {fullTask.required_task_overview && (
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-blue-700 uppercase mb-2">{t('task.taskOverview')}</div>
                <p className="text-sm text-blue-900 leading-relaxed">{fullTask.required_task_overview}</p>
              </div>
            )}
            {fullTask.required_task_top_tips && (
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-yellow-700 uppercase mb-2">{t('task.topTips')}</div>
                <p className="text-sm text-yellow-900 leading-relaxed">{fullTask.required_task_top_tips}</p>
              </div>
            )}
            {fullTask.scheduled_date && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{t('task.scheduledDate')}:</span> {new Date(fullTask.scheduled_date + 'T00:00:00').toLocaleDateString()}
              </div>
            )}
            {fullTask.planning_notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">{t('task.planningNotes')}</div>
                <p className="text-sm text-gray-700">{fullTask.planning_notes}</p>
              </div>
            )}
            {fullTask.equipment?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">{t('task.equipment')}</div>
                <div className="flex flex-wrap gap-1">
                  {fullTask.equipment.map((eq: any) => (
                    <span key={eq.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{eq.name_en}</span>
                  ))}
                </div>
              </div>
            )}
            {fullTask.type === 'follow_up' && fullTask.parent_task_id && (
              <div className="text-xs text-purple-600 bg-purple-50 rounded-lg p-2">
                Follow-up task (parent ID: {fullTask.parent_task_id})
              </div>
            )}
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-3">
            <div className="space-y-2">
              {fullTask.crew?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium">{member.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{member.role}</span>
                  </div>
                  {isAdmin && member.id !== user?.id && (
                    <button onClick={() => api.removeCrew(team!.id, task.id, member.id).then(() => api.getScheduledTask(team!.id, task.id).then(setFullTask))}
                      className="text-xs text-red-500 hover:text-red-700">{t('common.remove')}</button>
                  )}
                </div>
              ))}
              {fullTask.crew?.length === 0 && <p className="text-sm text-gray-400">No crew members assigned.</p>}
            </div>
            <div className="flex gap-2">
              {!isInCrew && (
                <button onClick={joinCrew} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  {t('task.addToTeam')}
                </button>
              )}
              {isInCrew && (
                <button onClick={leaveCrew} className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                  {t('task.removeFromTeam')}
                </button>
              )}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {fullTask.notes?.length === 0 && <p className="text-sm text-gray-400">{t('task.noNotes')}</p>}
              {fullTask.notes?.map((note: any) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{note.user_name}</span>
                    <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{note.note}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder={t('task.addNote')}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addNote} disabled={!noteText.trim() || addingNote}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {t('common.add')}
              </button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">{t('task.noHistory')}</p>
            ) : history.slice(0, 10).map((h: any) => (
              <div key={h.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{h.completed_at ? new Date(h.completed_at).toLocaleDateString() : '—'}</span>
                  <div className="flex gap-2 text-xs text-gray-500">
                    {h.actual_hours && <span>{h.actual_hours}h</span>}
                    <span>{h.crew?.length || 0} crew</span>
                  </div>
                </div>
                {h.work_description && <p className="text-sm text-gray-600">{h.work_description}</p>}
                {h.problems && (
                  <div className="mt-2 bg-orange-50 rounded p-2 text-xs text-orange-700">{h.problems}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            {summaryLoading ? (
              <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
            ) : summary ? (
              <div>
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summary}</div>
                <button onClick={loadSummary} className="mt-2 text-xs text-blue-600 hover:text-blue-800">{t('common.update')}</button>
              </div>
            ) : (
              <div className="text-center py-8">
                <button onClick={loadSummary} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                  {t('task.aiInsights')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
