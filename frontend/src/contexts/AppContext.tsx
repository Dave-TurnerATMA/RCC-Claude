import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n';

interface Team { id: number; name: string; code: string; }
interface User { id: number; team_id: number; name: string; email: string; role: string; status: string; language: string; }

interface AppContextType {
  team: Team | null;
  user: User | null;
  setTeam: (t: Team) => void;
  setUser: (u: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isTeamLead: boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeamState] = useState<Team | null>(() => {
    const s = sessionStorage.getItem('team');
    return s ? JSON.parse(s) : null;
  });
  const [user, setUserState] = useState<User | null>(() => {
    const s = sessionStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });

  const setTeam = (t: Team) => {
    sessionStorage.setItem('team', JSON.stringify(t));
    setTeamState(t);
  };

  const setUser = (u: User) => {
    sessionStorage.setItem('user', JSON.stringify(u));
    setUserState(u);
    if (u.language) {
      i18n.changeLanguage(u.language);
      localStorage.setItem('language', u.language);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('team');
    sessionStorage.removeItem('user');
    setTeamState(null);
    setUserState(null);
  };

  return (
    <AppContext.Provider value={{
      team, user, setTeam, setUser, logout,
      isAdmin: user?.role === 'administrator',
      isTeamLead: user?.role === 'team_lead' || user?.role === 'administrator',
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
