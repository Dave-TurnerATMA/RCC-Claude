import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import PriorityBadge from '../../components/PriorityBadge';
import StateBadge from '../../components/StateBadge';
import Modal from '../../components/Modal';

export default function YourHistory() {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const load = useCallback(async () => {
    if (!team || !user) return;
    setLoading(true);
    const data = await api.getScheduledTaskHistory(team.id, user.id);
    setTasks(data);
    setLoading(false);
  }, [team, user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.yourHistory')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Completed tasks you were involved in</p>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📜</div>
            <div className="font-medium text-gray-700">No completed tasks yet</div>
          </div>
        ) : tasks.map(task => (
          <div key={task.id} onClick={() => setSelectedTask(task)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-400 p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm flex-1">{task.short_description}</h3>
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <StateBadge state={task.state} />
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium border border-gray-200">
                {t(`type.${task.type}`)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {task.completed_at && (
                <span>✅ {new Date(task.completed_at).toLocaleDateString()}</span>
              )}
              {task.actual_hours && <span>⏱ {task.actual_hours}h</span>}
              {task.crew?.length > 0 && <span>👥 {task.crew.length}</span>}
            </div>
            {task.problems && (
              <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                <span>⚠️</span> Problems reported
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTask && (
        <HistoryDetailModal task={selectedTask} onClose={() => { setSelectedTask(null); load(); }} />
      )}
    </div>
  );
}

function HistoryDetailModal({ task, onClose }: { task: any; onClose: () => void }) {
  const { t } = useTranslation();
  const { team, user, isAdmin } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'info' | 'crew' | 'notes'>('info');

  useEffect(() => {
    if (team) api.getUsers(team.id).then(setUsers);
  }, [team]);

  const addNote = async () => {
    if (!note.trim()) return;
    await api.addNote(team!.id, task.id, user!.id, note);
    setNote('');
  };

  const addToCrew = async (uid: number) => {
    await api.addCrew(team!.id, task.id, uid);
  };

  return (
    <Modal isOpen title={task.short_description} onClose={onClose} size="lg">
      <div className="flex flex-wrap gap-2 mb-4">
        <StateBadge state={task.state} size="md" />
        <PriorityBadge priority={task.priority} size="md" />
      </div>

      <div className="flex border-b mb-4">
        {[
          { id: 'info', label: 'Report' },
          { id: 'crew', label: `Crew (${task.crew?.length || 0})` },
          { id: 'notes', label: `Notes (${task.notes?.length || 0})` },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === tb.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {task.completed_at && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-0.5">Completed</div>
                <div className="text-sm font-medium">{new Date(task.completed_at).toLocaleDateString()}</div>
              </div>
            )}
            {task.actual_hours && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-0.5">Actual Hours</div>
                <div className="text-sm font-medium">{task.actual_hours} hrs</div>
              </div>
            )}
          </div>
          {task.work_description && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Work Done</div>
              <p className="text-sm text-gray-700 bg-green-50 rounded-xl p-3">{task.work_description}</p>
            </div>
          )}
          {task.problems && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Problems</div>
              <p className="text-sm text-gray-700 bg-orange-50 rounded-xl p-3">{task.problems}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'crew' && (
        <div className="space-y-3">
          {task.crew?.map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900">{member.name}</div>
                <div className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</div>
              </div>
            </div>
          ))}
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-gray-600 mb-2">Add someone who participated:</div>
            <select onChange={e => { if (e.target.value) { addToCrew(Number(e.target.value)); (e.target as HTMLSelectElement).value = ''; }}}
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2" defaultValue="">
              <option value="">-- Select participant --</option>
              {users.filter((u: any) => !task.crew?.find((c: any) => c.id === u.id)).map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          {task.notes?.map((n: any) => (
            <div key={n.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{n.user_name?.charAt(0)}</div>
                <span className="text-xs font-medium text-gray-900">{n.user_name}</span>
                <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-700">{n.note}</p>
            </div>
          ))}
          <div className="border-t pt-3">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <button onClick={addNote} disabled={!note.trim()} className="w-full mt-2 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
              Add Note
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
