import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_LABELS, ROLE_OPTIONS } from '../utils/constants';
import { formatDate } from '../utils/helpers';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isps, setIsps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    isp_id: currentUser?.isp_id || '',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
    if (currentUser?.role === ROLES.SUPER_ADMIN) {
      fetchISPs();
    }
  }, [roleFilter, currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const response = await apiClient.get('/users', { params });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(error.response?.data?.message || 'Error fetching users');
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
      // Don't show alert, just log error
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !search || 
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        isp_id: user.isp_id || currentUser?.isp_id || '',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'customer',
        isp_id: currentUser?.role === ROLES.SUPER_ADMIN ? '' : (currentUser?.isp_id || ''),
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'customer',
      isp_id: currentUser?.role === ROLES.SUPER_ADMIN ? '' : (currentUser?.isp_id || ''),
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        // Handle empty ISP ID
        if (updateData.isp_id === '' || updateData.isp_id === null) {
          updateData.isp_id = formData.role === ROLES.SUPER_ADMIN ? null : undefined;
        }
        await apiClient.put(`/users/${editingUser.id}`, updateData);
        alert('User updated successfully');
      } else {
        // Create user
        if (!formData.password) {
          alert('Password is required for new users');
          return;
        }
        const submitData = { ...formData };
        // Handle empty ISP ID - set to null for super_admin, remove for others if empty
        if (submitData.isp_id === '' || submitData.isp_id === null) {
          if (submitData.role === ROLES.SUPER_ADMIN) {
            submitData.isp_id = null;
          } else {
            delete submitData.isp_id; // Let backend use current user's ISP
          }
        }
        await apiClient.post('/users', submitData);
        alert('User created successfully');
      }
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg || 
                          'Error saving user';
      alert(errorMessage);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      await apiClient.delete(`/users/${userId}`);
      alert('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      [ROLES.SUPER_ADMIN]: 'bg-purple-100 text-purple-800',
      [ROLES.ADMIN]: 'bg-blue-100 text-blue-800', // Light blue for Business Admin
      [ROLES.ACCOUNT_MANAGER]: 'bg-green-100 text-green-800',
      [ROLES.TECHNICAL_OFFICER]: 'bg-yellow-100 text-yellow-800',
      [ROLES.RECOVERY_OFFICER]: 'bg-orange-100 text-orange-800', // Light orange matching screenshot
      [ROLES.CUSTOMER]: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Determine which roles can be created by current user
  const getAvailableRoles = () => {
    if (currentUser?.role === ROLES.SUPER_ADMIN) {
      return Object.values(ROLES);
    } else if (currentUser?.role === ROLES.ADMIN) {
      return [ROLES.ACCOUNT_MANAGER, ROLES.TECHNICAL_OFFICER, ROLES.RECOVERY_OFFICER, ROLES.CUSTOMER];
    }
    return [];
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        {(currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === ROLES.ADMIN) && (
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            + Add User
          </button>
        )}
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          {/* Checkbox for bulk selection (placeholder for future feature) */}
          <input
            type="checkbox"
            className="w-4 h-4 text-primary-600 rounded"
            disabled
            title="Bulk selection (coming soon)"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input flex-shrink-0"
            style={{ minWidth: '180px' }}
          >
            {ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={handleSearch}
            className="input flex-1"
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>ISP</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(user.role)}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>{user.isp?.name || 'No Business'}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                  <td>
                    <div className="flex gap-2">
                      {(currentUser?.role === ROLES.SUPER_ADMIN || 
                        (currentUser?.role === ROLES.ADMIN && user.isp_id === currentUser.isp_id)) && (
                        <>
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            Edit
                          </button>
                          {user.id !== currentUser?.id && user.role !== ROLES.SUPER_ADMIN && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Create User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                  placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({ 
                      ...formData, 
                      role: newRole,
                      // Clear ISP ID if changing to Super Admin
                      isp_id: newRole === ROLES.SUPER_ADMIN ? null : formData.isp_id
                    });
                  }}
                  className="input"
                  required
                  disabled={
                    // Only Super Admin and Admin can assign roles
                    (currentUser?.role !== ROLES.SUPER_ADMIN && currentUser?.role !== ROLES.ADMIN) ||
                    (editingUser && editingUser.role === ROLES.SUPER_ADMIN && currentUser?.role !== ROLES.SUPER_ADMIN)
                  }
                >
                  {getAvailableRoles().map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                {(currentUser?.role !== ROLES.SUPER_ADMIN && currentUser?.role !== ROLES.ADMIN) && (
                  <p className="text-xs text-red-600 mt-1">
                    Only Admin and Super Admin can assign roles
                  </p>
                )}
              </div>

              {currentUser?.role === ROLES.SUPER_ADMIN && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business {formData.role !== ROLES.SUPER_ADMIN && '*'}
                  </label>
                  <select
                    value={formData.isp_id || ''}
                    onChange={(e) => setFormData({ ...formData, isp_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="input"
                    required={formData.role !== ROLES.SUPER_ADMIN}
                    disabled={formData.role === ROLES.SUPER_ADMIN}
                  >
                    <option value="">{formData.role === ROLES.SUPER_ADMIN ? 'No Business (Super Admin)' : 'Select a Business'}</option>
                    {isps.map(isp => (
                      <option key={isp.id} value={isp.id}>
                        {isp.name} {isp.email ? `(${isp.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {formData.role === ROLES.SUPER_ADMIN && (
                    <p className="text-xs text-gray-500 mt-1">
                      Super Admin does not require a business assignment
                    </p>
                  )}
                  {isps.length === 0 && formData.role !== ROLES.SUPER_ADMIN && (
                    <p className="text-sm text-red-600 mt-1">
                      No businesses found. Please create a business first.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary flex-1"
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

export default Users;

