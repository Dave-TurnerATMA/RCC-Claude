import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';

export default function Reference() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    const data = await api.getEquipment(team.id);
    setEquipment(data);
    setLoading(false);
  }, [team]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.reference')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Reference data for your team</p>
      </div>

      <div className="p-3 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">Equipment List ({equipment.length})</h2>
            <p className="text-xs text-gray-500 mt-0.5">Items cannot be deleted — only edit or manage through Resources tab</p>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {equipment.map(eq => (
                <div key={eq.id} className="px-4 py-3">
                  <div className="font-medium text-sm text-gray-900">{eq.name_en}</div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-500">🇮🇩 {eq.name_id}</span>
                    <span className="text-xs text-gray-500">🇪🇸 {eq.name_es}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Task States</h3>
          <div className="space-y-2 text-sm">
            {[
              { state: 'pending', desc: 'Ready to be worked on' },
              { state: 'planned', desc: 'Scheduled for the future - an earlier instance is still pending' },
              { state: 'completed', desc: 'Successfully finished' },
              { state: 'abandoned', desc: 'Will never be done (One-off and Follow-up only)' },
              { state: 'not_required', desc: 'Decided it\'s not needed (One-off and Follow-up only)' },
              { state: 'missed', desc: 'A planned task whose date has passed without being promoted' },
            ].map(({ state, desc }) => (
              <div key={state} className="flex gap-2">
                <span className="font-medium text-blue-800 capitalize w-28 flex-shrink-0">{state.replace('_', ' ')}</span>
                <span className="text-blue-700">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4">
          <h3 className="font-semibold text-green-900 mb-2">🔄 Task Types</h3>
          <div className="space-y-2 text-sm">
            {[
              { type: 'Scheduled', desc: 'Auto-generated from a Required Task on a recurring schedule' },
              { type: 'One Off', desc: 'Created manually as a standalone task' },
              { type: 'Follow Up', desc: 'Created from completing another task to address outstanding issues' },
            ].map(({ type, desc }) => (
              <div key={type} className="flex gap-2">
                <span className="font-medium text-green-800 w-24 flex-shrink-0">{type}</span>
                <span className="text-green-700">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4">
          <h3 className="font-semibold text-purple-900 mb-2">👥 User Roles</h3>
          <div className="space-y-2 text-sm">
            {[
              { role: 'Administrator', desc: 'Full access to all features, can assign tasks and manage users' },
              { role: 'Team Lead', desc: 'Can manage crew assignments and crew type for tasks' },
              { role: 'Team Member', desc: 'Can accept tasks, join crews, and record task progress' },
            ].map(({ role, desc }) => (
              <div key={role} className="flex gap-2">
                <span className="font-medium text-purple-800 w-28 flex-shrink-0">{role}</span>
                <span className="text-purple-700">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
