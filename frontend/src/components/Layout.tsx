import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import i18n from '../i18n';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { team, user, logout, isAdmin } = useApp();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const isAdminSection = location.pathname.startsWith('/admin');

  const execTabs = [
    { path: '/schedule', label: t('nav.yourSchedule'), icon: '✅' },
    { path: '/volunteer', label: t('nav.volunteer'), icon: '🙋' },
    { path: '/history', label: t('nav.yourHistory'), icon: '📜' },
  ];
  const adminTabs = [
    { path: '/admin/dashboard', label: t('nav.dashboard'), icon: '📊' },
    { path: '/admin/required-tasks', label: t('nav.requiredTasks'), icon: '🔄' },
    { path: '/admin/resources', label: t('nav.resources'), icon: '🛠️' },
    { path: '/admin/team-members', label: t('nav.teamMembers'), icon: '👥' },
  ];

  const tabs = isAdminSection ? adminTabs : execTabs;
  const unreadCount = notifications.length;

  useEffect(() => {
    if (team && user) {
      api.getNotifications(team.id, user.id).then(setNotifications).catch(() => {});
    }
  }, [team?.id, user?.id]);

  const markRead = async (id: number) => {
    if (team) {
      await api.markNotificationRead(team.id, id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">🛡️</span>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate leading-tight">{t('app.title')}</div>
            <div className="text-blue-200 text-xs truncate">{team?.name} · {user?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Language selector */}
          <select value={user?.language || 'en'} onChange={e => changeLanguage(e.target.value)}
            className="bg-blue-600 text-white text-xs rounded px-1 py-1 border-0 outline-none cursor-pointer">
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="id">ID</option>
          </select>

          {/* Notifications */}
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-blue-600 transition-colors">
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Admin/User toggle */}
          {isAdmin && (
            <Link to={isAdminSection ? '/schedule' : '/admin/dashboard'}
              className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors whitespace-nowrap">
              {isAdminSection ? t('nav.userSection') : t('nav.adminSection')}
            </Link>
          )}

          {/* Logout */}
          <button onClick={logout} className="p-2 rounded-lg hover:bg-blue-600 transition-colors" title="Logout">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Notification panel */}
      {showNotifs && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)}>
          <div className="absolute right-0 top-16 w-80 bg-white shadow-2xl rounded-bl-2xl border border-gray-200 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">Notifications</span>
              <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No unread notifications</div>
            ) : notifications.map(n => (
              <div key={n.id} className="p-3 border-b text-sm text-gray-900 bg-blue-50">
                <div className="flex items-start justify-between gap-2">
                  <div>{n.message}</div>
                  <button onClick={() => markRead(n.id)} className="text-xs text-blue-500 hover:text-blue-700 shrink-0">✓</button>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom nav tabs */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-30">
        <div className="flex">
          {tabs.map(tab => {
            const active = location.pathname === tab.path || (tab.path.length > 1 && location.pathname.startsWith(tab.path));
            return (
              <Link key={tab.path} to={tab.path}
                className={`flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors ${active ? 'text-blue-700 border-t-2 border-blue-700 -mt-px' : 'text-gray-500 hover:text-gray-900'}`}>
                <span className="text-lg mb-0.5">{tab.icon}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
