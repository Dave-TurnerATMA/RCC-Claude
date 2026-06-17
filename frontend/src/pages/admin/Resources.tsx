import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';

export default function Resources() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const data = await api.getEquipment(team.id);
      setEquipment(data);
    } finally {
      setLoading(false);
    }
  }, [team?.id]);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (item: any) => {
    if (!window.confirm(`Delete "${item.name_en}"? This cannot be undone.`)) return;
    try {
      await api.deleteEquipment(team!.id, item.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = equipment.filter(eq =>
    (eq.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
    (eq.name_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (eq.name_es || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-gray-900 text-lg">{t('nav.resources')}</h1>
          <button onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + {t('common.add')}
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`${t('common.search')}...`}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="p-3 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? 'No results found' : 'No equipment items yet'}
          </div>
        ) : (
          filtered.map(eq => (
            <div key={eq.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">🔧</span>
                    <span className="font-semibold text-gray-900 text-sm">{eq.name_en}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                      🇮🇩 {eq.name_id || '—'}
                    </span>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">
                      🇪🇸 {eq.name_es || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditItem(eq)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                    {t('common.edit')}
                  </button>
                  <button onClick={() => deleteItem(eq)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {(showAdd || editItem) && (
        <EquipmentForm
          item={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); load(); }}
        />
      )}
    </div>
  );
}

function EquipmentForm({ item, onClose }: { item: any; onClose: () => void }) {
  const { t } = useTranslation();
  const { team } = useApp();
  const [form, setForm] = useState({
    name_en: item?.name_en || '',
    name_es: item?.name_es || '',
    name_id: item?.name_id || '',
  });
  const [loading, setLoading] = useState(false);
  const isNew = !item;

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.name_en.trim()) {
      alert('English name is required');
      return;
    }
    setLoading(true);
    try {
      if (item) {
        await api.updateEquipment(team!.id, item.id, form);
      } else {
        // If translations not provided, backend will auto-translate via AI
        await api.createEquipment(team!.id, form);
      }
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={item ? 'Edit Equipment' : 'Add Equipment'} onClose={onClose}>
      <div className="space-y-4">
        {isNew && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
            Enter the English name and optionally add translations. If left blank, the system will auto-translate using AI.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🇬🇧 English *</label>
          <input
            type="text"
            value={form.name_en}
            onChange={e => set('name_en', e.target.value)}
            autoFocus
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Equipment name in English"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🇮🇩 Bahasa Indonesia {isNew && <span className="text-gray-400 font-normal">(optional — auto-translated)</span>}
          </label>
          <input
            type="text"
            value={form.name_id}
            onChange={e => set('name_id', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama peralatan dalam Bahasa Indonesia"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🇪🇸 Español {isNew && <span className="text-gray-400 font-normal">(optional — auto-translated)</span>}
          </label>
          <input
            type="text"
            value={form.name_es}
            onChange={e => set('name_es', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nombre del equipo en español"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={submit} disabled={loading || !form.name_en.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {loading ? 'Saving...' : (item ? t('common.update') : t('common.add'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}
