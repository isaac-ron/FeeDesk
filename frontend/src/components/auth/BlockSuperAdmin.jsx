import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Prevents super_admin from hitting school-scoped routes (they have no school)
const BlockSuperAdmin = ({ children }) => {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
};

export default BlockSuperAdmin;
