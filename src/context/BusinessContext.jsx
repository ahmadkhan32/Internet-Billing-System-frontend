import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../api/apiClient';

const BusinessContext = createContext();

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

export const BusinessProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load businesses for Super Admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchBusinesses();
    } else if (user?.isp) {
      // For non-Super Admin, use their business
      setSelectedBusiness(user.isp);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/isps');
      setBusinesses(response.data.isps || []);
      
      // If no business selected and user has a business, select it
      if (!selectedBusiness && user?.isp) {
        setSelectedBusiness(user.isp);
      } else if (!selectedBusiness && response.data.isps?.length > 0) {
        // Select first business by default
        setSelectedBusiness(response.data.isps[0]);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchBusiness = (business) => {
    setSelectedBusiness(business);
    localStorage.setItem('selectedBusiness', JSON.stringify(business));
  };

  // Load selected business from localStorage on mount
  useEffect(() => {
    if (user?.role === 'super_admin') {
      const saved = localStorage.getItem('selectedBusiness');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedBusiness(parsed);
        } catch (e) {
          console.error('Error parsing saved business:', e);
        }
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current business (selected for Super Admin, user's business for others)
  const getCurrentBusiness = () => {
    if (user?.role === 'super_admin') {
      return selectedBusiness;
    }
    return user?.isp || null;
  };

  // Get business ID for API calls
  const getBusinessId = () => {
    const business = getCurrentBusiness();
    return business?.id || null;
  };

  const value = {
    selectedBusiness,
    businesses,
    loading,
    switchBusiness,
    getCurrentBusiness,
    getBusinessId,
    fetchBusinesses,
    isSuperAdmin: user?.role === 'super_admin'
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

