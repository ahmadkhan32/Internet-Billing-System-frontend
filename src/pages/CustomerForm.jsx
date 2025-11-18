import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { CUSTOMER_STATUS, CUSTOMER_STATUS_LABELS } from '../utils/constants';
import { ROLES } from '../utils/constants';

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [isps, setIsps] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cnic: '',
    package_id: '',
    isp_id: '',
    status: 'active',
    billing_cycle: 1,
    connection_date: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchPackages();
    if (currentUser?.role === ROLES.SUPER_ADMIN) {
      fetchISPs();
    }
    if (isEditMode) {
      fetchCustomer();
    } else if (currentUser?.isp_id) {
      // Pre-populate ISP ID if user has one (for super_admin with assigned ISP)
      setFormData(prev => ({ ...prev, isp_id: currentUser.isp_id }));
    }
  }, [id, currentUser]);

  const fetchPackages = async () => {
    try {
      const response = await apiClient.get('/packages', { params: { limit: 100 } });
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      alert('Error loading packages');
    }
  };

  const fetchISPs = async () => {
    try {
      const response = await apiClient.get('/isps');
      setIsps(response.data.isps || []);
    } catch (error) {
      console.error('Error fetching ISPs:', error);
      // Don't show alert, just log - ISP selector is optional
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/customers/${id}`);
      const customer = response.data.customer;
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        cnic: customer.cnic || '',
        package_id: customer.package_id || '',
        isp_id: customer.isp_id || '',
        status: customer.status || 'active',
        billing_cycle: customer.billing_cycle || 1,
        connection_date: customer.connection_date 
          ? new Date(customer.connection_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      alert('Error loading customer details');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    // ISP ID is required for super_admin when creating a customer
    if (currentUser?.role === ROLES.SUPER_ADMIN && !isEditMode && !formData.isp_id) {
      newErrors.isp_id = 'ISP is required. Please select an ISP for this customer.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.billing_cycle && (formData.billing_cycle < 1 || formData.billing_cycle > 12)) {
      newErrors.billing_cycle = 'Billing cycle must be between 1 and 12 months';
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
        package_id: formData.package_id || null,
        billing_cycle: parseInt(formData.billing_cycle) || 1,
        // Include isp_id only if it's provided (for super_admin) or if user has isp_id
        ...(formData.isp_id ? { isp_id: parseInt(formData.isp_id) } : {})
      };

      if (isEditMode) {
        await apiClient.put(`/customers/${id}`, submitData);
        alert('Customer updated successfully!');
      } else {
        await apiClient.post('/customers', submitData);
        alert('Customer created successfully!');
      }

      navigate('/customers');
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.errors?.[0]?.msg || 
                         'Error saving customer';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Customers
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEditMode ? 'Edit Customer' : 'Add New Customer'}
        </h1>
      </div>

      <div className="card max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                required
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="customer@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`input ${errors.phone ? 'border-red-500' : ''}`}
                required
                placeholder="+1234567890"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNIC
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                className="input"
                placeholder="12345-1234567-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`input ${errors.address ? 'border-red-500' : ''}`}
                rows="3"
                required
                placeholder="Street address, City, Country"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>

            {currentUser?.role === ROLES.SUPER_ADMIN && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISP <span className="text-red-500">*</span>
                </label>
                <select
                  name="isp_id"
                  value={formData.isp_id}
                  onChange={handleChange}
                  className={`input ${errors.isp_id ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">Select an ISP</option>
                  {isps.map((isp) => (
                    <option key={isp.id} value={isp.id}>
                      {isp.name} {isp.email ? `(${isp.email})` : ''}
                    </option>
                  ))}
                </select>
                {errors.isp_id && <p className="text-red-500 text-xs mt-1">{errors.isp_id}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package
              </label>
              <select
                name="package_id"
                value={formData.package_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select a package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.speed} ({pkg.price} PKR)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                {Object.entries(CUSTOMER_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Cycle (months)
              </label>
              <input
                type="number"
                name="billing_cycle"
                value={formData.billing_cycle}
                onChange={handleChange}
                className={`input ${errors.billing_cycle ? 'border-red-500' : ''}`}
                min="1"
                max="12"
              />
              {errors.billing_cycle && (
                <p className="text-red-500 text-xs mt-1">{errors.billing_cycle}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection Date
              </label>
              <input
                type="date"
                name="connection_date"
                value={formData.connection_date}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Customer' : 'Create Customer'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/customers')}
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

export default CustomerForm;

