import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import stateService from '../services/stateService';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Subscribe to notifications from state service
    const unsubscribe = stateService.subscribeTo('notifications', (newNotifications) => {
      setNotifications(newNotifications);
    });

    // Get initial notifications
    setNotifications(stateService.getStateSlice('notifications'));

    return unsubscribe;
  }, []);

  const removeNotification = (id) => {
    stateService.removeNotification(id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="notification-icon success" />;
      case 'error':
        return <FaTimesCircle className="notification-icon error" />;
      case 'warning':
        return <FaExclamationTriangle className="notification-icon warning" />;
      case 'info':
      default:
        return <FaInfoCircle className="notification-icon info" />;
    }
  };

  const getNotificationClass = (type) => {
    return `notification-item ${type}`;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={getNotificationClass(notification.type)}
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div className="notification-content">
            {getNotificationIcon(notification.type)}
            <div className="notification-text">
              <div className="notification-title">
                {notification.title || notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
              </div>
              {notification.message && (
                <div className="notification-message">
                  {notification.message}
                </div>
              )}
            </div>
          </div>
          
          <button
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
