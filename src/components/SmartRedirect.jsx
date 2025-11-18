import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

const SmartRedirect = () => {
  const { user } = useAuth();

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

