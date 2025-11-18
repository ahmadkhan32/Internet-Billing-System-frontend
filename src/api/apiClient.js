import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (backend not reachable)
    if (!error.response) {
      console.error('Network Error:', error.message);
      console.error('Backend URL:', API_BASE_URL);
      console.error('Error code:', error.code);
      
      // Show user-friendly error
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        // Check if we're on Vercel (production)
        const isVercel = window.location.hostname.includes('vercel.app');
        if (isVercel) {
          error.userMessage = 'Cannot connect to backend API. Please check:\n' +
            '1. Backend is deployed on Vercel\n' +
            '2. API routes are configured correctly\n' +
            '3. Check Vercel function logs for errors';
        } else {
          error.userMessage = 'Cannot connect to server. Please make sure the backend is running on http://localhost:8000';
        }
      }
    } else {
      // Log server errors for debugging
      console.error('API Error:', error.response.status, error.response.data);
      
      // Handle 404 errors (Route not found)
      if (error.response.status === 404) {
        const errorMsg = error.response.data?.message || 'Route not found';
        if (errorMsg.includes('Route not found') || errorMsg.includes('API route not found')) {
          error.userMessage = 'Backend API route not found. Please check:\n' +
            '1. VITE_API_BASE_URL is set correctly in Vercel\n' +
            '2. Backend is deployed and accessible\n' +
            '3. API routes are configured correctly\n\n' +
            'Current API Base URL: ' + API_BASE_URL + '\n' +
            'Trying to access: ' + error.config?.url;
        }
      }
      
      // For 500 errors, preserve the error details
      if (error.response.status === 500) {
        console.error('Server Error Details:', {
          message: error.response.data?.message,
          error: error.response.data?.error,
          environment: error.response.data?.environment
        });
      }
    }
    
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't redirect if we're already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

