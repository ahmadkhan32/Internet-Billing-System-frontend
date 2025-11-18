import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const Permissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    resource: '',
    action: '',
    description: ''
  });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/permissions');
      setPermissions(response.data.permissions || []);
      setGroupedPermissions(response.data.grouped || {});
    } catch (error) {
      console.error('Error fetching permissions:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Error fetching permissions. Please check if you are logged in as Super Admin and if the database is properly initialized.';
      alert(errorMessage);
      setPermissions([]); // Set empty array on error
      setGroupedPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPermission) {
        await apiClient.put(`/permissions/${editingPermission.id}`, formData);
      } else {
        await apiClient.post('/permissions', formData);
      }
      setShowModal(false);
      setEditingPermission(null);
      setFormData({ name: '', display_name: '', resource: '', action: '', description: '' });
      fetchPermissions();
    } catch (error) {
      console.error('Error saving permission:', error);
      alert('Error saving permission');
    }
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      display_name: permission.display_name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) return;
    try {
      await apiClient.delete(`/permissions/${id}`);
      fetchPermissions();
    } catch (error) {
      console.error('Error deleting permission:', error);
      alert('Error deleting permission');
    }
  };

  const resources = ['users', 'customers', 'packages', 'bills', 'payments', 'recoveries', 'installations', 'reports', 'isps', 'roles', 'permissions', 'notifications', 'activity_logs'];
  const actions = ['read', 'create', 'update', 'delete', 'generate', 'approve', 'manage'];

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
        <h1 className="text-3xl font-bold text-gray-800">Permissions</h1>
        <button
          onClick={() => {
            setEditingPermission(null);
            setFormData({ name: '', display_name: '', resource: '', action: '', description: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Permission
        </button>
      </div>

      {/* Grouped View */}
      {Object.keys(groupedPermissions).length > 0 && (
        <div className="space-y-6 mb-8">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 capitalize">{resource}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perms.map((perm) => (
                  <div key={perm.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{perm.display_name}</h3>
                        <p className="text-xs text-gray-500">{perm.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(perm)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(perm.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded capitalize">
                        {perm.resource}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded capitalize">
                        {perm.action}
                      </span>
                    </div>
                    {perm.description && (
                      <p className="text-sm text-gray-600 mt-2">{perm.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingPermission ? 'Edit Permission' : 'Add Permission'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permission Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., create_bill"
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
                  placeholder="e.g., Create Bill"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                  <select
                    required
                    value={formData.resource}
                    onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Resource</option>
                    {resources.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    required
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Action</option>
                    {actions.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingPermission ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPermission(null);
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

export default Permissions;

