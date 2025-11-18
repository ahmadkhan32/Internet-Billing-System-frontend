import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateTime } from '../utils/helpers';
import moment from 'moment';

const ActivityLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    action: '',
    entity_type: '',
    user_id: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchActivityLogs();
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      fetchUsers();
    }
  }, [filters]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
        ...(filters.action && { action: filters.action }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.user_id && { user_id: filters.user_id }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date })
      };

      const response = await apiClient.get('/activity-logs', { params });
      setLogs(response.data.logs || []);
      setPagination({
        total: response.data.total || 0,
        page: response.data.page || 1,
        pages: response.data.pages || 0
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      alert('Error fetching activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users', { params: { limit: 1000 } });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filter changes
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
      action: '',
      entity_type: '',
      user_id: '',
      start_date: '',
      end_date: ''
    });
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE') || action.includes('GENERATE')) {
      return 'bg-green-100 text-green-800';
    } else if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-blue-100 text-blue-800';
    } else if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-100 text-red-800';
    } else if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-purple-100 text-purple-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeIcon = (entityType) => {
    const icons = {
      'Customer': '👤',
      'Bill': '💰',
      'Payment': '💳',
      'Package': '📦',
      'Installation': '🔌',
      'User': '👨‍💼',
      'ISP': '🏢',
      'Recovery': '📋',
      'Notification': '🔔',
      'Invoice': '📄'
    };
    return icons[entityType] || '📝';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Activity Logs</h1>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Filters
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="input"
            >
              <option value="">All Actions</option>
              <option value="CREATE_CUSTOMER">Create Customer</option>
              <option value="UPDATE_CUSTOMER">Update Customer</option>
              <option value="DELETE_CUSTOMER">Delete Customer</option>
              <option value="CREATE_BILL">Create Bill</option>
              <option value="CREATE_PAYMENT">Create Payment</option>
              <option value="AUTO_GENERATE_INVOICE">Auto Generate Invoice</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              className="input"
            >
              <option value="">All Types</option>
              <option value="Customer">Customer</option>
              <option value="Bill">Bill</option>
              <option value="Payment">Payment</option>
              <option value="Package">Package</option>
              <option value="Installation">Installation</option>
              <option value="User">User</option>
              <option value="ISP">ISP</option>
            </select>
          </div>

          {(user?.role === 'super_admin' || user?.role === 'admin') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User
              </label>
              <select
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                className="input"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Page
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="input"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-x-auto">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {logs.length} of {pagination.total} logs
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>ISP/Business</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium">{formatDateTime(log.createdAt)}</div>
                      <div className="text-xs text-gray-500">{moment(log.createdAt).fromNow()}</div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">
                      <div className="font-medium">
                        {log.user?.name || log.user?.email || 'System'}
                      </div>
                      {log.user?.role && (
                        <div className="text-xs text-gray-500">{log.user.role}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getEntityTypeIcon(log.entity_type)}</span>
                      <div>
                        <div className="text-sm font-medium">{log.entity_type || 'N/A'}</div>
                        {log.entity_id && (
                          <div className="text-xs text-gray-500">ID: {log.entity_id}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs">
                    {log.details && typeof log.details === 'object' ? (
                      <div className="text-xs">
                        {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                        {Object.keys(log.details).length > 3 && (
                          <div className="text-gray-500">+{Object.keys(log.details).length - 3} more</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-600">{log.details || 'N/A'}</span>
                    )}
                  </td>
                  <td>
                    <div className="text-sm">
                      {log.isp?.name || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs text-gray-500 font-mono">
                      {log.ip_address || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No activity logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;

