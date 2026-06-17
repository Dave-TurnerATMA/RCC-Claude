import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useApp } from '../../contexts/AppContext';
import Modal from '../../components/Modal';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  retired: 'bg-gray-100 text-gray-500 border-gray-200',
  resigned: 'bg-gray-100 text-gray-500 border-gray-200',
};

const ROLE_COLORS: Record<string, string> = {
  administrator: 'bg-red-100 text-red-700',
  team_lead: 'bg-blue-100 text-blue-700',
  team_member: 'bg-gray-100 text-gray-600',
};

export default function TeamMembers() {
  const { t } = useTranslation();
  const { team } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [statusModal, setStatusModal] = useState<{ user: any; action: 'deactivate' | 'retire' } | null>(null);

  const load = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const data = await api.getUsers(team.id);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [team?.id]);

  useEffect(() => { load(); }, [load]);

  const activeUsers = users.filter(u => u.status === 'active');
  const inactiveUsers = users.filter(u => u.status === 'inactive');
  const retiredUsers = users.filter(u => u.status === 'retired' || u.status === 'resigned');

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20 flex items-center justify-between">
        <h1 className="font-bold text-gray-900 text-lg">{t('nav.teamMembers')}</h1>
        <button onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + {t('common.add')}
        </button>
      </div>

      <div className="p-3 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : (
          <>
            {activeUsers.length > 0 && (
              <section>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Active Members ({activeUsers.length})
                </div>
                <div className="space-y-2">
                  {activeUsers.map(u => (
                    <UserCard
                      key={u.id}
                      user={u}
                      onEdit={() => setEditUser(u)}
                      onDeactivate={() => setStatusModal({ user: u, action: 'deactivate' })}

                    />
                  ))}
                </div>
              </section>
            )}

            {inactiveUsers.length > 0 && (
              <section>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Inactive / On Leave ({inactiveUsers.length})
                </div>
                <div className="space-y-2">
                  {inactiveUsers.map(u => (
                    <UserCard
                      key={u.id}
                      user={u}
                      onEdit={() => setEditUser(u)}
                      onRetire={() => setStatusModal({ user: u, action: 'retire' })}
                      onReactivate={async () => {
                        try {
                          await api.updateUser(team!.id, u.id, { status: 'active' });
                          load();
                        } catch (e: any) { alert(e.message); }
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {retiredUsers.length > 0 && (
              <section>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  Retired ({retiredUsers.length})
                </div>
                <div className="space-y-2">
                  {retiredUsers.map(u => (
                    <UserCard key={u.id} user={u} onEdit={() => setEditUser(u)} />
                  ))}
                </div>
              </section>
            )}

            {users.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">👥</div>
                <div className="font-medium text-gray-700">No team members yet</div>
                <div className="text-sm text-gray-500 mt-1">Add your first team member to get started</div>
              </div>
            )}
          </>
        )}
      </div>

      {(showAdd || editUser) && (
        <UserForm
          user={editUser}
          onClose={() => { setShowAdd(false); setEditUser(null); load(); }}
        />
      )}

      {statusModal?.action === 'deactivate' && (
        <DeactivateModal
          user={statusModal.user}
          activeUsers={activeUsers.filter(u => u.id !== statusModal.user.id)}
          onClose={() => setStatusModal(null)}
          onDone={load}
        />
      )}

      {statusModal?.action === 'retire' && (
        <RetireModal
          user={statusModal.user}
          onClose={() => setStatusModal(null)}
          onDone={load}
        />
      )}
    </div>
  );
}

function UserCard({ user, onEdit, onDeactivate, onRetire, onReactivate }: any) {
  const { t } = useTranslation();
  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          user.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">{user.name}</div>
          {user.email && <div className="text-xs text-gray-400 truncate">{user.email}</div>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
              {String(t(`role.${user.role}`) || user.role.replace('_', ' '))}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[user.status] || 'bg-gray-100 text-gray-500'}`}>
              {String(t(`status.${user.status}`) || user.status)}
            </span>
            {user.active_task_count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                {user.active_task_count} tasks
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end flex-shrink-0">
          <button onClick={onEdit}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
            Edit
          </button>
          {onDeactivate && (
            <button onClick={onDeactivate}
              className="text-xs text-orange-600 hover:text-orange-800 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors">
              Deactivate
            </button>
          )}
          {onReactivate && (
            <button onClick={onReactivate}
              className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors">
              Reactivate
            </button>
          )}
          {onRetire && (
            <button onClick={onRetire}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
              Retire
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UserForm({ user, onClose }: { user: any; onClose: () => void }) {
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
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }
    setLoading(true);
    try {
      if (user) {
        await api.updateUser(team!.id, user.id, form);
      } else {
        await api.createUser(team!.id, { ...form, status: 'active' });
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
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} autoFocus
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
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
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={submit} disabled={loading || !form.name.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {loading ? 'Saving...' : (user ? t('common.update') : t('common.add'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeactivateModal({ user, activeUsers, onClose, onDone }: any) {
  const { t } = useTranslation();
  const { team } = useApp();
  const [coveringUserId, setCoveringUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!coveringUserId) return;
    setLoading(true);
    try {
      await api.updateUser(team!.id, user.id, {
        status: 'inactive',
        covering_user_id: Number(coveringUserId),
      });
      onDone();
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
          <p className="text-sm text-orange-800">
            Deactivating this member will reassign their pending tasks to the covering user and send notifications.
          </p>
        </div>
        {user.active_task_count > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
            ⚠️ This user has <strong>{user.active_task_count}</strong> active task(s) that will be reassigned.
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Covering User *</label>
          <select value={coveringUserId} onChange={e => setCoveringUserId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">-- Select covering user --</option>
            {activeUsers.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
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

function RetireModal({ user, onClose, onDone }: any) {
  const { t } = useTranslation();
  const { team } = useApp();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await api.updateUser(team!.id, user.id, { status: 'retired' });
      onDone();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen title={`Mark ${user.name} as Retired`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-700">
            This will mark <strong>{user.name}</strong> as retired. They must have no active task assignments or default crew responsibilities before retiring.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={confirm} disabled={loading}
            className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors">
            {loading ? 'Processing...' : 'Mark as Retired'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
