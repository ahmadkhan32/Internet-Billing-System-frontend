import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/reports/dashboard');
      console.log('Dashboard API response:', response.data);
      if (response.data && response.data.stats) {
        setStats(response.data.stats);
      } else {
        console.error('Invalid response structure:', response.data);
        // Set default stats if response is invalid
        setStats({
          totalCustomers: 0,
          activeCustomers: 0,
          totalBills: 0,
          pendingBills: 0,
          overdueBills: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          overdueAmount: 0,
          recentPayments: []
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      console.error('Error response:', error.response?.data);
      // Set default stats on error
      setStats({
        totalCustomers: 0,
        activeCustomers: 0,
        totalBills: 0,
        pendingBills: 0,
        overdueBills: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        overdueAmount: 0,
        recentPayments: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Calculate bill status distribution
  const billStatusData = stats ? [
    { name: 'Paid', value: Math.max(0, stats.totalBills - stats.pendingBills) },
    { name: 'Pending', value: stats.pendingBills }
  ] : [];

  // Colors matching the screenshot: Green for Paid, Orange for Pending
  const COLORS = ['#10b981', '#f59e0b'];
  
  // Check if user is customer
  const isCustomer = user?.role === 'customer';

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {!stats ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-500 text-center">Loading dashboard statistics...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isCustomer ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6 mb-8`}>
            {!isCustomer && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalCustomers}</p>
                    <p className="text-xs text-green-600 mt-1">{stats.activeCustomers} active</p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalBills}</p>
                  <p className="text-xs text-red-600 mt-1">{stats.pendingBills} pending</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-blue-600 mt-1">{formatCurrency(stats.monthlyRevenue)} this month</p>
                </div>
                <div className="text-4xl">💵</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue Bills</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdueBills}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(stats.overdueAmount)}</p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Bill Status Distribution</h2>
              {billStatusData.length > 0 && billStatusData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={billStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {billStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500">No bill data available</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
              <div className="space-y-3">
                {stats.recentPayments && stats.recentPayments.length > 0 ? (
                  stats.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{payment.customer?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(payment.amount)}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent payments</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

