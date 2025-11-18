import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/helpers';
import moment from 'moment';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Only initialize Stripe if publishable key is configured
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey && stripeKey.trim() !== '' 
  ? loadStripe(stripeKey) 
  : null;

// PaymentModal without Stripe (for when Stripe is not configured)
const PaymentModalWithoutStripe = ({ bill, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      let response;

      if (paymentMethod === 'cash') {
        response = await apiClient.post('/payments', {
          bill_id: bill.id,
          amount: parseFloat(bill.total_amount || bill.amount),
          method: 'cash',
          notes: notes || 'Cash payment recorded by customer'
        });
      } else if (paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') {
        if (!transactionId.trim()) {
          alert('Please enter transaction ID');
          setProcessing(false);
          return;
        }
        response = await apiClient.post('/payments', {
          bill_id: bill.id,
          amount: parseFloat(bill.total_amount || bill.amount),
          method: paymentMethod,
          transaction_id: transactionId,
          notes: notes || `Payment via ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}`
        });
      } else {
        // Bank transfer or other methods
        response = await apiClient.post('/payments', {
          bill_id: bill.id,
          amount: parseFloat(bill.total_amount || bill.amount),
          method: paymentMethod,
          transaction_id: transactionId || undefined,
          notes: notes
        });
      }

      if (response.data.success) {
        alert('Payment recorded successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.message || 'Payment failed. Please try again.';
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Pay Bill</h2>
        <p className="text-gray-600 mb-4">
          Bill: {bill.bill_number} - Amount: {formatCurrency(bill.total_amount || bill.amount)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="cash">Cash</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'Bank'} transaction ID`}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="Additional payment notes..."
            />
          </div>

          {paymentMethod === 'cash' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Cash payments will be recorded in the system. Please ensure you have made the payment to the authorized representative.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Submit Payment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PaymentModal with Stripe support
const PaymentModalWithStripe = ({ bill, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      let response;

      if (paymentMethod === 'cash') {
        // Record cash payment
        response = await apiClient.post('/payments', {
          bill_id: bill.id,
          amount: parseFloat(bill.total_amount || bill.amount),
          method: 'cash',
          notes: notes || 'Cash payment recorded by customer'
        });
      } else if (paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') {
        // Record mobile wallet payment
        if (!transactionId.trim()) {
          alert('Please enter transaction ID');
          setProcessing(false);
          return;
        }
        response = await apiClient.post('/payments', {
          bill_id: bill.id,
          amount: parseFloat(bill.total_amount || bill.amount),
          method: paymentMethod,
          transaction_id: transactionId,
          notes: notes || `Payment via ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}`
        });
      } else if (paymentMethod === 'stripe' || paymentMethod === 'card') {
        // Process Stripe payment
        if (!stripePromise || !stripe || !elements) {
          alert('Stripe is not configured. Please use another payment method (Cash, Bank Transfer, etc.).');
          setProcessing(false);
          return;
        }

    try {
      const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            alert('Card element not found. Please try again.');
            setProcessing(false);
            return;
          }

          const { error, paymentMethod: stripePaymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        alert(error.message);
        setProcessing(false);
        return;
      }

          response = await apiClient.post('/payments/online', {
        bill_id: bill.id,
            payment_method_id: stripePaymentMethod.id,
        amount: parseFloat(bill.total_amount || bill.amount)
      });
        } catch (stripeError) {
          alert('Stripe payment error. Please use another payment method.');
          setProcessing(false);
          return;
        }
      } else {
        // Bank transfer or other methods
        response = await apiClient.post('/payments', {
          bill_id: bill.id,
          amount: parseFloat(bill.total_amount || bill.amount),
          method: paymentMethod,
          transaction_id: transactionId || undefined,
          notes: notes
        });
      }

      if (response.data.success) {
        alert('Payment recorded successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.message || 'Payment failed. Please try again.';
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Pay Bill</h2>
        <p className="text-gray-600 mb-4">
          Bill: {bill.bill_number} - Amount: {formatCurrency(bill.total_amount || bill.amount)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="cash">Cash</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Credit/Debit Card (Stripe)</option>
            </select>
          </div>

          {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'Bank'} transaction ID`}
                required
              />
            </div>
          )}

          {(paymentMethod === 'card' || paymentMethod === 'stripe') && (
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
            <div className="border border-gray-300 rounded-lg p-3">
                {stripePromise && stripe && elements ? (
              <CardElement />
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 text-sm">
                      <strong>Stripe is not configured.</strong> Please select another payment method (Cash, JazzCash, EasyPaisa, or Bank Transfer).
                    </p>
                  </div>
                )}
            </div>
          </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="Additional payment notes..."
            />
          </div>

          {paymentMethod === 'cash' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Cash payments will be recorded in the system. Please ensure you have made the payment to the authorized representative.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={processing || ((paymentMethod === 'card' || paymentMethod === 'stripe') && (!stripePromise || !stripe || !elements))}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Submit Payment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main PaymentModal component - conditionally renders with or without Stripe
const PaymentModal = ({ bill, onClose, onSuccess }) => {
  if (stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <PaymentModalWithStripe bill={bill} onClose={onClose} onSuccess={onSuccess} />
      </Elements>
    );
  }
  return <PaymentModalWithoutStripe bill={bill} onClose={onClose} onSuccess={onSuccess} />;
};

const UserPortal = () => {
  const [bills, setBills] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      // Fetch customer info with total outstanding amount
      try {
        const customerResponse = await apiClient.get('/customers/me');
        setCustomer(customerResponse.data.customer);
      } catch (error) {
        console.error('Error fetching customer info:', error);
        // Fallback: try to get customer from bills
      }

      // Fetch customer bills
      const billsResponse = await apiClient.get('/bills', { params: { limit: 100 } });
      setBills(billsResponse.data.bills || []);

      // Fetch payment history
      try {
        const paymentsResponse = await apiClient.get('/payments/my-payments', { params: { limit: 50 } });
        setPayments(paymentsResponse.data.payments || []);
      } catch (error) {
        console.error('Error fetching payment history:', error);
      }

      // If customer not set yet, use first bill's customer info as fallback
      if (!customer && billsResponse.data.bills && billsResponse.data.bills.length > 0) {
        setCustomer(billsResponse.data.bills[0].customer);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const downloadInvoice = async (billId) => {
    try {
      const response = await apiClient.get(`/bills/${billId}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Error downloading invoice');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if no customer data found (for non-customer users or customers without records)
  if (!customer && bills.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Customer Portal</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Customer Data Found</h2>
          <p className="text-yellow-700">
            {bills.length === 0 
              ? "You don't have any bills yet. Please contact your ISP administrator to set up your account."
              : "Unable to load customer information. Please contact support if you believe this is an error."}
          </p>
        </div>
      </div>
    );
  }

  const dataUsage = customer?.data_usage || 0;
  const dataLimit = customer?.data_limit || customer?.package?.data_limit || null;
  const remainingData = dataLimit ? Math.max(0, dataLimit - dataUsage) : null;
  const percentageUsed = dataLimit ? (dataUsage / dataLimit) * 100 : 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Customer Portal</h1>

      {/* Customer Info Card */}
      {customer && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-semibold">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold">{customer.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-semibold">{customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Package</p>
              <p className="font-semibold">
                {customer.package?.name || 'N/A'} 
                {customer.package?.speed && ` - ${customer.package.speed} Mbps`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="font-semibold text-red-600 text-lg">
                {formatCurrency(customer.totalOutstanding || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  customer.status === 'active' ? 'bg-green-100 text-green-800' :
                  customer.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  customer.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {customer.status?.toUpperCase() || 'N/A'}
                </span>
              </p>
            </div>
          </div>

          {/* Data Usage */}
          {dataLimit && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-700">Data Usage</p>
                <p className="text-sm text-gray-600">{dataUsage.toFixed(2)} GB / {dataLimit} GB</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${percentageUsed >= 90 ? 'bg-red-600' : percentageUsed >= 70 ? 'bg-yellow-600' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(100, percentageUsed)}%` }}
                ></div>
              </div>
              {remainingData !== null && (
                <p className="text-xs text-gray-500 mt-1">{remainingData.toFixed(2)} GB remaining</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bills Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Bills & Payments</h2>
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showPaymentHistory ? 'Hide' : 'Show'} Payment History
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bill.bill_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(bill.total_amount || bill.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moment(bill.due_date).format('MMM DD, YYYY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                      {bill.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {bill.status !== 'paid' && (
                      <button
                        onClick={() => handlePayBill(bill)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Pay Now
                      </button>
                    )}
                    <button
                      onClick={() => downloadInvoice(bill.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Download Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Section */}
      {showPaymentHistory && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.receipt_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.bill?.bill_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.method?.toUpperCase() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {moment(payment.payment_date).format('MMM DD, YYYY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status?.toUpperCase() || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No payment history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <PaymentModal
          bill={selectedBill}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
            fetchCustomerData();
          }}
        />
      )}
    </div>
  );
};

export default UserPortal;

