import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { TermProvider } from './context/TermContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s before data is considered stale
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
import Layout from './components/layout/Layout';
import LandingPage from './pages/landing/LandingPage';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Students from './pages/students/Students';
import StudentLedger from './pages/students/StudentLedger';
import Finance from './pages/finance/Finance';
import Suspense from './pages/finance/Suspense';
import Fees from './pages/fees/Fees';
import Terms from './pages/terms/Terms';
import Reports from './pages/reports/Reports';
import Staff from './pages/staff/Staff';
import Settings from './pages/settings/Settings';
import AuditLogs from './pages/audit/AuditLogs';
import Receipt from './pages/receipts/Receipt';
import SmsReminders from './pages/sms/SmsReminders';
import PlatformDashboard from './pages/admin/PlatformDashboard';
import AdminSchools from './pages/admin/Schools';
import PlatformSettings from './pages/admin/PlatformSettings';
import RequireSuperAdmin from './components/auth/RequireSuperAdmin';
import BlockSuperAdmin from './components/auth/BlockSuperAdmin';
import './App.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TermProvider>
        <SocketProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<BlockSuperAdmin><Dashboard /></BlockSuperAdmin>} />
                <Route path="/students" element={<BlockSuperAdmin><Students /></BlockSuperAdmin>} />
                <Route path="/students/:studentId/ledger" element={<BlockSuperAdmin><StudentLedger /></BlockSuperAdmin>} />
                <Route path="/finance" element={<BlockSuperAdmin><Finance /></BlockSuperAdmin>} />
                <Route path="/finance/suspense" element={<BlockSuperAdmin><Suspense /></BlockSuperAdmin>} />
                <Route path="/fees" element={<BlockSuperAdmin><Fees /></BlockSuperAdmin>} />
                <Route path="/terms" element={<BlockSuperAdmin><Terms /></BlockSuperAdmin>} />
                <Route path="/sms" element={<BlockSuperAdmin><SmsReminders /></BlockSuperAdmin>} />
                <Route path="/reports" element={<BlockSuperAdmin><Reports /></BlockSuperAdmin>} />
                <Route path="/staff" element={<BlockSuperAdmin><Staff /></BlockSuperAdmin>} />
                <Route path="/settings" element={<BlockSuperAdmin><Settings /></BlockSuperAdmin>} />
                <Route path="/audit-logs" element={<BlockSuperAdmin><AuditLogs /></BlockSuperAdmin>} />
                <Route path="/receipts/:transactionId" element={<BlockSuperAdmin><Receipt /></BlockSuperAdmin>} />

                <Route path="/admin/dashboard" element={<RequireSuperAdmin><PlatformDashboard /></RequireSuperAdmin>} />
                <Route path="/admin/schools" element={<RequireSuperAdmin><AdminSchools /></RequireSuperAdmin>} />
                <Route path="/admin/settings" element={<RequireSuperAdmin><PlatformSettings /></RequireSuperAdmin>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </TermProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
