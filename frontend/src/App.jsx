import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Students from './pages/students/Students';
import Finance from './pages/finance/Finance';
import Fees from './pages/fees/Fees';
import Reports from './pages/reports/Reports';
import Staff from './pages/staff/Staff';
import Settings from './pages/settings/Settings';
import PlatformDashboard from './pages/admin/PlatformDashboard';
import AdminSchools from './pages/admin/Schools';
import PlatformSettings from './pages/admin/PlatformSettings';
import RequireSuperAdmin from './components/auth/RequireSuperAdmin';
import BlockSuperAdmin from './components/auth/BlockSuperAdmin';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<BlockSuperAdmin><Dashboard /></BlockSuperAdmin>} />
              <Route path="students" element={<BlockSuperAdmin><Students /></BlockSuperAdmin>} />
              <Route path="finance" element={<BlockSuperAdmin><Finance /></BlockSuperAdmin>} />
              <Route path="fees" element={<BlockSuperAdmin><Fees /></BlockSuperAdmin>} />
              <Route path="reports" element={<BlockSuperAdmin><Reports /></BlockSuperAdmin>} />
              <Route path="staff" element={<BlockSuperAdmin><Staff /></BlockSuperAdmin>} />
              <Route path="settings" element={<BlockSuperAdmin><Settings /></BlockSuperAdmin>} />

              <Route path="admin/dashboard" element={<RequireSuperAdmin><PlatformDashboard /></RequireSuperAdmin>} />
              <Route path="admin/schools" element={<RequireSuperAdmin><AdminSchools /></RequireSuperAdmin>} />
              <Route path="admin/settings" element={<RequireSuperAdmin><PlatformSettings /></RequireSuperAdmin>} />
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
