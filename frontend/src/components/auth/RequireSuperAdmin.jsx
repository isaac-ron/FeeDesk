import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RequireSuperAdmin = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export default RequireSuperAdmin;
