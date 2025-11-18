import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/helpers';
import { PAYMENT_METHOD_LABELS, ROLES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const PaymentForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get('customer_id');
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Check if user is Recovery Officer - they can recover payments for ALL bills (paid and unpaid)
  const isRecoveryOfficer = user?.role === ROLES.RECOVERY_OFFICER;
  const [formData, setFormData] = useState({
    customer_id: customerIdFromUrl || '',
    bill_id: '',
    amount: '',
    method: 'cash',
    transaction_id: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCustomers();
    if (customerIdFromUrl) {
      setFormData(prev => ({ ...prev, customer_id: customerIdFromUrl }));
      fetchBills(customerIdFromUrl);
    }
  }, [customerIdFromUrl]);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers', { params: { limit: 1000 } });
      setCustomers(response.data.customers || []);
      
      // If customer_id is in URL, find and set the customer
      if (customerIdFromUrl) {
        const customer = response.data.customers?.find(c => c.id === parseInt(customerIdFromUrl));
        if (customer) {
          setSelectedCustomer(customer);
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchBills = async (customerId) => {
    if (!customerId) return;
    
    try {
      // Fetch all bills for the customer
      const response = await apiClient.get('/bills', {
        params: { customer_id: customerId, limit: 100 }
      });
      
      console.log('Fetched bills for customer:', response.data);
      
      let filteredBills = [];
      
      if (isRecoveryOfficer) {
        // Recovery Officer can recover payments for ALL bills (paid, unpaid, overdue, before due)
        // Only exclude cancelled bills
        filteredBills = (response.data.bills || []).filter(bill => 
          bill.status !== 'cancelled'
        );
        console.log('Recovery Officer - All bills (including paid):', filteredBills);
      } else {
        // For other roles, only show unpaid bills (pending, partial, overdue)
        filteredBills = (response.data.bills || []).filter(bill => {
          const billAmount = parseFloat(bill.total_amount || bill.amount || 0);
          const paidAmount = parseFloat(bill.paid_amount || 0);
          const remainingAmount = billAmount - paidAmount;
          
          // Include bills that are not paid/cancelled AND have remaining balance
          return bill.status !== 'paid' && 
                 bill.status !== 'cancelled' && 
                 remainingAmount > 0;
        });
        console.log('Other roles - Unpaid bills only:', filteredBills);
      }
      
      setBills(filteredBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      console.error('Error details:', error.response?.data);
      setBills([]);
    }
  };

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      customer_id: customerId,
      bill_id: '',
      amount: ''
    }));
    
    if (customerId) {
      const customer = customers.find(c => c.id === parseInt(customerId));
      setSelectedCustomer(customer);
      fetchBills(customerId);
    } else {
      setSelectedCustomer(null);
      setBills([]);
    }
  };

  const handleBillChange = (e) => {
    const billId = e.target.value;
    const bill = bills.find(b => b.id === parseInt(billId));
    
    setFormData(prev => ({
      ...prev,
      bill_id: billId,
      amount: bill ? (bill.total_amount || bill.amount || '').toString() : ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }

    if (!formData.bill_id || formData.bill_id === '') {
      if (bills.length === 0 && formData.customer_id) {
        newErrors.bill_id = 'No unpaid bills available for this customer. Please create a bill first.';
      } else {
        newErrors.bill_id = 'Bill is required';
      }
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.method) {
      newErrors.method = 'Payment method is required';
    }

    // Transaction ID required for certain methods
    if ((formData.method === 'jazzcash' || formData.method === 'easypaisa' || formData.method === 'bank_transfer') && !formData.transaction_id.trim()) {
      newErrors.transaction_id = 'Transaction ID is required for this payment method';
    }

    // Validate amount doesn't exceed remaining balance (unless Recovery Officer recovering a paid bill)
    if (formData.bill_id && selectedBill) {
      const billAmount = parseFloat(selectedBill.total_amount || selectedBill.amount || 0);
      const paidAmount = parseFloat(selectedBill.paid_amount || 0);
      const remainingAmount = billAmount - paidAmount;
      const enteredAmount = parseFloat(formData.amount) || 0;
      
      // Recovery Officer can record payments even for fully paid bills (for recovery purposes)
      // For other roles, amount cannot exceed remaining balance
      if (!isRecoveryOfficer && enteredAmount > remainingAmount) {
        newErrors.amount = `Amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`;
      } else if (isRecoveryOfficer && selectedBill.status === 'paid' && remainingAmount === 0) {
        // Recovery Officer can add additional payments to paid bills (e.g., late fees, adjustments)
        // No validation needed - they can enter any amount
      } else if (isRecoveryOfficer && enteredAmount > remainingAmount && remainingAmount > 0) {
        // Recovery Officer can exceed remaining balance (for adjustments, fees, etc.)
        // Just show a warning, don't block
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent submission if no bills available (unless Recovery Officer)
    if (bills.length === 0 && formData.customer_id) {
      if (isRecoveryOfficer) {
        alert('No bills found for this customer. Please create a bill first or select a different customer.');
      } else {
        alert('No unpaid bills found for this customer. Please create a bill first.');
      }
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Double-check bill_id is valid
    if (!formData.bill_id || formData.bill_id === '') {
      alert('Please select a bill to record payment for.');
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        bill_id: parseInt(formData.bill_id),
        amount: parseFloat(formData.amount),
        transaction_id: formData.transaction_id || undefined
      };

      console.log('Submitting payment:', submitData);

      const response = await apiClient.post('/payments', submitData);
      
      if (response.data.success) {
        alert('Payment recorded successfully!');
        navigate('/payments');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Error recording payment';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors && error.response.data.errors.length > 0) {
          errorMessage = error.response.data.errors[0].msg || error.response.data.errors[0].message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedBill = bills.find(b => b.id === parseInt(formData.bill_id));
  const billAmount = selectedBill ? parseFloat(selectedBill.total_amount || selectedBill.amount || 0) : 0;
  const paidAmount = selectedBill ? parseFloat(selectedBill.paid_amount || 0) : 0;
  const remainingAmount = billAmount - paidAmount;
  const enteredAmount = parseFloat(formData.amount) || 0;

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Record Payment</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_id}
                onChange={handleCustomerChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customer_id ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>
              )}
            </div>

            {/* Customer Info Display */}
            {selectedCustomer && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span> {selectedCustomer.name}
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span> {selectedCustomer.phone}
                  </div>
                  {selectedCustomer.email && (
                    <div>
                      <span className="text-gray-600">Email:</span> {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.package && (
                    <div>
                      <span className="text-gray-600">Package:</span> {selectedCustomer.package.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bill Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill <span className="text-red-500">*</span>
                {isRecoveryOfficer && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">
                    (Recovery Officer: Can recover payments for all bills - paid, unpaid, overdue, or before due)
                  </span>
                )}
              </label>
              {bills.length === 0 && formData.customer_id && !isRecoveryOfficer && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>No unpaid bills found for this customer.</strong>
                  </p>
                  <p className="text-xs text-yellow-700 mb-2">
                    You can create a new bill for this customer first, or check if they have any bills in the Billing section.
                  </p>
                  <Link 
                    to={`/billing/new?customer_id=${formData.customer_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Create New Bill →
                  </Link>
                </div>
              )}
              {bills.length === 0 && formData.customer_id && isRecoveryOfficer && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>No bills found for this customer.</strong> Please create a bill first or select a different customer.
                  </p>
                </div>
              )}
              <select
                name="bill_id"
                value={formData.bill_id || ''}
                onChange={handleBillChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bill_id ? 'border-red-500' : 'border-gray-300'
                } ${(!formData.customer_id || bills.length === 0) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
                disabled={!formData.customer_id || bills.length === 0}
              >
                <option value="">
                  {!formData.customer_id 
                    ? 'Select customer first' 
                    : bills.length === 0 
                    ? (isRecoveryOfficer ? 'No bills found for this customer' : 'No unpaid bills found for this customer')
                    : 'Select Bill'}
                </option>
                {bills.map((bill) => {
                  const billAmount = parseFloat(bill.total_amount || bill.amount || 0);
                  const paidAmount = parseFloat(bill.paid_amount || 0);
                  const remainingAmount = billAmount - paidAmount;
                  const isOverdue = new Date(bill.due_date) < new Date() && bill.status !== 'paid';
                  const isBeforeDue = new Date(bill.due_date) >= new Date() && bill.status !== 'paid';
                  
                  return (
                    <option key={bill.id} value={bill.id}>
                      {bill.bill_number} - {formatCurrency(billAmount)} 
                      {bill.status === 'paid' && ' [PAID]'}
                      {paidAmount > 0 && bill.status !== 'paid' && ` (Paid: ${formatCurrency(paidAmount)}, Remaining: ${formatCurrency(remainingAmount)})`}
                      {paidAmount === 0 && bill.status !== 'paid' && ` (Due: ${new Date(bill.due_date).toLocaleDateString()})`}
                      {bill.status === 'overdue' && ' - OVERDUE'}
                      {isBeforeDue && bill.status !== 'paid' && ' - BEFORE DUE'}
                    </option>
                  );
                })}
              </select>
              {errors.bill_id && (
                <p className="text-red-500 text-sm mt-1">{errors.bill_id}</p>
              )}
              {bills.length === 0 && formData.customer_id && !errors.bill_id && !isRecoveryOfficer && (
                <p className="text-yellow-600 text-sm mt-1">
                  ⚠️ No unpaid bills found. Please create a bill first.
                </p>
              )}
            </div>

            {/* Bill Info Display */}
            {selectedBill && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Bill Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Bill Number:</span> {selectedBill.bill_number}
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedBill.status === 'paid' ? 'bg-green-100 text-green-800' :
                      selectedBill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedBill.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bill Amount:</span> {formatCurrency(billAmount)}
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span> {new Date(selectedBill.due_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter payment amount"
                required
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
              {selectedBill && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Bill Total: {formatCurrency(billAmount)} | 
                    {paidAmount > 0 && ` Already Paid: ${formatCurrency(paidAmount)} |`}
                    {' '}Remaining: {formatCurrency(remainingAmount)}
                  </p>
                  {enteredAmount > 0 && (
                    <p className={`text-sm font-medium ${
                      enteredAmount > remainingAmount && !isRecoveryOfficer ? 'text-red-600' : 
                      enteredAmount > remainingAmount && isRecoveryOfficer ? 'text-blue-600' :
                      enteredAmount === remainingAmount ? 'text-green-600' : 
                      'text-yellow-600'
                    }`}>
                      {enteredAmount > remainingAmount && isRecoveryOfficer
                        ? `ℹ️ Recovery Officer: Amount exceeds remaining balance by ${formatCurrency(enteredAmount - remainingAmount)} (allowed for adjustments/fees)`
                        : enteredAmount > remainingAmount && !isRecoveryOfficer
                        ? `⚠️ Amount exceeds remaining balance by ${formatCurrency(enteredAmount - remainingAmount)}`
                        : enteredAmount === remainingAmount
                        ? '✓ Full payment (will clear remaining balance)'
                        : `After payment, ${formatCurrency(remainingAmount - enteredAmount)} will remain`
                      }
                    </p>
                  )}
                  {selectedBill && selectedBill.status === 'paid' && isRecoveryOfficer && (
                    <p className="text-sm text-blue-600 mt-1">
                      ℹ️ This bill is already paid. Recovery Officer can record additional payments (e.g., late fees, adjustments).
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.method}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, method: e.target.value, transaction_id: '' }));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.method ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="cash">Cash</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Credit/Debit Card</option>
                <option value="online">Online Payment</option>
              </select>
              {errors.method && (
                <p className="text-red-500 text-sm mt-1">{errors.method}</p>
              )}
            </div>

            {/* Transaction ID (for certain methods) */}
            {(formData.method === 'jazzcash' || formData.method === 'easypaisa' || formData.method === 'bank_transfer') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.transaction_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={`Enter ${PAYMENT_METHOD_LABELS[formData.method] || formData.method} transaction ID`}
                  required
                />
                {errors.transaction_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.transaction_id}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || !formData.customer_id || !formData.bill_id || bills.length === 0}
                className={`flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
                  (!formData.customer_id || !formData.bill_id || bills.length === 0) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                title={
                  !formData.customer_id 
                    ? 'Please select a customer first' 
                    : bills.length === 0 
                    ? 'No unpaid bills found for this customer' 
                    : !formData.bill_id 
                    ? 'Please select a bill' 
                    : ''
                }
              >
                {loading ? 'Recording Payment...' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;

