'use client';

import { useState, useCallback } from 'react';
import { NotificationProps } from '@/components/Notification';

interface NotificationState extends Omit<NotificationProps, 'onClose'> {
  id: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationState, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    addNotification({ type: 'success', message, title });
  }, [addNotification]);

  const showError = useCallback((message: string, title?: string) => {
    addNotification({ type: 'error', message, title });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    addNotification({ type: 'warning', message, title });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    addNotification({ type: 'info', message, title });
  }, [addNotification]);

  return {
    notifications,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}