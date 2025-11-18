import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import moment from 'moment';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      bill_reminder: 'bg-yellow-100 text-yellow-800',
      payment_received: 'bg-green-100 text-green-800',
      bill_generated: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      service_update: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800',
      subscription_start: 'bg-green-100 text-green-800',
      subscription_expiry_reminder: 'bg-yellow-100 text-yellow-800',
      subscription_expired: 'bg-red-100 text-red-800',
      subscription_renewed: 'bg-blue-100 text-blue-800',
      business_suspended: 'bg-red-100 text-red-800',
      business_reactivated: 'bg-green-100 text-green-800',
      installation_completed: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    const icons = {
      bill_reminder: '💰',
      payment_received: '✅',
      bill_generated: '📄',
      overdue: '⚠️',
      service_update: '🔧',
      system: '🔔',
      subscription_start: '🎉',
      subscription_expiry_reminder: '⏰',
      subscription_expired: '❌',
      subscription_renewed: '🔄',
      business_suspended: '⏸️',
      business_reactivated: '▶️',
      installation_completed: '🔌'
    };
    return icons[type] || '🔔';
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
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Mark All as Read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                !notification.is_read ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl mr-1">{getTypeIcon(notification.type)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(notification.type)}`}>
                      {notification.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{notification.title}</h3>
                  <p className="text-gray-600 mb-2">{notification.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{moment(notification.createdAt).format('MMM DD, YYYY HH:mm')}</span>
                    {notification.bill && (
                      <span>Bill: {notification.bill.bill_number}</span>
                    )}
                    {notification.customer && (
                      <span>Customer: {notification.customer.name}</span>
                    )}
                  </div>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;

