import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { BILL_STATUS_LABELS } from '../utils/constants';

const Billing = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Check if user can generate bills
  const canGenerateBills = user?.role === ROLES.SUPER_ADMIN || 
                          user?.role === ROLES.ADMIN || 
                          user?.role === ROLES.ACCOUNT_MANAGER;

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/bills', {
        params: { status: statusFilter, limit: 20 }
      });
      setBills(response.data.bills);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (billId) => {
    try {
      const response = await apiClient.get(`/bills/${billId}/invoice`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    }
  };

  if (loading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Billing</h1>
        {canGenerateBills && (
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                try {
                  await apiClient.post('/bills/auto-generate');
                  alert('Bills generated successfully!');
                  fetchBills();
                } catch (error) {
                  alert('Error generating bills: ' + (error.response?.data?.message || error.message));
                }
              }}
              className="btn btn-secondary"
            >
              Auto Generate Bills
            </button>
            <Link to="/billing/new" className="btn btn-primary">
              + Create Bill
            </Link>
          </div>
        )}
      </div>

      <div className="card mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Customer</th>
              <th>Package</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length > 0 ? (
              bills.map((bill) => (
                <tr key={bill.id}>
                  <td>{bill.bill_number}</td>
                  <td>{bill.customer?.name || 'N/A'}</td>
                  <td>{bill.package?.name || 'N/A'}</td>
                  <td>{formatCurrency(bill.amount)}</td>
                  <td>{formatDate(bill.due_date)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(bill.status)}`}>
                      {BILL_STATUS_LABELS[bill.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleGenerateInvoice(bill.id)}
                      className="text-primary-600 hover:text-primary-800 mr-2"
                    >
                      Invoice
                    </button>
                    <Link
                      to={`/bills/${bill.id}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No bills found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Billing;

