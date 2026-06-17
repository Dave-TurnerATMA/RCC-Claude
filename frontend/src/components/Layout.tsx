import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { team, user, logout, isAdmin } = useApp();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const isExec = !location.pathname.startsWith('/admin');
  const execTabs = [
    { path: '/happening', label: t('nav.happening'), icon: '🏠' },
    { path: '/schedule', label: t('nav.yourSchedule'), icon: '✅' },
    { path: '/team-activity', label: t('nav.teamActivity'), icon: '👥' },
    { path: '/history', label: t('nav.yourHistory'), icon: '📜' },
  ];
  const adminTabs = [
    { path: '/admin/dashboard', label: t('nav.dashboard'), icon: '📊' },
    { path: '/admin/activity', label: t('nav.activityOverview'), icon: '📋' },
    { path: '/admin/required-tasks', label: t('nav.plannedTasks'), icon: '🔄' },
    { path: '/admin/resources', label: t('nav.resources'), icon: '🛠️' },
    { path: '/admin/team-members', label: t('nav.teamMembers'), icon: '👥' },
    { path: '/admin/reference', label: t('nav.reference'), icon: '📚' },
    { path: '/admin/spreadsheet', label: 'Spreadsheet', icon: '📁' },
  ];

  const tabs = isExec ? execTabs : adminTabs;
  const unreadCount = notifications.filter(n => !n.read_status).length;

  useEffect(() => {
    if (team && user) {
      api.getNotifications(team.id, user.id).then(setNotifications).catch(() => {});
    }
  }, [team, user]);

  const markAllRead = async () => {
    if (team && user) {
      await api.markAllRead(team.id, user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read_status: 1 })));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">🛡️</span>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{team?.name}</div>
            <div className="text-blue-200 text-xs truncate">{user?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-blue-600 transition-colors">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {/* Section toggle */}
          {isAdmin && (
            <Link
              to={isExec ? '/admin/dashboard' : '/schedule'}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
            >
              {isExec ? t('nav.admin') : t('nav.execution')}
            </Link>
          )}
          <button onClick={logout} className="p-2 rounded-lg hover:bg-blue-600 transition-colors" title="Logout">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Notification panel */}
      {showNotifs && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)}>
          <div className="absolute right-0 top-16 w-80 bg-white shadow-2xl rounded-bl-2xl border border-gray-200 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>}
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
            ) : notifications.map(n => (
              <div key={n.id} className={`p-3 border-b text-sm ${n.read_status ? 'text-gray-500' : 'text-gray-900 font-medium bg-blue-50'}`}>
                <div>{n.message}</div>
                <div className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-30 safe-area-bottom">
        <div className="flex">
          {tabs.map(tab => {
            const active = location.pathname === tab.path || (tab.path !== '/schedule' && location.pathname.startsWith(tab.path));
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors ${active ? 'text-blue-700 border-t-2 border-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
