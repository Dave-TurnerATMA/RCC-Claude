import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';
import PriorityBadge from './PriorityBadge';
import StateBadge from './StateBadge';

interface Props {
  task: any;
  onClose: () => void;
}

export default function TaskManageModal({ task: initialTask, onClose }: Props) {
  const { t } = useTranslation();
  const { team, user, isAdmin, isTeamLead } = useApp();
  const [task, setTask] = useState(initialTask);
  const [users, setUsers] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'info' | 'crew' | 'notes' | 'equipment'>('info');
  const [loading, setLoading] = useState(false);

  const canEdit = (task.state === 'pending' || task.state === 'planned') && (isAdmin || task.responsible_user_id === user?.id);
  const isInCrew = task.crew?.some((c: any) => c.id === user?.id);
  const isResponsible = task.responsible_user_id === user?.id;

  useEffect(() => {
    if (team) api.getUsers(team.id).then(setUsers);
    refreshTask();
  }, []);

  const refreshTask = async () => {
    if (team) {
      const updated = await api.getScheduledTask(team.id, task.id);
      setTask(updated);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.addNote(team!.id, task.id, user!.id, note);
    setNote('');
    refreshTask();
  };

  const joinTeam = async () => {
    await api.addCrew(team!.id, task.id, user!.id);
    refreshTask();
  };

  const leaveTeam = async () => {
    await api.removeCrew(team!.id, task.id, user!.id);
    refreshTask();
  };

  const addUserToCrew = async (uid: number) => {
    await api.addCrew(team!.id, task.id, uid);
    refreshTask();
  };

  const removeUserFromCrew = async (uid: number) => {
    await api.removeCrew(team!.id, task.id, uid);
    refreshTask();
  };

  const takeResponsibility = async () => {
    await api.updateScheduledTask(team!.id, task.id, { responsible_user_id: user!.id });
    refreshTask();
  };

  const requestTakeover = async () => {
    await api.requestTakeover(team!.id, task.id, user!.id);
    alert('Takeover request sent to administrators.');
  };

  const isOverdue = task.scheduled_date && new Date(task.scheduled_date) < new Date() && task.state === 'pending';

  const TABS = [
    { id: 'info', label: 'Details' },
    { id: 'crew', label: `Team (${task.crew?.length || 0})` },
    { id: 'notes', label: `Notes (${task.notes?.length || 0})` },
    { id: 'equipment', label: `Equip (${task.equipment?.length || 0})` },
  ];

  return (
    <Modal isOpen title={task.short_description} onClose={onClose} size="lg">
      {/* Status row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StateBadge state={task.state} size="md" />
        <PriorityBadge priority={task.priority} size="md" />
        <span className="text-sm px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-medium">
          {t(`type.${task.type}`)}
        </span>
        {isOverdue && (
          <span className="text-sm px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">⚠️ Overdue</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4 overflow-x-auto">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tab === tb.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Overview</div>
            <p className="text-sm text-gray-700 leading-relaxed">{task.overview}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-0.5">Due Date</div>
              <div className="text-sm font-medium text-gray-900">
                {task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString() : 'Not set'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-0.5">Responsible</div>
              <div className="text-sm font-medium text-gray-900">{task.responsible_user_name || 'Unassigned'}</div>
            </div>
            {task.estimate_hours && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Estimate</div>
                <div className="text-sm font-medium text-gray-900">{task.estimate_hours} hrs</div>
              </div>
            )}
            {task.actual_hours && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Actual</div>
                <div className="text-sm font-medium text-gray-900">{task.actual_hours} hrs</div>
              </div>
            )}
          </div>

          {task.planning_notes && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Planning Notes</div>
              <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">{task.planning_notes}</p>
            </div>
          )}

          {task.work_description && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Work Done</div>
              <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{task.work_description}</p>
            </div>
          )}

          {task.problems && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Problems</div>
              <p className="text-sm text-gray-700 bg-orange-50 rounded-lg p-3">{task.problems}</p>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-4 space-y-2">
            {!task.responsible_user_name && task.state === 'pending' && (
              <button onClick={takeResponsibility} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                {t('task.takeResponsibility')}
              </button>
            )}
            {task.responsible_user_name && !isResponsible && task.state === 'pending' && (
              <button onClick={requestTakeover} className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors">
                {t('task.requestTakeover')}
              </button>
            )}
            {(task.state === 'pending' || task.state === 'planned') && !isInCrew && (
              <button onClick={joinTeam} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
                {t('task.addToTeam')}
              </button>
            )}
            {isInCrew && !isResponsible && task.state !== 'completed' && (
              <button onClick={leaveTeam} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                {t('task.removeFromTeam')}
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'crew' && (
        <div className="space-y-3">
          <div className="font-medium text-sm text-gray-700 mb-2">
            Crew Type: <span className="text-blue-600 capitalize">{task.crew_type.replace('_', ' ')}</span>
          </div>
          {task.crew?.map((member: any) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">{member.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</div>
                </div>
              </div>
              {isAdmin && task.state !== 'completed' && (
                <button onClick={() => removeUserFromCrew(member.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Remove</button>
              )}
            </div>
          ))}
          {isAdmin && task.state !== 'completed' && (
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-gray-600 mb-2">Add to crew:</div>
              <select onChange={e => { if (e.target.value) { addUserToCrew(Number(e.target.value)); (e.target as HTMLSelectElement).value = ''; }}}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" defaultValue="">
                <option value="">-- Select user to add --</option>
                {users.filter((u: any) => u.status === 'active' && !task.crew?.find((c: any) => c.id === u.id)).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          {task.crew?.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No crew members yet</div>}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          {task.notes?.map((note: any) => (
            <div key={note.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {note.user_name?.charAt(0)}
                </div>
                <span className="text-xs font-medium text-gray-900">{note.user_name}</span>
                <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-700">{note.note}</p>
            </div>
          ))}
          {task.notes?.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No notes yet</div>}
          <div className="border-t pt-3">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <button onClick={addNote} disabled={!note.trim()} className="w-full mt-2 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
              {t('task.addNote')}
            </button>
          </div>
        </div>
      )}

      {tab === 'equipment' && (
        <div className="space-y-2">
          {task.equipment?.map((eq: any) => (
            <div key={eq.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <span className="text-xl">🔧</span>
              <span className="text-sm text-gray-900">{eq.name_en}</span>
            </div>
          ))}
          {task.equipment?.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No equipment listed</div>}
        </div>
      )}
    </Modal>
  );
}
