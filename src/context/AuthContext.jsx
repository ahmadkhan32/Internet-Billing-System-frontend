import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, businessId = null) => {
    try {
      const loginData = { email, password };
      if (businessId) {
        loginData.business_id = businessId;
      }
      
      console.log('🔐 Attempting login for:', email);
      const response = await apiClient.post('/auth/login', loginData);
      
      console.log('✅ Login response received:', {
        hasSuccess: !!response.data?.success,
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user,
        message: response.data?.message
      });
      
      if (response.data && response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        
        console.log('✅ Login successful, user set:', user.email);
        return { success: true };
      } else {
        console.error('❌ Invalid login response format:', response.data);
        return {
          success: false,
          message: response.data?.message || 'Login failed - invalid response format'
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      // Handle network errors specifically
      if (!error.response) {
        const networkError = error.userMessage || 
          'Cannot connect to server. Please ensure:\n' +
          '1. Backend server is running\n' +
          '2. Backend URL is correct\n' +
          '3. No firewall is blocking the connection';
        
        return {
          success: false,
          message: String(networkError),
          isNetworkError: true
        };
      }
      
      // Extract error message safely - prioritize server error messages
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Check for database connection error (503)
        if (error.response?.status === 503 && data.message && data.message.includes('Database connection')) {
          errorMessage = data.message || 'Database connection failed.';
          
          // Add missing variables if provided
          if (data.missingVariables && Array.isArray(data.missingVariables) && data.missingVariables.length > 0) {
            errorMessage += `\n\nMissing environment variables: ${data.missingVariables.join(', ')}`;
            errorMessage += '\n\nPlease set these in Vercel Dashboard → Settings → Environment Variables';
          }
          
          // Add troubleshooting steps if provided
          if (data.troubleshooting && Array.isArray(data.troubleshooting) && data.troubleshooting.length > 0) {
            errorMessage += '\n\nTroubleshooting steps:';
            data.troubleshooting.forEach((step, index) => {
              errorMessage += `\n${index + 1}. ${step}`;
            });
          }
          
          // Add hint if provided
          if (data.hint) {
            errorMessage += `\n\n💡 ${data.hint}`;
          }
          
          // Add error details in development
          if (data.error && (process.env.NODE_ENV === 'development' || window.location.hostname.includes('localhost'))) {
            errorMessage += `\n\nTechnical details: ${data.error}`;
          }
        }
        // Check for fatal server error (500)
        else if (data.message && data.message.includes('Fatal server error')) {
          errorMessage = 'Server initialization error. Please check:\n' +
            '1. Environment variables are set in Vercel\n' +
            '2. Database connection is configured\n' +
            '3. Check Vercel function logs for details';
          
          if (data.error) {
            errorMessage += `\n\nError: ${data.error}`;
          }
          if (data.environment) {
            const missing = [];
            if (!data.environment.hasDB_HOST) missing.push('DB_HOST');
            if (!data.environment.hasDB_USER) missing.push('DB_USER');
            if (!data.environment.hasDB_PASSWORD) missing.push('DB_PASSWORD');
            if (!data.environment.hasDB_NAME) missing.push('DB_NAME');
            if (!data.environment.hasJWT_SECRET) missing.push('JWT_SECRET');
            
            if (missing.length > 0) {
              errorMessage += `\n\nMissing environment variables: ${missing.join(', ')}`;
              errorMessage += '\nPlease set these in Vercel project settings.';
            }
          }
        } else if (typeof data.message === 'string') {
          // Check if it's a "Route not found" error
          if (data.message.includes('Route not found') || data.message.includes('API route not found')) {
            errorMessage = 'Backend API route not found. Please check:\n' +
              '1. VITE_API_BASE_URL environment variable is set in Vercel\n' +
              '2. Backend is deployed and running\n' +
              '3. API routes are accessible at /api/*\n\n' +
              'Current API Base URL: ' + (import.meta.env.VITE_API_BASE_URL || '/api') + '\n' +
              'Trying to access: ' + error.config?.url;
          } else {
            errorMessage = data.message;
          }
        } else if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.map(e => e.msg || e.message || String(e)).join(', ');
        }
      } else if (error.message && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      
      // For 500 errors, add more context
      if (error.response?.status === 500) {
        errorMessage = `Server error: ${errorMessage}\n\nPlease check:\n` +
          '1. Backend is running correctly\n' +
          '2. Database connection is working\n' +
          '3. Environment variables are set\n' +
          '4. Check server logs for details';
      }
      
      return {
        success: false,
        message: String(errorMessage)
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

