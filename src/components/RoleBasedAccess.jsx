import { useAuth } from '../context/AuthContext';

const RoleBasedAccess = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
};

export default RoleBasedAccess;

