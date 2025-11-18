import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const Recoveries = () => {
  const { user: currentUser } = useAuth();
  const [recoveries, setRecoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingRecovery, setEditingRecovery] = useState(null);
  const [overdueBills, setOverdueBills] = useState([]);
  const [recoveryOfficers, setRecoveryOfficers] = useState([]);
  const [formData, setFormData] = useState({
    recovery_officer_id: '',
    customer_id: '',
    bill_id: '',
    remarks: ''
  });
  const [updateFormData, setUpdateFormData] = useState({
    status: 'assigned',
    visit_date: '',
    amount_collected: '',
    remarks: '',
    next_visit_date: ''
  });

  useEffect(() => {
    fetchRecoveries();
    // Super Admin and Admin can assign recoveries
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
      fetchOverdueBills();
      fetchRecoveryOfficers();
    }
  }, [statusFilter, currentUser]);

  const fetchRecoveries = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/recoveries', {
        params: { status: statusFilter, limit: 20 }
      });
      setRecoveries(response.data.recoveries || []);
    } catch (error) {
      console.error('Error fetching recoveries:', error);
      alert('Error fetching recoveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdueBills = async () => {
    try {
      const response = await apiClient.get('/recoveries/overdue');
      setOverdueBills(response.data.overdueBills || []);
      if (response.data.overdueBills?.length === 0) {
        console.log('No overdue bills found');
      }
    } catch (error) {
      console.error('Error fetching overdue bills:', error);
      setOverdueBills([]);
    }
  };

  const fetchRecoveryOfficers = async () => {
    try {
      const response = await apiClient.get('/users', {
        params: { role: 'recovery_officer' }
      });
      setRecoveryOfficers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching recovery officers:', error);
    }
  };

  const handleAssignRecovery = () => {
    setFormData({
      recovery_officer_id: '',
      customer_id: '',
      bill_id: '',
      remarks: ''
    });
    setShowModal(true);
  };

  const handleBillSelect = (billId) => {
    const bill = overdueBills.find(b => b.id === parseInt(billId));
    if (bill) {
      setFormData({
        ...formData,
        bill_id: bill.id,
        customer_id: bill.customer_id
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/recoveries', formData);
      alert('Recovery assigned successfully!');
      setShowModal(false);
      setFormData({
        recovery_officer_id: '',
        customer_id: '',
        bill_id: '',
        remarks: ''
      });
      fetchRecoveries();
      fetchOverdueBills();
    } catch (error) {
      console.error('Error assigning recovery:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.[0]?.msg || 
                           'Error assigning recovery';
      alert(errorMessage);
    }
  };

  const handleUpdate = (recovery) => {
    setEditingRecovery(recovery);
    setUpdateFormData({
      status: recovery.status || 'assigned',
      visit_date: recovery.visit_date ? recovery.visit_date.split('T')[0] : '',
      amount_collected: recovery.amount_collected || '',
      remarks: recovery.remarks || '',
      next_visit_date: recovery.next_visit_date ? recovery.next_visit_date.split('T')[0] : ''
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/recoveries/${editingRecovery.id}`, updateFormData);
      alert('Recovery updated successfully!');
      setShowUpdateModal(false);
      setEditingRecovery(null);
      fetchRecoveries();
    } catch (error) {
      console.error('Error updating recovery:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.[0]?.msg || 
                           'Error updating recovery';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recovery record?')) return;
    try {
      await apiClient.delete(`/recoveries/${id}`);
      alert('Recovery deleted successfully!');
      fetchRecoveries();
    } catch (error) {
      console.error('Error deleting recovery:', error);
      alert('Error deleting recovery');
    }
  };

  if (loading && recoveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canAssign = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canUpdate = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'recovery_officer';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Recoveries</h1>
        {canAssign && (
          <button 
            onClick={handleAssignRecovery}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Assign Recovery
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="assigned">Assigned</option>
          <option value="visited">Visited</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="not_available">Not Available</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recovery Officer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              {canUpdate && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recoveries.length > 0 ? (
              recoveries.map((recovery) => (
                <tr key={recovery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recovery.customer?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recovery.bill?.bill_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recovery.recoveryOfficer?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(recovery.amount_collected || recovery.bill?.amount || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(recovery.status)}`}>
                      {recovery.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recovery.visit_date ? formatDate(recovery.visit_date) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {recovery.remarks || 'N/A'}
                  </td>
                  {canUpdate && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(recovery)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Update
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(recovery.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canUpdate ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                  No recoveries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Recovery Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Assign Recovery</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recovery Officer *
                </label>
                <select
                  required
                  value={formData.recovery_officer_id}
                  onChange={(e) => setFormData({ ...formData, recovery_officer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Recovery Officer</option>
                  {recoveryOfficers.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.name} ({officer.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overdue Bill *
                </label>
                <select
                  required
                  value={formData.bill_id}
                  onChange={(e) => handleBillSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Bill</option>
                  {overdueBills.length === 0 ? (
                    <option value="" disabled>No overdue bills available</option>
                  ) : (
                    overdueBills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.bill_number} - {bill.customer?.name || 'N/A'} - {formatCurrency(bill.amount || 0)} (Due: {formatDate(bill.due_date)})
                      </option>
                    ))
                  )}
                </select>
                {overdueBills.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No overdue bills found. Bills must be pending, overdue, or partial with a past due date.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Assign
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Recovery Modal */}
      {showUpdateModal && editingRecovery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Update Recovery</h2>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  required
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="assigned">Assigned</option>
                  <option value="visited">Visited</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="not_available">Not Available</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Date
                </label>
                <input
                  type="date"
                  value={updateFormData.visit_date}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, visit_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Collected
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={updateFormData.amount_collected}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, amount_collected: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Visit Date
                </label>
                <input
                  type="date"
                  value={updateFormData.next_visit_date}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, next_visit_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={updateFormData.remarks}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setEditingRecovery(null);
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

export default Recoveries;

