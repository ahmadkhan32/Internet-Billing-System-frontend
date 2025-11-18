import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { ROLE_LABELS } from '../utils/constants';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { getCurrentBusiness, businesses, switchBusiness, isSuperAdmin } = useBusiness();
  const navigate = useNavigate();
  const currentBusiness = getCurrentBusiness();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBusinessChange = (e) => {
    const businessId = parseInt(e.target.value);
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      switchBusiness(business);
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-primary-600">
              Internet Billing System
            </Link>
            {currentBusiness && (
              <span className="ml-4 text-sm text-gray-600">
                | {currentBusiness.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <NotificationBell />
                {isSuperAdmin && businesses.length > 0 && (
                  <select
                    value={currentBusiness?.id || ''}
                    onChange={handleBusinessChange}
                    className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {businesses.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-sm text-gray-700">
                  {user.name} ({ROLE_LABELS[user.role]})
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary text-sm"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

