import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';

interface Props {
  task: any;
  onClose: () => void;
  onCompleted: () => void;
}

export default function CompleteTaskModal({ task, onClose, onCompleted }: Props) {
  const { t } = useTranslation();
  const { team, user } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [form, setForm] = useState({
    state: 'completed' as 'completed' | 'abandoned' | 'not_required',
    completed_at: new Date().toISOString().slice(0, 16),
    work_description: '',
    actual_hours: '',
    problems: '',
  });
  const [additionalCrew, setAdditionalCrew] = useState<number[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<number[]>(task.equipment?.map((e: any) => e.id) || []);
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUp, setFollowUp] = useState({ short_description: '', task_overview: '', priority: 'medium', estimate_hours: '' });
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (team) {
      api.getUsers(team.id).then(u => setUsers(u.filter((x: any) => x.status === 'active')));
      api.getEquipment(team.id).then(setAllEquipment);
    }
  }, [team?.id]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const setFU = (k: string, v: string) => setFollowUp(prev => ({ ...prev, [k]: v }));

  const toggleCrewMember = (id: number) => setAdditionalCrew(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleEquipment = (id: number) => setSelectedEquipment(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    setLoading(true);
    try {
      await api.completeTask(team!.id, task.id, {
        state: form.state,
        completed_at: new Date(form.completed_at).toISOString(),
        work_description: form.work_description || null,
        actual_hours: form.actual_hours ? Number(form.actual_hours) : null,
        problems: form.problems || null,
        additional_crew_ids: additionalCrew,
        equipment_ids: selectedEquipment,
        follow_up_task: createFollowUp && followUp.short_description ? {
          short_description: followUp.short_description,
          task_overview: followUp.task_overview || followUp.short_description,
          priority: followUp.priority,
          estimate_hours: followUp.estimate_hours ? Number(followUp.estimate_hours) : null,
          responsible_user_id: user?.id || null,
        } : null,
      });

      if (uploadFile) {
        try { await api.uploadFile(task.id, uploadFile); } catch {}
      }

      onCompleted();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const existingCrewIds = new Set(task.crew?.map((c: any) => c.id) || []);
  const availableUsers = users.filter(u => !existingCrewIds.has(u.id));
  const isRecurring = task.type === 'recurring';
  const steps: any[] = task.steps || [];

  const toggleStep = async (step: any) => {
    const newChecked = !step.checked;
    step.checked = newChecked;
    try { await api.updateStepCheck(team!.id, task.id, step.id, newChecked); } catch {}
  };

  return (
    <Modal isOpen title={`${t('complete.title')}: ${task.short_description}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Steps checklist */}
        {steps.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-sm font-semibold text-blue-800 mb-3">📋 Task Steps</div>
            <div className="space-y-2">
              {steps.map((step: any) => (
                <label key={step.id} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked={step.checked}
                    onChange={() => toggleStep(step)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 border-gray-300 flex-shrink-0" />
                  <span className={`text-sm ${step.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{step.step_text}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-2">Tick steps as you go — not required to complete all before submitting.</p>
          </div>
        )}

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('complete.outcome')} *</label>
          <div className="flex gap-2">
            {[
              { value: 'completed', label: t('complete.completed') },
              ...(!isRecurring ? [{ value: 'abandoned', label: t('complete.abandoned') }] : []),
              { value: 'not_required', label: t('complete.notRequired') },
            ].map(opt => (
              <button key={opt.value} onClick={() => set('state', opt.value)}
                className={`flex-1 py-2 px-2 rounded-xl border-2 text-xs font-medium transition-all ${form.state === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date/Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('complete.completedAt')} *</label>
          <input type="datetime-local" value={form.completed_at} onChange={e => set('completed_at', e.target.value)}
            max={new Date().toISOString().slice(0, 16)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        {/* Actual Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('complete.actualHours')}</label>
          <input type="number" min="0" max="100" step="0.5" value={form.actual_hours} onChange={e => set('actual_hours', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0-100 hours" />
        </div>

        {/* Work Done */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('complete.workDescription')}</label>
          <textarea value={form.work_description} onChange={e => set('work_description', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe what was done..." />
        </div>

        {/* Problems */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('complete.problems')}</label>
          <textarea value={form.problems} onChange={e => set('problems', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any problems or issues encountered..." />
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('complete.equipmentUsed')}</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {allEquipment.map(eq => (
              <button key={eq.id} onClick={() => toggleEquipment(eq.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedEquipment.includes(eq.id) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {selectedEquipment.includes(eq.id) ? '✓ ' : ''}{eq.name_en}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Crew */}
        {availableUsers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('complete.additionalCrew')}</label>
            <div className="flex flex-wrap gap-2">
              {availableUsers.map(u => (
                <button key={u.id} onClick={() => toggleCrewMember(u.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${additionalCrew.includes(u.id) ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {additionalCrew.includes(u.id) ? '✓ ' : '+ '}{u.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('complete.uploadFiles')}</label>
          <input type="file" accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={e => setUploadFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium" />
        </div>

        {/* Follow-up */}
        <div className="border rounded-xl p-4 bg-yellow-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={createFollowUp} onChange={e => setCreateFollowUp(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm font-medium text-gray-700">{t('task.createFollowUp')}</span>
          </label>
          {createFollowUp && (
            <div className="mt-3 space-y-3">
              <input type="text" value={followUp.short_description} onChange={e => setFU('short_description', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Follow-up task description *" />
              <textarea value={followUp.task_overview} onChange={e => setFU('task_overview', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Details..." />
              <div className="flex gap-2">
                <select value={followUp.priority} onChange={e => setFU('priority', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  {['urgent','high','medium','low'].map(p => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                </select>
                <input type="number" min="0" max="100" value={followUp.estimate_hours} onChange={e => setFU('estimate_hours', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Est. hours" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-green-700 transition-colors">
            {loading ? t('common.loading') : t('common.submit')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
