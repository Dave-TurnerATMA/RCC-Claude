import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';

export default function TeamMembers() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    const data = await api.getUsers(team.id);
    setUsers(data);
    setLoading(false);
  }, [team]);

  useEffect(() => { load(); }, [load]);

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-yellow-100 text-yellow-700',
    resigned: 'bg-gray-100 text-gray-600',
  };

  const roleColors: Record<string, string> = {
    administrator: 'bg-red-100 text-red-700',
    team_lead: 'bg-blue-100 text-blue-700',
    team_member: 'bg-gray-100 text-gray-600',
  };

  const activeUsers = users.filter(u => u.status === 'active');
  const inactiveUsers = users.filter(u => u.status !== 'active');

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20 flex items-center justify-between">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.teamMembers')}</h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + {t('common.add')}
        </button>
      </div>

      <div className="p-3 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : (
          <>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1">
                Active Members ({activeUsers.length})
              </div>
              <div className="space-y-2">
                {activeUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    statusColors={statusColors}
                    roleColors={roleColors}
                    onEdit={() => setEditUser(user)}
                    onDeactivate={() => setDeactivateUser(user)}
                  />
                ))}
              </div>
            </div>

            {inactiveUsers.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Inactive / Resigned ({inactiveUsers.length})
                </div>
                <div className="space-y-2">
                  {inactiveUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      statusColors={statusColors}
                      roleColors={roleColors}
                      onEdit={() => setEditUser(user)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {(showAdd || editUser) && (
        <UserForm
          user={editUser}
          allUsers={users.filter(u => u.status === 'active')}
          onClose={() => { setShowAdd(false); setEditUser(null); load(); }}
        />
      )}

      {deactivateUser && (
        <DeactivateModal
          user={deactivateUser}
          activeUsers={users.filter(u => u.status === 'active' && u.id !== deactivateUser.id)}
          onClose={() => setDeactivateUser(null)}
          onConfirm={load}
        />
      )}
    </div>
  );
}

function UserCard({ user, statusColors, roleColors, onEdit, onDeactivate }: any) {
  const { t } = useTranslation();
  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${user.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm">{user.name}</div>
          <div className="text-xs text-gray-500 truncate">{user.email}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
              {t(`role.${user.role}`)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[user.status]}`}>
              {t(`status.${user.status}`)}
            </span>
            {user.active_task_count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                {user.active_task_count} tasks
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={onEdit} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
            Edit
          </button>
          {user.status === 'active' && onDeactivate && (
            <button onClick={onDeactivate} className="text-xs text-orange-600 hover:text-orange-800 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors">
              Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UserForm({ user, allUsers, onClose }: { user: any; allUsers: any[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { team } = useApp();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'team_member',
    language: user?.language || 'en',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email) return;
    setLoading(true);
    try {
      if (user) {
        await api.updateUser(team!.id, user.id, form);
      } else {
        await api.createUser(team!.id, form);
      }
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={user ? 'Edit Member' : 'Add Member'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <select value={form.role} onChange={e => set('role', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="team_member">{t('role.team_member')}</option>
            <option value="team_lead">{t('role.team_lead')}</option>
            <option value="administrator">{t('role.administrator')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select value={form.language} onChange={e => set('language', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="en">🇬🇧 English</option>
            <option value="id">🇮🇩 Bahasa Indonesia</option>
            <option value="es">🇪🇸 Español</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={submit} disabled={loading || !form.name || !form.email}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {loading ? 'Saving...' : (user ? t('common.update') : t('common.add'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeactivateModal({ user, activeUsers, onClose, onConfirm }: any) {
  const { t } = useTranslation();
  const { team } = useApp();
  const [coveringUserId, setCoveringUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!coveringUserId) return;
    setLoading(true);
    try {
      await api.updateUser(team!.id, user.id, { status: 'inactive', covering_user_id: Number(coveringUserId) });
      onConfirm();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={`Deactivate ${user.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-800">{t('admin.deactivateWarning')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.coveringUser')} *</label>
          <select value={coveringUserId} onChange={e => setCoveringUserId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">-- Select covering user --</option>
            {activeUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={confirm} disabled={loading || !coveringUserId}
            className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-orange-700 transition-colors">
            {loading ? 'Processing...' : 'Deactivate'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
