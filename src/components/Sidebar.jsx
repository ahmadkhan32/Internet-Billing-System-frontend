import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.TECHNICAL_OFFICER, ROLES.RECOVERY_OFFICER, ROLES.CUSTOMER]
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: '👥',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.TECHNICAL_OFFICER, ROLES.RECOVERY_OFFICER]
    },
    {
      path: '/packages',
      label: 'Packages',
      icon: '📦',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER] // Business Admin has full access
    },
    {
      path: '/installations',
      label: 'Installations',
      icon: '🔌',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.TECHNICAL_OFFICER]
    },
    {
      path: '/billing',
      label: 'Billing',
      icon: '💰',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.CUSTOMER]
    },
    {
      path: '/invoices',
      label: 'Invoices',
      icon: '📄',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.CUSTOMER] // Business Admin has full access
    },
    {
      path: '/payments',
      label: 'Payments',
      icon: '💳',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.RECOVERY_OFFICER, ROLES.CUSTOMER]
    },
    {
      path: '/recoveries',
      label: 'Recoveries',
      icon: '🔍',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECOVERY_OFFICER] // Business Admin has full access
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: '📈',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER] // Business Admin has full access
    },
    {
      path: '/notifications',
      label: 'Notifications',
      icon: '🔔',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.TECHNICAL_OFFICER, ROLES.RECOVERY_OFFICER, ROLES.CUSTOMER]
    },
    {
      path: '/portal',
      label: 'My Portal',
      icon: '🏠',
      roles: [ROLES.CUSTOMER]
    },
    {
      path: '/users',
      label: 'Users',
      icon: '👤',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN]
    },
    {
      path: '/super-admin/dashboard',
      label: 'Super Admin Dashboard',
      icon: '👑',
      roles: [ROLES.SUPER_ADMIN] // Super Admin only
    },
    {
      path: '/super-admin/packages',
      label: 'SaaS Packages',
      icon: '📦',
      roles: [ROLES.SUPER_ADMIN] // Super Admin only
    },
    {
      path: '/super-admin/isps',
      label: 'Business Management',
      icon: '🏢',
      roles: [ROLES.SUPER_ADMIN] // Super Admin only - Business Admin manages their own business via Users
    },
    {
      path: '/roles',
      label: 'Roles & Permissions',
      icon: '🔐',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] // Business Admin can manage roles for their business
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: '⚙️',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTOMER] // Business Admin has full access
    },
    {
      path: '/activity-logs',
      label: 'Activity Logs',
      icon: '📋',
      roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] // Business Admin can view activity logs
    }
  ];

  const visibleMenuItems = menuItems.filter(item => 
    !user || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white shadow-md min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-100 text-primary-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

