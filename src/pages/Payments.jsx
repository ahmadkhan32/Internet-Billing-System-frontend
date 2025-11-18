import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { formatCurrency, formatDate } from '../utils/helpers';
import { PAYMENT_METHOD_LABELS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchPayments();
  }, [methodFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/payments', {
        params: { method: methodFilter, limit: 20 }
      });
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Only show "Record Payment" button for admins/staff, not customers
  const canRecordPayment = user?.role && [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNT_MANAGER, ROLES.RECOVERY_OFFICER].includes(user.role);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Payments</h1>
        {canRecordPayment && (
          <Link to="/payments/new" className="btn btn-primary">
            + Record Payment
          </Link>
        )}
      </div>

      <div className="card mb-6">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="input"
        >
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="online">Online</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">EasyPaisa</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Receipt Number</th>
              <th>Customer</th>
              <th>Bill Number</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.receipt_number || 'N/A'}</td>
                  <td>{payment.customer?.name || 'N/A'}</td>
                  <td>{payment.bill?.bill_number || 'N/A'}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</td>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No payments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;

