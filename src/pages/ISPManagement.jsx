import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { ROLES, ROLE_LABELS } from '../utils/constants';

// Note: This page manages ISPs (Businesses). Terminology updated to "Business" in UI.
import { formatCurrency, formatDate } from '../utils/helpers';

const ISPManagement = () => {
  const [isps, setISPs] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedISP, setSelectedISP] = useState(null);
  const [editingISP, setEditingISP] = useState(null);
  const [subscribeData, setSubscribeData] = useState({
    package_id: '',
    start_date: '',
    end_date: ''
  });
  const [createData, setCreateData] = useState({
    name: '',
    owner_name: '',
    email: '',
    password: '',
    contact: '',
    address: '',
    status: 'pending',
    saas_package_id: ''
  });
  const [additionalUsers, setAdditionalUsers] = useState([]);
  const [createdBusiness, setCreatedBusiness] = useState(null);

  useEffect(() => {
    fetchISPs();
    fetchPackages();
  }, []);

  const fetchISPs = async () => {
    try {
      const response = await apiClient.get('/super-admin/isps');
      setISPs(response.data.isps || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      alert('Error fetching businesses');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await apiClient.get('/saas-packages', {
        params: { status: 'active' }
      });
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const handleSubscribe = (isp) => {
    setSelectedISP(isp);
    setSubscribeData({
      package_id: isp.saas_package_id || '',
      start_date: isp.subscription_start_date ? isp.subscription_start_date.split('T')[0] : '',
      end_date: isp.subscription_end_date ? isp.subscription_end_date.split('T')[0] : ''
    });
    setShowSubscribeModal(true);
  };

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/super-admin/isps/${selectedISP.id}/subscribe`, subscribeData);
      alert('Business subscribed successfully!');
      setShowSubscribeModal(false);
      setSelectedISP(null);
      fetchISPs();
    } catch (error) {
      console.error('Error subscribing business:', error);
      alert('Error subscribing business');
    }
  };

  const handleStatusUpdate = async (ispId, status) => {
    try {
      await apiClient.put(`/super-admin/isps/${ispId}/status`, { status });
      alert('Business status updated successfully!');
      fetchISPs();
    } catch (error) {
      console.error('Error updating business status:', error);
      alert(error.response?.data?.message || 'Error updating business status');
    }
  };

  const handleDownloadSRS = async (ispId, businessId) => {
    try {
      const response = await apiClient.get(`/super-admin/isps/${ispId}/srs`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SRS-${businessId}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      alert('SRS file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading SRS:', error);
      alert(error.response?.data?.message || 'Error downloading SRS file. It may not have been generated yet.');
    }
  };

  const handleDelete = async (ispId, businessName) => {
    const confirmMessage = `⚠️ WARNING: This will PERMANENTLY DELETE "${businessName}" from the database!\n\n` +
      `This action cannot be undone. All related data will be permanently removed:\n` +
      `- All customers\n` +
      `- All bills\n` +
      `- All payments\n` +
      `- All users\n` +
      `- SRS files and directory structure\n\n` +
      `Are you absolutely sure you want to proceed?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation
    if (!window.confirm(`Final confirmation: Permanently delete "${businessName}"?\n\nThis action is IRREVERSIBLE!`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/super-admin/isps/${ispId}`);
      const deletedData = response.data.deleted_data;
      const summary = `Business "${businessName}" has been permanently deleted.\n\n` +
        `Deleted:\n` +
        `- ${deletedData?.customers || 0} customers\n` +
        `- ${deletedData?.bills || 0} bills\n` +
        `- ${deletedData?.payments || 0} payments\n` +
        `- ${deletedData?.users || 0} users\n` +
        `- All files and directories`;
      alert(summary);
      fetchISPs();
    } catch (error) {
      console.error('Error deleting business:', error);
      alert(error.response?.data?.message || 'Error deleting business. Please try again.');
    }
  };

  const handleEdit = (isp) => {
    setEditingISP(isp);
    setCreateData({
      name: isp.name || '',
      owner_name: isp.name || '',
      email: isp.email || '',
      password: '', // Don't pre-fill password
      contact: isp.contact || '',
      address: isp.address || '',
      status: isp.subscription_status || 'pending',
      saas_package_id: isp.saas_package_id || ''
    });
    setAdditionalUsers([]); // Clear additional users for edit
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingISP) return;

    try {
      const updateData = {
        name: createData.name,
        owner_name: createData.owner_name,
        email: createData.email,
        contact: createData.contact,
        address: createData.address,
        status: createData.status,
        saas_package_id: createData.saas_package_id || null
      };

      // Only include password if it was provided
      if (createData.password && createData.password.trim()) {
        updateData.password = createData.password;
      }

      await apiClient.put(`/super-admin/isps/${editingISP.id}`, updateData);
      alert('Business updated successfully!');
      setShowEditModal(false);
      setEditingISP(null);
      setCreateData({
        name: '',
        owner_name: '',
        email: '',
        password: '',
        contact: '',
        address: '',
        status: 'pending',
        saas_package_id: ''
      });
      fetchISPs();
    } catch (error) {
      console.error('Error updating business:', error);
      alert(error.response?.data?.message || 'Error updating business');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingISP(null);
    setCreateData({
      name: '',
      owner_name: '',
      email: '',
      password: '',
      contact: '',
      address: '',
      status: 'pending',
      saas_package_id: ''
    });
    setAdditionalUsers([]);
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    try {
      // Include additional users in the request
      const requestData = {
        ...createData,
        additional_users: additionalUsers
      };
      
      const response = await apiClient.post('/super-admin/isps', requestData);
      // Store created business info to show credentials
      setCreatedBusiness({
        business_id: response.data.business?.business_id,
        business_name: response.data.business?.business_name,
        email: response.data.admin_user?.email,
        password: response.data.admin_user?.password,
        note: response.data.admin_user?.note,
        additional_users: response.data.additional_users || []
      });
      // Don't close modal yet - show credentials first
      // setShowCreateModal(false);
      setCreateData({
        name: '',
        owner_name: '',
        email: '',
        password: '',
        contact: '',
        address: '',
        status: 'pending',
        saas_package_id: ''
      });
      setAdditionalUsers([]);
      fetchISPs();
    } catch (error) {
      console.error('Error creating business:', error);
      alert(error.response?.data?.message || 'Error creating business');
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreatedBusiness(null);
    setCreateData({
      name: '',
      owner_name: '',
      email: '',
      password: '',
      contact: '',
      address: '',
      status: 'pending',
      saas_package_id: ''
    });
    setAdditionalUsers([]);
  };

  const addAdditionalUser = () => {
    setAdditionalUsers([...additionalUsers, {
      name: '',
      email: '',
      password: '',
      role: 'account_manager'
    }]);
  };

  const removeAdditionalUser = (index) => {
    setAdditionalUsers(additionalUsers.filter((_, i) => i !== index));
  };

  const updateAdditionalUser = (index, field, value) => {
    const updated = [...additionalUsers];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalUsers(updated);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Business Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create Business
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isps.map((isp) => (
              <tr key={isp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      {isp.business_id || 'N/A'}
                    </span>
                    {isp.business_id && (
                      <button
                        onClick={() => copyToClipboard(isp.business_id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        title="Copy Business ID"
                      >
                        📋
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{isp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{isp.email || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {isp.saasPackage?.name || 'No Package'}
                  {isp.saasPackage && (
                    <span className="text-xs text-gray-500 block">
                      {formatCurrency(isp.saasPackage.price)}/mo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {isp.customer_count || 0}
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
                  {isp.subscription_start_date ? formatDate(isp.subscription_start_date) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {isp.subscription_end_date ? formatDate(isp.subscription_end_date) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => handleSubscribe(isp)}
                      className="text-blue-600 hover:text-blue-900 px-2 py-1"
                      title="Subscribe to Package"
                    >
                      Subscribe
                    </button>
                    <button
                      onClick={() => handleEdit(isp)}
                      className="text-blue-600 hover:text-blue-900 px-2 py-1"
                      title="Edit Business"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDownloadSRS(isp.id, isp.business_id)}
                      className="text-green-600 hover:text-green-900 px-2 py-1"
                      title="Download SRS File"
                    >
                      📄 SRS
                    </button>
                    <button
                      onClick={() => handleDelete(isp.id, isp.name)}
                      className="text-red-600 hover:text-red-900 px-2 py-1"
                      title="Delete Business"
                    >
                      🗑️ Delete
                    </button>
                    <select
                      value={isp.subscription_status}
                      onChange={(e) => handleStatusUpdate(isp.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspend</option>
                      <option value="cancelled">Cancel</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedISP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Subscribe Business to Package</h2>
            <form onSubmit={handleSubscribeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business: {selectedISP.name}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SaaS Package *
                </label>
                <select
                  required
                  value={subscribeData.package_id}
                  onChange={(e) => setSubscribeData({ ...subscribeData, package_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {formatCurrency(pkg.price)}/mo
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={subscribeData.start_date}
                    onChange={(e) => setSubscribeData({ ...subscribeData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={subscribeData.end_date}
                    onChange={(e) => setSubscribeData({ ...subscribeData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Subscribe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscribeModal(false);
                    setSelectedISP(null);
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

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {!createdBusiness ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Create New Business</h2>
                <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TechWave Internet Services"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={createData.owner_name}
                  onChange={(e) => setCreateData({ ...createData, owner_name: e.target.value })}
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
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@techwave.com"
                />
                <p className="text-xs text-gray-500 mt-1">This will be used as Business Admin login email</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Admin Password *
                </label>
                <input
                  type="password"
                  required
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password for Business Admin"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters. This will be the Business Admin login password.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={createData.contact}
                  onChange={(e) => setCreateData({ ...createData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={createData.address}
                  onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Business address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={createData.status}
                  onChange={(e) => setCreateData({ ...createData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SaaS Package (Optional)
                </label>
                <select
                  value={createData.saas_package_id}
                  onChange={(e) => setCreateData({ ...createData, saas_package_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Package (Optional)</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {formatCurrency(pkg.price)}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Users Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Additional Team Members (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={addAdditionalUser}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    + Add User
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Create additional users with specific roles (Account Manager, Technical Officer, etc.)
                </p>
                
                {additionalUsers.map((user, index) => (
                  <div key={index} className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">User {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeAdditionalUser(index)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={user.name}
                          onChange={(e) => updateAdditionalUser(index, 'name', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={user.email}
                          onChange={(e) => updateAdditionalUser(index, 'email', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={user.password}
                          onChange={(e) => updateAdditionalUser(index, 'password', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter password"
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Role *
                        </label>
                        <select
                          required
                          value={user.role}
                          onChange={(e) => updateAdditionalUser(index, 'role', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="account_manager">{ROLE_LABELS[ROLES.ACCOUNT_MANAGER]}</option>
                          <option value="technical_officer">{ROLE_LABELS[ROLES.TECHNICAL_OFFICER]}</option>
                          <option value="recovery_officer">{ROLE_LABELS[ROLES.RECOVERY_OFFICER]}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Business
                </button>
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Business Created Successfully!</h2>
                  <p className="text-gray-600 mb-6">Save these credentials for Business Admin login</p>
                </div>

                {/* Business ID Card */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">Business ID</label>
                    <button
                      onClick={() => copyToClipboard(createdBusiness.business_id)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-medium transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="font-mono text-xl font-bold text-blue-800 bg-white px-4 py-3 rounded-lg border-2 border-blue-400 shadow-inner text-center">
                    {createdBusiness.business_id}
                  </div>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    ⚠️ Save this Business ID! Required for Business Admin login with enhanced security.
                  </p>
                </div>

                {/* Business Admin Login Credentials Card */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 shadow-sm">
                  <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wide">Business Admin Login Credentials</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">📧 Email</label>
                        <button
                          onClick={() => copyToClipboard(createdBusiness.email)}
                          className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 font-medium transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="font-mono text-base font-semibold bg-white px-4 py-2.5 rounded-lg border-2 border-gray-400 shadow-inner">
                        {createdBusiness.email}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">🔑 Password</label>
                        <button
                          onClick={() => copyToClipboard(createdBusiness.password)}
                          className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 font-medium transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="font-mono text-base font-semibold bg-white px-4 py-2.5 rounded-lg border-2 border-gray-400 shadow-inner">
                        {createdBusiness.password}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
                    <p className="text-sm text-yellow-900 font-semibold">
                      <strong>⚠️ Important:</strong> {createdBusiness.note || 'Please change password after first login.'}
                    </p>
                  </div>
                </div>

                {/* Additional Users Credentials */}
                {createdBusiness.additional_users && createdBusiness.additional_users.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4 shadow-sm">
                    <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wide">Team Members Login Credentials</h3>
                    <div className="space-y-4">
                      {createdBusiness.additional_users.map((user, index) => (
                        <div key={index} className="bg-white border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-800">
                              {user.name} - {ROLE_LABELS[user.role] || user.role}
                            </h4>
                            <button
                              onClick={() => {
                                const credentials = `Name: ${user.name}\nEmail: ${user.email}\nPassword: ${user.password}\nRole: ${ROLE_LABELS[user.role] || user.role}`;
                                copyToClipboard(credentials);
                              }}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Email:</span>
                              <span className="ml-2 font-mono font-semibold text-purple-800">{user.email}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Password:</span>
                              <span className="ml-2 font-mono font-semibold text-purple-800">{user.password}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Role:</span>
                              <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs font-semibold">
                                {ROLE_LABELS[user.role] || user.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Login Instructions */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">📋 How to Login as Business Admin:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-green-700">1.</span>
                      <span className="text-sm text-gray-700">Navigate to the <strong>Login page</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-green-700">2.</span>
                      <span className="text-sm text-gray-700">
                        Enter <strong>Email:</strong> <span className="font-mono font-semibold text-green-800 bg-white px-2 py-1 rounded border border-green-300">{createdBusiness.email}</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-green-700">3.</span>
                      <span className="text-sm text-gray-700">
                        Enter <strong>Password:</strong> <span className="font-mono font-semibold text-green-800 bg-white px-2 py-1 rounded border border-green-300">{createdBusiness.password}</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-green-700">4.</span>
                      <span className="text-sm text-gray-700">
                        <strong>Optionally</strong> enter <strong>Business ID:</strong> <span className="font-mono font-semibold text-green-800 bg-white px-2 py-1 rounded border border-green-300">{createdBusiness.business_id}</span> (for enhanced security)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-green-700">5.</span>
                      <span className="text-sm text-gray-700">Click <strong>Login</strong> button</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-green-200 border border-green-400 rounded">
                    <p className="text-xs text-green-900 font-semibold">
                      💡 <strong>Tip:</strong> Using Business ID + Email + Password provides enhanced security for Business Admin login.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleCloseCreateModal}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-colors"
                  >
                    ✓ Done
                  </button>
                  <button
                    onClick={() => {
                      let credentials = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUSINESS ADMIN LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Business Name: ${createdBusiness.business_name}
Business ID: ${createdBusiness.business_id}
Email: ${createdBusiness.email}
Password: ${createdBusiness.password}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to Login page
2. Enter Email: ${createdBusiness.email}
3. Enter Password: ${createdBusiness.password}
4. Optionally enter Business ID: ${createdBusiness.business_id}
5. Click Login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                      if (createdBusiness.additional_users && createdBusiness.additional_users.length > 0) {
                        credentials += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEAM MEMBERS LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                        createdBusiness.additional_users.forEach((user, index) => {
                          credentials += `${index + 1}. ${user.name} (${ROLE_LABELS[user.role] || user.role})
   Email: ${user.email}
   Password: ${user.password}
   Role: ${ROLE_LABELS[user.role] || user.role}\n\n`;
                        });
                      }

                      credentials += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT: Please change password after first login!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                      copyToClipboard(credentials);
                    }}
                    className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-semibold shadow-md transition-colors"
                  >
                    📋 Copy All Credentials
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {showEditModal && editingISP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Edit Business</h2>
            <p className="text-sm text-gray-600 mb-4">Business ID: <span className="font-mono font-bold text-blue-700">{editingISP.business_id}</span></p>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TechWave Internet Services"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={createData.owner_name}
                  onChange={(e) => setCreateData({ ...createData, owner_name: e.target.value })}
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
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@techwave.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Admin Password (Optional)
                </label>
                <input
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty to keep current password"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep current password. Minimum 6 characters if changing.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={createData.contact}
                  onChange={(e) => setCreateData({ ...createData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={createData.address}
                  onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Business address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={createData.status}
                  onChange={(e) => setCreateData({ ...createData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SaaS Package (Optional)
                </label>
                <select
                  value={createData.saas_package_id}
                  onChange={(e) => setCreateData({ ...createData, saas_package_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {formatCurrency(pkg.price)}/mo
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Update Business
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
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

export default ISPManagement;

