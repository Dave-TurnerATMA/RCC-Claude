import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';
import PriorityBadge from './PriorityBadge';
import StateBadge from './StateBadge';
import CompleteTaskModal from './CompleteTaskModal';

interface Props {
  task: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function TaskManageModal({ task: initialTask, onClose, onRefresh }: Props) {
  const { t } = useTranslation();
  const { team, user, isAdmin } = useApp();
  const [task, setTask] = useState(initialTask);
  const [users, setUsers] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'info' | 'crew' | 'notes' | 'equipment'>('info');
  const [showComplete, setShowComplete] = useState(false);

  const isInCrew = task.crew?.some((c: any) => c.id === user?.id);
  const isResponsible = task.responsible_user_id === user?.id;
  const isOverdue = task.scheduled_date && new Date(task.scheduled_date) < new Date() && task.state === 'pending';

  useEffect(() => {
    if (team) {
      api.getUsers(team.id).then(setUsers);
      refreshTask();
    }
  }, []);

  const refreshTask = async () => {
    if (team) {
      const updated = await api.getScheduledTask(team.id, initialTask.id);
      setTask(updated);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.addNote(team!.id, task.id, { user_id: user!.id, note });
    setNote('');
    refreshTask();
  };

  const joinTeam = async () => {
    await api.addCrew(team!.id, task.id, user!.id);
    refreshTask();
    onRefresh?.();
  };

  const leaveTeam = async () => {
    await api.removeCrew(team!.id, task.id, user!.id);
    refreshTask();
    onRefresh?.();
  };

  const takeResponsibility = async () => {
    await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: user!.id });
    refreshTask();
    onRefresh?.();
  };

  const requestTakeover = async () => {
    await api.requestTakeover(team!.id, task.id, { user_id: user!.id });
    alert('Takeover request sent to team leads and administrators.');
  };

  const assignTo = async (userId: number) => {
    await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: userId });
    refreshTask();
    onRefresh?.();
  };

  const TABS = [
    { id: 'info', label: t('task.details') },
    { id: 'crew', label: `${t('task.crew')} (${task.crew?.length || 0})` },
    { id: 'notes', label: `${t('task.notes')} (${task.notes?.length || 0})` },
    { id: 'equipment', label: `${t('task.equipment')} (${task.equipment?.length || 0})` },
  ];

  return (
    <>
      <Modal isOpen title={task.short_description} onClose={onClose} size="lg">
        {/* Status row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <StateBadge state={task.state} size="md" />
          <PriorityBadge priority={task.priority} size="md" />
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-medium">
            {t(`type.${task.type}`)}
          </span>
          {isOverdue && <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>}
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4 overflow-x-auto gap-1">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id as any)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === tb.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">{task.overview}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">{t('task.scheduledDate')}</div>
                <div className="text-sm font-medium">{task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString() : '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">{t('task.responsible')}</div>
                <div className="text-sm font-medium">{task.responsible_user_name || t('task.noResponsible')}</div>
              </div>
              {task.estimate_hours && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-0.5">{t('task.estimateHours')}</div>
                  <div className="text-sm font-medium">{task.estimate_hours}h</div>
                </div>
              )}
              {task.actual_hours && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-0.5">{t('task.actualHours')}</div>
                  <div className="text-sm font-medium">{task.actual_hours}h</div>
                </div>
              )}
            </div>
            {task.planning_notes && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">{task.planning_notes}</div>
            )}
            {task.work_description && (
              <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-700">{task.work_description}</div>
            )}
            {task.problems && (
              <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700">{task.problems}</div>
            )}

            {/* Actions */}
            {task.state === 'pending' && (
              <div className="border-t pt-4 space-y-2">
                {!task.responsible_user_name && (
                  <button onClick={takeResponsibility} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                    {t('task.takeResponsibility')}
                  </button>
                )}
                {task.responsible_user_name && !isResponsible && (
                  <button onClick={requestTakeover} className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600">
                    {t('task.requestTakeover')}
                  </button>
                )}
                {!isInCrew && (
                  <button onClick={joinTeam} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
                    {t('task.addToTeam')}
                  </button>
                )}
                {isInCrew && !isResponsible && (
                  <button onClick={leaveTeam} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                    {t('task.removeFromTeam')}
                  </button>
                )}
                {isAdmin && (
                  <select onChange={e => assignTo(Number(e.target.value))} defaultValue=""
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
                    <option value="">{t('common.assign')} to...</option>
                    {users.filter(u => u.status === 'active').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => setShowComplete(true)} className="w-full py-2.5 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800">
                  {t('common.complete')} Task
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'crew' && (
          <div className="space-y-3">
            {task.crew?.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-sm">{member.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{member.role?.replace('_', ' ')}</div>
                </div>
                {isAdmin && task.state !== 'completed' && (
                  <button onClick={() => api.removeCrew(team!.id, task.id, member.id).then(refreshTask)}
                    className="text-xs text-red-500 hover:text-red-700">{t('common.remove')}</button>
                )}
              </div>
            ))}
            {task.crew?.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No crew members yet</div>}
            {isAdmin && task.state !== 'completed' && (
              <select onChange={e => { if (e.target.value) { api.addCrew(team!.id, task.id, Number(e.target.value)).then(refreshTask); (e.target as HTMLSelectElement).value = ''; }}} defaultValue=""
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Add crew member...</option>
                {users.filter(u => u.status === 'active' && !task.crew?.find((c: any) => c.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            {task.notes?.map((n: any) => (
              <div key={n.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-900">{n.user_name}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700">{n.note}</p>
              </div>
            ))}
            {task.notes?.length === 0 && <div className="text-center py-4 text-gray-400 text-sm">{t('task.noNotes')}</div>}
            <div className="border-t pt-3">
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t('task.addNote')}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none h-16 focus:ring-2 focus:ring-blue-500" />
              <button onClick={addNote} disabled={!note.trim()}
                className="w-full mt-2 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-700">
                {t('task.addNote')}
              </button>
            </div>
          </div>
        )}

        {tab === 'equipment' && (
          <div className="space-y-2">
            {task.equipment?.map((eq: any) => (
              <div key={eq.id} className="p-3 bg-gray-50 rounded-xl text-sm text-gray-900">{eq.name_en}</div>
            ))}
            {task.equipment?.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">{t('task.noEquipment')}</div>}
          </div>
        )}
      </Modal>

      {showComplete && (
        <CompleteTaskModal task={task} onClose={() => setShowComplete(false)} onCompleted={() => { setShowComplete(false); onRefresh?.(); onClose(); }} />
      )}
    </>
  );
}
