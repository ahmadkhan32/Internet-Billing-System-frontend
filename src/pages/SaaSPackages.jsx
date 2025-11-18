import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/helpers';

const SaaSPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: 1,
    max_customers: '',
    max_users: 5,
    commission_rate: 0,
    is_featured: false,
    features_json: {}
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await apiClient.get('/saas-packages');
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching SaaS packages:', error);
      alert('Error fetching SaaS packages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration) || 1,
        max_customers: formData.max_customers ? parseInt(formData.max_customers) : null,
        max_users: parseInt(formData.max_users) || 5,
        commission_rate: parseFloat(formData.commission_rate) || 0
      };

      if (editingPackage) {
        await apiClient.put(`/saas-packages/${editingPackage.id}`, submitData);
        alert('Package updated successfully!');
      } else {
        await apiClient.post('/saas-packages', submitData);
        alert('Package created successfully!');
      }
      setShowModal(false);
      setEditingPackage(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration: 1,
        max_customers: '',
        max_users: 5,
        commission_rate: 0,
        is_featured: false,
        features_json: {}
      });
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package');
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      duration: pkg.duration || 1,
      max_customers: pkg.max_customers || '',
      max_users: pkg.max_users || 5,
      commission_rate: pkg.commission_rate || 0,
      is_featured: pkg.is_featured || false,
      features_json: pkg.features_json || {}
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await apiClient.delete(`/saas-packages/${id}`);
      alert('Package deleted successfully!');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Error deleting package');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">SaaS Packages</h1>
        <button
          onClick={() => {
            setEditingPackage(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              duration: 1,
              max_customers: '',
              max_users: 5,
              commission_rate: 0,
              is_featured: false,
              features_json: {}
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`bg-white rounded-lg shadow-md p-6 border-2 ${pkg.is_featured ? 'border-yellow-400' : 'border-gray-200'}`}>
            {pkg.is_featured && (
              <div className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded mb-2 inline-block">
                ⭐ Featured
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{pkg.name}</h3>
                <p className="text-2xl font-semibold text-blue-600 mt-2">{formatCurrency(pkg.price)}/mo</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${pkg.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {pkg.status}
              </span>
            </div>
            {pkg.description && <p className="text-gray-600 mb-4">{pkg.description}</p>}
            <div className="space-y-2 mb-4">
              <p className="text-gray-600">
                <span className="font-semibold">Duration:</span> {pkg.duration} month(s)
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Max Customers:</span> {pkg.max_customers || 'Unlimited'}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Max Users:</span> {pkg.max_users || 'Unlimited'}
              </p>
              {pkg.isps && (
                <p className="text-gray-600">
                  <span className="font-semibold">Subscribed ISPs:</span> {pkg.isps.length}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleEdit(pkg)}
                className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(pkg.id)}
                className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingPackage ? 'Edit SaaS Package' : 'Add SaaS Package'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Customers</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_customers}
                    onChange={(e) => setFormData({ ...formData, max_customers: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Featured Package</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingPackage ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPackage(null);
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

export default SaaSPackages;

