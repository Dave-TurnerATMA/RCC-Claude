import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';

interface Props { onClose: () => void; }

export default function CreateTaskModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [form, setForm] = useState({
    type: 'one_off',
    short_description: '',
    overview: '',
    scheduled_date: '',
    priority: 'medium',
    responsible_user_id: '',
    estimate_hours: '',
    planning_notes: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team) api.getUsers(team.id).then(u => setUsers(u.filter((x: any) => x.status === 'active')));
  }, [team]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.short_description || !form.overview || !form.priority) return;
    setLoading(true);
    try {
      await api.createScheduledTask(team!.id, {
        ...form,
        responsible_user_id: form.responsible_user_id ? Number(form.responsible_user_id) : null,
        estimate_hours: form.estimate_hours ? Number(form.estimate_hours) : null,
      });
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title="Create Task" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="one_off">{t('type.one_off')}</option>
            <option value="follow_up">{t('type.follow_up')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.shortDescription')} *</label>
          <input type="text" value={form.short_description} onChange={e => set('short_description', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief description..." maxLength={200} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.overview')} *</label>
          <textarea value={form.overview} onChange={e => set('overview', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Detailed description..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.priority')} *</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="urgent">{t('priority.urgent')}</option>
              <option value="high">{t('priority.high')}</option>
              <option value="medium">{t('priority.medium')}</option>
              <option value="low">{t('priority.low')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.estimateHours')}</label>
            <input type="number" min="0" max="100" step="0.5" value={form.estimate_hours} onChange={e => set('estimate_hours', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0-100" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.scheduledDate')}</label>
          <input type="date" value={form.scheduled_date} min={new Date().toISOString().split('T')[0]} onChange={e => set('scheduled_date', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.responsible')}</label>
          <select value={form.responsible_user_id} onChange={e => set('responsible_user_id', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">-- {t('common.optional')} --</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('task.planningNotes')}</label>
          <textarea value={form.planning_notes} onChange={e => set('planning_notes', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional planning notes..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={submit} disabled={loading || !form.short_description || !form.overview}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {loading ? 'Creating...' : t('common.create')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
