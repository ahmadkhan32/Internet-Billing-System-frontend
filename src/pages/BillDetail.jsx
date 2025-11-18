import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { BILL_STATUS_LABELS, ROLES } from '../utils/constants';

const BillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillDetails();
  }, [id]);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/bills/${id}`);
      setBill(response.data.bill);

      // Fetch payments for this bill
      try {
        const paymentsResponse = await apiClient.get('/payments', {
          params: { bill_id: id }
        });
        setPayments(paymentsResponse.data.payments || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      alert(error.response?.data?.message || 'Error fetching bill details');
      navigate('/billing');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const response = await apiClient.get(`/bills/${id}/invoice`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${bill.bill_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    }
  };

  const canEdit = user?.role === ROLES.SUPER_ADMIN || 
                  user?.role === ROLES.ADMIN || 
                  user?.role === ROLES.ACCOUNT_MANAGER;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6">
        <div className="card text-center py-8">
          <p className="text-gray-500 mb-4">Bill not found</p>
          <Link to="/billing" className="btn btn-primary">
            Back to Billing
          </Link>
        </div>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  const remainingAmount = (bill.total_amount || bill.amount) - totalPaid;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/billing" className="text-primary-600 hover:text-primary-800 mb-2 inline-block">
            ← Back to Billing
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Bill Details</h1>
          <p className="text-gray-600 mt-1">Bill #{bill.bill_number || bill.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateInvoice}
            className="btn btn-secondary"
          >
            Download Invoice
          </button>
          {canEdit && (
            <Link
              to={`/billing/${id}/edit`}
              className="btn btn-primary"
            >
              Edit Bill
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Bill Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Bill Number</label>
                <p className="text-gray-900 font-semibold">{bill.bill_number || `BILL-${bill.id}`}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(bill.status)}`}>
                    {BILL_STATUS_LABELS[bill.status] || bill.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Customer</label>
                <p className="text-gray-900">
                  {bill.customer ? (
                    <Link to={`/customers/${bill.customer.id}`} className="text-primary-600 hover:text-primary-800">
                      {bill.customer.name}
                    </Link>
                  ) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Package</label>
                <p className="text-gray-900">{bill.package?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Billing Period</label>
                <p className="text-gray-900">
                  {bill.billing_period_start && bill.billing_period_end
                    ? `${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`
                    : formatDate(bill.billing_date || bill.createdAt)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Due Date</label>
                <p className="text-gray-900">{formatDate(bill.due_date)}</p>
              </div>
            </div>
          </div>

          {/* Bill Amounts */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Amount Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Base Amount</span>
                <span className="font-semibold">{formatCurrency(bill.amount)}</span>
              </div>
              {bill.late_fee > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Late Fee</span>
                  <span className="font-semibold text-red-600">{formatCurrency(bill.late_fee)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold text-lg">{formatCurrency(bill.total_amount || bill.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Paid Amount</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between py-2 pt-2">
                <span className="text-gray-900 font-bold">Remaining Amount</span>
                <span className={`font-bold text-lg ${
                  remainingAmount > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments History */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Payment History</h2>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.method || 'N/A'}</td>
                        <td>{payment.transaction_id || payment.reference_number || 'N/A'}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status || 'completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No payments recorded</p>
            )}
          </div>
        </div>

        {/* Sidebar - Quick Actions */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {bill.status !== 'paid' && (
                <Link
                  to={`/payments/new?bill_id=${bill.id}`}
                  className="btn btn-primary w-full"
                >
                  Record Payment
                </Link>
              )}
              <button
                onClick={handleGenerateInvoice}
                className="btn btn-secondary w-full"
              >
                Download Invoice PDF
              </button>
              {canEdit && (
                <Link
                  to={`/billing/${id}/edit`}
                  className="btn btn-secondary w-full"
                >
                  Edit Bill
                </Link>
              )}
            </div>
          </div>

          {/* Customer Info */}
          {bill.customer && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-gray-600">Name</label>
                  <p className="font-semibold">{bill.customer.name}</p>
                </div>
                {bill.customer.email && (
                  <div>
                    <label className="text-gray-600">Email</label>
                    <p>{bill.customer.email}</p>
                  </div>
                )}
                {bill.customer.phone && (
                  <div>
                    <label className="text-gray-600">Phone</label>
                    <p>{bill.customer.phone}</p>
                  </div>
                )}
                {bill.customer.address && (
                  <div>
                    <label className="text-gray-600">Address</label>
                    <p>{bill.customer.address}</p>
                  </div>
                )}
                <div className="pt-2">
                  <Link
                    to={`/customers/${bill.customer.id}`}
                    className="text-primary-600 hover:text-primary-800 text-sm"
                  >
                    View Full Customer Profile →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillDetail;

