import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import WhatsHappening from './pages/execution/WhatsHappening';
import YourSchedule from './pages/execution/YourSchedule';
import Volunteer from './pages/execution/Volunteer';
import YourHistory from './pages/execution/YourHistory';
import Dashboard from './pages/admin/Dashboard';
import ActivityOverview from './pages/admin/ActivityOverview';
import RequiredTasks from './pages/admin/RequiredTasks';
import Resources from './pages/admin/Resources';
import TeamMembers from './pages/admin/TeamMembers';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { team, user } = useApp();
  if (!team || !user) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { team, user, isAdmin } = useApp();
  if (!team || !user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/happening" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { team, user } = useApp();

  return (
    <Routes>
      <Route path="/" element={team && user ? <Navigate to="/happening" replace /> : <Login />} />
      <Route path="/happening" element={<ProtectedRoute><WhatsHappening /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><YourSchedule /></ProtectedRoute>} />
      <Route path="/volunteer" element={<ProtectedRoute><Volunteer /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><YourHistory /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/admin/activity" element={<AdminRoute><ActivityOverview /></AdminRoute>} />
      <Route path="/admin/required-tasks" element={<AdminRoute><RequiredTasks /></AdminRoute>} />
      <Route path="/admin/resources" element={<AdminRoute><Resources /></AdminRoute>} />
      <Route path="/admin/team-members" element={<AdminRoute><TeamMembers /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
