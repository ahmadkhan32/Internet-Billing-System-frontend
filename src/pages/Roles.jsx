import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useBusiness } from '../context/BusinessContext';

const Roles = () => {
  const { getBusinessId, isSuperAdmin } = useBusiness();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permission_ids: []
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial load only - will re-fetch when business changes via manual refresh

  const fetchRoles = async () => {
    try {
      setLoading(true);
      // For super admin, no filter needed - they see all roles
      // For others, API automatically filters by their ISP
      const response = await apiClient.get('/roles');
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Error fetching roles. Please check if roles are initialized.';
      if (error.response?.status === 500 && errorMessage.includes('table does not exist')) {
        alert('Roles table not initialized. Please restart the backend server to initialize roles and permissions.');
      } else {
        alert(errorMessage);
      }
      setRoles([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await apiClient.get('/permissions');
      setPermissions(response.data.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      // System roles should have business_id as null
      // Custom roles can have business_id set (for ISP-specific roles)
      // For now, we'll let the backend handle business_id based on user's ISP
      // Only Super Admin can create system-wide roles (business_id: null)
      
      if (editingRole) {
        await apiClient.put(`/roles/${editingRole.id}`, submitData);
      } else {
        // For new roles, don't set business_id - let backend handle it
        // Super Admin can create system roles, others create ISP-specific roles
        await apiClient.post('/roles', submitData);
      }
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name: '', display_name: '', description: '', permission_ids: [] });
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      alert(error.response?.data?.message || 'Error saving role');
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permission_ids: role.permissions?.map(p => p.id) || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await apiClient.delete(`/roles/${id}`);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Error deleting role');
    }
  };

  const togglePermission = (permissionId) => {
    setFormData(prev => {
      const ids = prev.permission_ids || [];
      if (ids.includes(permissionId)) {
        return { ...prev, permission_ids: ids.filter(id => id !== permissionId) };
      } else {
        return { ...prev, permission_ids: [...ids, permissionId] };
      }
    });
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (perm && perm.resource) {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
    }
    return acc;
  }, {});

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
        <h1 className="text-3xl font-bold text-gray-800">Roles & Permissions</h1>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                // Try to initialize roles if they don't exist
                const response = await apiClient.post('/roles/initialize');
                if (response.data.success) {
                  alert('Roles and permissions initialized successfully!');
                }
              } catch (error) {
                console.error('Error initializing:', error);
                // If endpoint doesn't exist, just refresh
              }
              fetchRoles();
              fetchPermissions();
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            title="Initialize/Refresh roles and permissions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Initialize/Refresh
          </button>
          <button
            onClick={() => {
              fetchRoles();
              fetchPermissions();
            }}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2"
            title="Refresh roles and permissions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingRole(null);
              setFormData({ name: '', display_name: '', description: '', permission_ids: [] });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Role
          </button>
        </div>
      </div>

      {roles.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800">No Roles Found</h3>
              <p className="text-yellow-700 mt-1">
                {permissions.length === 0 
                  ? 'Roles and permissions are not initialized. Click "Initialize/Refresh" button to initialize default roles and permissions.'
                  : 'No roles have been created yet. Default system roles should be initialized automatically. Click "Initialize/Refresh" to initialize them, or click "Add Role" to create a custom role.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{role.display_name}</h3>
                <p className="text-sm text-gray-500">{role.name}</p>
                {role.business && (
                  <p className="text-xs text-gray-400 mt-1">Business: {role.business.name}</p>
                )}
                {!role.business && role.is_system_role && (
                  <p className="text-xs text-gray-400 mt-1">System Role</p>
                )}
              </div>
              {role.is_system_role && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">System</span>
              )}
            </div>
            {role.description && (
              <p className="text-gray-600 text-sm mb-4">{role.description}</p>
            )}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Permissions ({role.permissions?.length || 0})
              </p>
              {role.permissions && role.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 5).map((perm) => (
                    <span key={perm.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {perm.display_name}
                    </span>
                  ))}
                  {role.permissions.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{role.permissions.length - 5} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No permissions assigned</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(role)}
                className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200"
              >
                Edit
              </button>
              {!role.is_system_role && (
                <button
                  onClick={() => handleDelete(role.id)}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingRole ? 'Edit Role' : 'Add Role'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., custom_role"
                    disabled={editingRole?.is_system_role}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Custom Role"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions ({formData.permission_ids?.length || 0} selected)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <div key={resource} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 capitalize">{resource}</h4>
                        <span className="text-xs text-gray-500">
                          {perms.filter(p => formData.permission_ids?.includes(p.id)).length} / {perms.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {perms.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded border border-gray-200 bg-white transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permission_ids?.includes(perm.id) || false}
                              onChange={() => togglePermission(perm.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700 flex-1">{perm.display_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupedPermissions).length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">No permissions available</p>
                      <p className="text-xs text-gray-400">
                        Permissions are being initialized. Please refresh the page.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Select all permissions
                      const allIds = permissions.map(p => p.id);
                      setFormData({ ...formData, permission_ids: allIds });
                    }}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Deselect all permissions
                      setFormData({ ...formData, permission_ids: [] });
                    }}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingRole ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRole(null);
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

export default Roles;

