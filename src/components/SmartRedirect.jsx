import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

const SmartRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === ROLES.SUPER_ADMIN) {
    return <Navigate to="/super-admin/dashboard" replace />;
  } else if (user.role === ROLES.CUSTOMER) {
    return <Navigate to="/portal" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

export default SmartRedirect;

