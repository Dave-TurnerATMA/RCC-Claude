import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useApp } from '../contexts/AppContext';
import i18n from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function Login() {
  const { t } = useTranslation();
  const { setTeam, setUser } = useApp();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [lang, setLang] = useState(localStorage.getItem('language') || 'en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTeams().then(setTeams).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      api.getUsers(selectedTeam.id).then(u => setUsers(u.filter((x: any) => x.status === 'active')));
      setSelectedUser(null);
    }
  }, [selectedTeam]);

  const handleLang = (code: string) => {
    setLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  const handleContinue = () => {
    if (!selectedTeam || !selectedUser) return;
    setTeam(selectedTeam);
    setUser({ ...selectedUser, language: lang });
    navigate(selectedUser.role === 'administrator' ? '/schedule' : '/schedule');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🛡️</div>
          <h1 className="text-2xl font-bold text-white">{t('app.title')}</h1>
          <p className="text-blue-200 text-sm mt-1">{t('app.tagline')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('login.language')}</label>
            <div className="flex gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleLang(l.code)}
                  className={`flex-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all ${lang === l.code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <div className="text-xl mb-0.5">{l.flag}</div>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('login.selectTeam')}</label>
            {loading ? (
              <div className="text-center py-3 text-gray-400">{t('common.loading')}</div>
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedTeam?.id === team.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="font-medium text-gray-900">🏘️ {team.name}</div>
                    <div className="text-xs text-gray-500">{team.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Selection */}
          {selectedTeam && users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('login.selectUser')}</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedUser?.id === user.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selectedTeam || !selectedUser}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg"
          >
            {t('login.continue')} →
          </button>
        </div>

        <p className="text-center text-blue-300 text-xs mt-4">Community Preparation Planning v1.0</p>
      </div>
    </div>
  );
}
