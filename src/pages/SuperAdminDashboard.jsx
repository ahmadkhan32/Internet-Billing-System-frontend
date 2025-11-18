import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ROLES, ROLE_LABELS, ROLE_OPTIONS } from '../utils/constants';

const SuperAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isps, setIsps] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    isp_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchDashboard();
    fetchISPs();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/super-admin/dashboard');
      setDashboard(response.data.dashboard);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      alert('Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchISPs = async () => {
    try {
      const response = await apiClient.get('/isps');
      setIsps(response.data.isps || []);
    } catch (error) {
      console.error('Error fetching ISPs:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (!userFormData.password) {
        alert('Password is required');
        return;
      }

      const submitData = { ...userFormData };
      if (submitData.isp_id === '' || submitData.isp_id === null) {
        if (submitData.role === ROLES.SUPER_ADMIN) {
          submitData.isp_id = null;
        } else {
          alert('Please select a Business (ISP) for this user');
          return;
        }
      }

      const response = await apiClient.post('/users', submitData);
      
      // Show success with credentials
      const selectedISP = isps.find(isp => isp.id === parseInt(submitData.isp_id));
      const businessId = selectedISP?.business_id || 'N/A';
      
      alert(`User created successfully!\n\nEmail: ${userFormData.email}\nPassword: ${userFormData.password}\nBusiness ID: ${businessId}\n\nPlease save these credentials.`);
      
      setShowCreateUserModal(false);
      setUserFormData({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        isp_id: '',
        is_active: true
      });
      fetchDashboard(); // Refresh dashboard
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg || 
                          'Error creating user';
      alert(errorMessage);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="p-6">No data available</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
        <button
          onClick={() => setShowCreateUserModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>+</span> Create User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total ISPs</p>
              <p className="text-3xl font-bold text-gray-800">{dashboard.isps.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-green-600">Active: {dashboard.isps.active}</span>
            <span className="text-yellow-600">Pending: {dashboard.isps.pending}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Customers</p>
              <p className="text-3xl font-bold text-gray-800">{dashboard.customers.total}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(dashboard.revenue.monthly)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Annual: {formatCurrency(dashboard.revenue.annual)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Packages</p>
              <p className="text-3xl font-bold text-gray-800">{dashboard.packages.total}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Package Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">ISPs by Package</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(dashboard.packageStats || {}).map(([packageName, count]) => (
            <div key={packageName} className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-800">{packageName}</p>
              <p className="text-2xl font-bold text-blue-600">{count} ISPs</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent ISPs */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent ISPs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISP Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboard.recentISPs?.map((isp) => (
                <tr key={isp.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{isp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isp.saasPackage?.name || 'No Package'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      isp.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                      isp.subscription_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      isp.subscription_status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {isp.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(isp.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">{ROLE_LABELS[ROLES.ADMIN]}</option>
                  <option value="account_manager">{ROLE_LABELS[ROLES.ACCOUNT_MANAGER]}</option>
                  <option value="technical_officer">{ROLE_LABELS[ROLES.TECHNICAL_OFFICER]}</option>
                  <option value="recovery_officer">{ROLE_LABELS[ROLES.RECOVERY_OFFICER]}</option>
                  <option value="customer">{ROLE_LABELS[ROLES.CUSTOMER]}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business (ISP) *
                </label>
                <select
                  required={userFormData.role !== ROLES.SUPER_ADMIN}
                  value={userFormData.isp_id}
                  onChange={(e) => setUserFormData({ ...userFormData, isp_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={userFormData.role === ROLES.SUPER_ADMIN}
                >
                  <option value="">Select Business</option>
                  {isps.map((isp) => (
                    <option key={isp.id} value={isp.id}>
                      {isp.name} {isp.business_id ? `(${isp.business_id})` : ''}
                    </option>
                  ))}
                </select>
                {userFormData.role === 'admin' && userFormData.isp_id && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      <strong>Business ID:</strong>{' '}
                      <span className="font-mono font-semibold">
                        {isps.find(isp => isp.id === parseInt(userFormData.isp_id))?.business_id || 'N/A'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const businessId = isps.find(isp => isp.id === parseInt(userFormData.isp_id))?.business_id;
                          if (businessId) copyToClipboard(businessId);
                        }}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Copy
                      </button>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Business Admin can login with: Business ID + Email + Password
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={userFormData.is_active}
                  onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setUserFormData({
                      name: '',
                      email: '',
                      password: '',
                      role: 'admin',
                      isp_id: '',
                      is_active: true
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;

