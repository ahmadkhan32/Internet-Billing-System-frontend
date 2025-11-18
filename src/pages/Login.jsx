import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [showBusinessId, setShowBusinessId] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🚀 Login form submitted');
      const result = await login(email, password, businessId || undefined);
      
      if (result.success) {
        console.log('✅ Login successful, redirecting to dashboard');
        // Redirect to dashboard - will be handled by App routing
        // Use window.location for reliable redirect
        window.location.href = '/dashboard';
      } else {
        console.error('❌ Login failed:', result.message);
        setError(result.message || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('❌ Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Internet Billing System
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded whitespace-pre-line">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              placeholder="Enter your password"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="businessId" className="block text-sm font-medium text-gray-700">
                Business ID <span className="text-gray-400 font-normal">(Optional - for Business Admin)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowBusinessId(!showBusinessId)}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                {showBusinessId ? 'Hide' : 'Show'}
              </button>
            </div>
            {showBusinessId && (
              <input
                id="businessId"
                type="text"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="input"
                placeholder="Enter Business ID (e.g., BIZ-2024-0001)"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              Business Admin can login with Business ID + Email + Password for enhanced security
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Default: admin@billing.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;

