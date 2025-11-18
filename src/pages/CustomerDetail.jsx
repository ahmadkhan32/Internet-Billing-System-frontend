import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';
import { CUSTOMER_STATUS_LABELS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const CustomerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/customers/${id}`);
      setCustomer(response.data.customer);
      
      // Fetch bills for this customer
      try {
        const billsResponse = await apiClient.get('/bills', {
          params: { customer_id: id, limit: 10 }
        });
        setBills(billsResponse.data.bills || []);
      } catch (error) {
        console.error('Error fetching bills:', error);
      }

      // Fetch payments for this customer (filter by bill's customer_id)
      try {
        const paymentsResponse = await apiClient.get('/payments', {
          params: { limit: 100 }
        });
        // Filter payments by customer_id on frontend since API might not support it
        const customerPayments = (paymentsResponse.data.payments || []).filter(
          payment => payment.customer_id === parseInt(id)
        );
        setPayments(customerPayments.slice(0, 10));
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      alert('Error loading customer details');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/customers/${id}`);
      alert('Customer deleted successfully!');
      navigate('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting customer';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Customer not found</p>
        <Link to="/customers" className="text-primary-600 hover:text-primary-800">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  const canEdit = user?.role === 'admin' || user?.role === 'account_manager';
  const canDelete = user?.role === 'admin';

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Customers
        </button>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">{customer.name}</h1>
          <div className="flex gap-2">
            {canEdit && (
              <Link
                to={`/customers/${id}/edit`}
                className="btn btn-primary"
              >
                Edit Customer
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete Customer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-800">{customer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-800">{customer.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-800">{customer.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">CNIC</label>
                <p className="text-gray-800">{customer.cnic || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-gray-800">{customer.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(customer.status)}`}>
                  {CUSTOMER_STATUS_LABELS[customer.status]}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Connection Date</label>
                <p className="text-gray-800">{formatDate(customer.connection_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Package</label>
                <p className="text-gray-800">
                  {customer.package ? (
                    <>
                      {customer.package.name} - {customer.package.speed} ({formatCurrency(customer.package.price)})
                    </>
                  ) : (
                    'No package assigned'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Billing Cycle</label>
                <p className="text-gray-800">{customer.billing_cycle || 1} month(s)</p>
              </div>
            </div>
          </div>

          {/* Recent Bills */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Bills</h2>
              <Link to="/billing" className="text-primary-600 hover:text-primary-800 text-sm">
                View All →
              </Link>
            </div>
            {bills.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id}>
                        <td>{bill.bill_number}</td>
                        <td>{formatCurrency(bill.amount)}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                            bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            bill.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>{formatDate(bill.due_date)}</td>
                        <td>
                          <Link
                            to={`/billing/${bill.id}`}
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No bills found</p>
            )}
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Payments</h2>
              <Link to="/payments" className="text-primary-600 hover:text-primary-800 text-sm">
                View All →
              </Link>
            </div>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Receipt Number</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.receipt_number}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.method}</td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No payments found</p>
            )}
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {canEdit && (
                <>
                  <Link
                    to={`/billing/new?customer_id=${id}`}
                    className="block w-full btn btn-primary text-center"
                  >
                    Generate Bill
                  </Link>
                  <Link
                    to={`/payments/new?customer_id=${id}`}
                    className="block w-full btn btn-secondary text-center"
                  >
                    Record Payment
                  </Link>
                </>
              )}
              <Link
                to={`/installations/new?customer_id=${id}`}
                className="block w-full btn btn-secondary text-center"
              >
                New Installation
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Statistics</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Total Bills</label>
                <p className="text-2xl font-bold text-gray-800">{bills.length}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Total Payments</label>
                <p className="text-2xl font-bold text-gray-800">{payments.length}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Outstanding Amount</label>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    bills
                      .filter(b => b.status !== 'paid')
                      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;

