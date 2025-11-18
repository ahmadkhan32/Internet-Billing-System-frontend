import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const Packages = () => {
  const { user: currentUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    speed: '',
    price: '',
    data_limit: '',
    duration: 1,
    description: ''
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/packages');
      // Handle both response structures
      const packagesData = response.data.packages || response.data.data || [];
      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching packages:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Error fetching packages. Please check your connection and try again.';
      alert(errorMessage);
      setPackages([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - convert empty strings to null, ensure proper types
      const submitData = {
        name: formData.name.trim(),
        speed: formData.speed.trim(),
        price: parseFloat(formData.price),
        data_limit: formData.data_limit && formData.data_limit !== '' 
          ? parseFloat(formData.data_limit) 
          : null,
        duration: parseInt(formData.duration) || 1,
        description: formData.description.trim() || null
      };

      // Validate required fields
      if (!submitData.name || !submitData.speed || isNaN(submitData.price) || submitData.price < 0) {
        alert('Please fill in all required fields with valid values');
        return;
      }

      if (editingPackage) {
        await apiClient.put(`/packages/${editingPackage.id}`, submitData);
        alert('Package updated successfully!');
      } else {
        await apiClient.post('/packages', submitData);
        alert('Package created successfully!');
      }
      setShowModal(false);
      setEditingPackage(null);
      setFormData({ name: '', speed: '', price: '', data_limit: '', duration: 1, description: '' });
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.[0]?.msg || 
                           'Error saving package. Please check all fields and try again.';
      alert(errorMessage);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      speed: pkg.speed,
      price: pkg.price,
      data_limit: pkg.data_limit || '',
      duration: pkg.duration || 1,
      description: pkg.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      await apiClient.delete(`/packages/${id}`);
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
        <h1 className="text-3xl font-bold text-gray-800">Internet Packages</h1>
        <button
          onClick={() => {
            setEditingPackage(null);
            setFormData({ name: '', speed: '', price: '', data_limit: '', duration: 1, description: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Package
        </button>
      </div>

      {packages.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">No packages found</p>
          <p className="text-gray-400 text-sm mt-2">
            {currentUser?.role === 'admin' 
              ? 'Create your first package to get started' 
              : 'No packages available at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{pkg.name}</h3>
                <p className="text-2xl font-semibold text-blue-600 mt-2">{formatCurrency(pkg.price)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {pkg.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-gray-600"><span className="font-semibold">Speed:</span> {pkg.speed}</p>
              <p className="text-gray-600">
                <span className="font-semibold">Data Limit:</span> {pkg.data_limit ? `${pkg.data_limit} GB` : 'Unlimited'}
              </p>
              <p className="text-gray-600"><span className="font-semibold">Duration:</span> {pkg.duration} month(s)</p>
              {pkg.description && <p className="text-gray-600 text-sm">{pkg.description}</p>}
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
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingPackage ? 'Edit Package' : 'Add Package'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Speed (Mbps)</label>
                <input
                  type="text"
                  required
                  value={formData.speed}
                  onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10Mbps"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Limit (GB) - Leave empty for unlimited</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.data_limit}
                  onChange={(e) => setFormData({ ...formData, data_limit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
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

export default Packages;

