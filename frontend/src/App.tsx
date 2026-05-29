import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import TeamSchedule from './pages/execution/TeamSchedule';
import YourSchedule from './pages/execution/YourSchedule';
import YourHistory from './pages/execution/YourHistory';
import Dashboard from './pages/admin/Dashboard';
import RequiredTasks from './pages/admin/RequiredTasks';
import Resources from './pages/admin/Resources';
import TeamMembers from './pages/admin/TeamMembers';
import Reference from './pages/admin/Reference';
import SpreadsheetImport from './pages/admin/SpreadsheetImport';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { team, user } = useApp();
  if (!team || !user) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { team, user, isAdmin } = useApp();
  if (!team || !user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/schedule" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { team, user } = useApp();

  return (
    <Routes>
      <Route path="/" element={team && user ? <Navigate to="/schedule" replace /> : <Login />} />
      <Route path="/schedule" element={<ProtectedRoute><TeamSchedule /></ProtectedRoute>} />
      <Route path="/my-schedule" element={<ProtectedRoute><YourSchedule /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><YourHistory /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/admin/required-tasks" element={<AdminRoute><RequiredTasks /></AdminRoute>} />
      <Route path="/admin/resources" element={<AdminRoute><Resources /></AdminRoute>} />
      <Route path="/admin/team-members" element={<AdminRoute><TeamMembers /></AdminRoute>} />
      <Route path="/admin/reference" element={<AdminRoute><Reference /></AdminRoute>} />
      <Route path="/admin/spreadsheet" element={<AdminRoute><SpreadsheetImport /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
