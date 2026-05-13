import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './NotificationSystem.css';

const NotificationSystem = () => {
  const { notifications, removeNotification } = useSocket();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-system">
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`notification ${notification.type}`}
        >
          <div className="notification-icon">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="notification-content">
            <div className="notification-message">
              {notification.message}
            </div>
            {notification.timestamp && (
              <div className="notification-time">
                {formatTime(notification.timestamp)}
              </div>
            )}
          </div>
          
          <button
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;