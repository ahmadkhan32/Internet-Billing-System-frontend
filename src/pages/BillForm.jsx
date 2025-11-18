import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/helpers';

const BillForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    package_id: '',
    amount: '',
    due_date: '',
    billing_period_start: new Date().toISOString().split('T')[0],
    billing_period_end: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCustomers();
    fetchPackages();
    if (isEditMode && id) {
      fetchBill();
    } else if (customerId) {
      fetchCustomerDetails(customerId);
    }
  }, [id, customerId, isEditMode]);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers', { params: { limit: 1000 } });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await apiClient.get('/packages', { params: { limit: 100 } });
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchBill = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/bills/${id}`);
      const bill = response.data.bill;
      
      // Set form data from bill
      setFormData({
        customer_id: bill.customer_id || '',
        package_id: bill.package_id || '',
        amount: bill.amount || bill.total_amount || '',
        due_date: bill.due_date ? new Date(bill.due_date).toISOString().split('T')[0] : '',
        billing_period_start: bill.billing_period_start ? new Date(bill.billing_period_start).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        billing_period_end: bill.billing_period_end ? new Date(bill.billing_period_end).toISOString().split('T')[0] : '',
        notes: bill.notes || ''
      });
      
      // Fetch customer details
      if (bill.customer_id) {
        await fetchCustomerDetails(bill.customer_id);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      alert('Error loading bill details');
      navigate('/billing');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (id) => {
    try {
      const response = await apiClient.get(`/customers/${id}`);
      const customer = response.data.customer;
      setSelectedCustomer(customer);
      
      // Pre-fill package if customer has one
      if (customer.package_id && !formData.package_id) {
        setFormData(prev => ({ ...prev, package_id: customer.package_id }));
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const handleCustomerChange = (customerId) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }));
    fetchCustomerDetails(customerId);
  };

  const handlePackageChange = (packageId) => {
    const selectedPackage = packages.find(p => p.id === parseInt(packageId));
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        package_id: packageId,
        amount: selectedPackage.price
      }));
    } else {
      setFormData(prev => ({ ...prev, package_id: packageId }));
    }
  };

  const calculateEndDate = (startDate, billingCycle) => {
    if (!startDate) return '';
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + (billingCycle || 1));
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (date) => {
    const billingCycle = selectedCustomer?.billing_cycle || 1;
    const endDate = calculateEndDate(date, billingCycle);
    const dueDate = new Date(endDate);
    dueDate.setDate(dueDate.getDate() + 7);
    
    setFormData(prev => ({
      ...prev,
      billing_period_start: date,
      billing_period_end: endDate,
      due_date: dueDate.toISOString().split('T')[0]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }

    if (!formData.package_id) {
      newErrors.package_id = 'Package is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        package_id: formData.package_id ? parseInt(formData.package_id) : null,
        amount: parseFloat(formData.amount),
        billing_period_start: formData.billing_period_start || new Date().toISOString(),
        billing_period_end: formData.billing_period_end || calculateEndDate(formData.billing_period_start, selectedCustomer?.billing_cycle || 1)
      };

      let response;
      if (isEditMode) {
        response = await apiClient.put(`/bills/${id}`, submitData);
        if (response.data.success) {
          alert('Bill updated successfully!');
          navigate(`/bills/${id}`);
        }
      } else {
        response = await apiClient.post('/bills', submitData);
        if (response.data.success) {
          alert('Bill generated successfully! Invoice has been sent to customer portal.');
          navigate('/billing');
        }
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} bill:`, error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = isEditMode ? 'Error updating bill' : 'Error creating bill';
      
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

  const selectedPackage = packages.find(p => p.id === parseInt(formData.package_id));

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/billing')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Billing
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{isEditMode ? 'Edit Bill' : 'Generate Bill'}</h1>
      </div>

      <div className="card max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`input ${errors.customer_id ? 'border-red-500' : ''}`}
                required
                disabled={!!customerId || isEditMode}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
              {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package <span className="text-red-500">*</span>
              </label>
              <select
                name="package_id"
                value={formData.package_id}
                onChange={(e) => handlePackageChange(e.target.value)}
                className={`input ${errors.package_id ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Select a package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.speed} ({formatCurrency(pkg.price)})
                  </option>
                ))}
              </select>
              {errors.package_id && <p className="text-red-500 text-xs mt-1">{errors.package_id}</p>}
              {selectedPackage && (
                <p className="text-sm text-gray-600 mt-1">
                  Package price: {formatCurrency(selectedPackage.price)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className={`input ${errors.amount ? 'border-red-500' : ''}`}
                step="0.01"
                min="0"
                required
                placeholder={selectedPackage ? formatCurrency(selectedPackage.price) : '0.00'}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Period Start
              </label>
              <input
                type="date"
                name="billing_period_start"
                value={formData.billing_period_start}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Period End
              </label>
              <input
                type="date"
                name="billing_period_end"
                value={formData.billing_period_end}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_period_end: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className={`input ${errors.due_date ? 'border-red-500' : ''}`}
                required
              />
              {errors.due_date && <p className="text-red-500 text-xs mt-1">{errors.due_date}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input"
                rows="3"
                placeholder="Additional notes for this bill..."
              />
            </div>
          </div>

          {selectedCustomer && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span> {selectedCustomer.name}
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span> {selectedCustomer.phone}
                </div>
                <div>
                  <span className="text-gray-600">Current Package:</span> {selectedCustomer.package?.name || 'None'}
                </div>
                <div>
                  <span className="text-gray-600">Billing Cycle:</span> {selectedCustomer.billing_cycle || 1} month(s)
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? (isEditMode ? 'Updating...' : 'Generating...') : (isEditMode ? 'Update Bill' : 'Generate Bill & Send Invoice')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillForm;

