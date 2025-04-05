<<<<<<< Updated upstream
=======
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'system' | 'delivery' | 'payment' | 'message' | 'alert' | 'package';
  read: boolean;
  createdAt: Date;
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would be a fetch call to your API
      // For now, we'll simulate a small delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for development
      const mockNotifications: Notification[] = [
        {
          id: '1',
          userId,
          title: 'Votre livraison est en route',
          message: 'Le livreur est en chemin avec votre colis #DEL123456',
          type: 'delivery',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        },
        {
          id: '2',
          userId,
          title: 'Paiement confirmé',
          message: 'Votre paiement de 49,90€ pour l\'abonnement Premium a été traité avec succès',
          type: 'payment',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        },
        {
          id: '3',
          userId,
          title: 'Nouveau message',
          message: 'Thomas (Livreur) vous a envoyé un message concernant votre livraison',
          type: 'message',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // In a real app, this would be an API call
      // For now, we'll update the local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
      
      // In real implementation, you would make an API call here
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Erreur lors du marquage de la notification comme lue');
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      // In a real app, this would be an API call
      // For now, we'll update the local state
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      
      // In real implementation, you would make an API call here
      toast.success('Toutes les notifications ont été marquées comme lues');
      return true;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Erreur lors du marquage des notifications comme lues');
      return false;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // In a real app, this would be an API call
      // For now, we'll update the local state
      setNotifications(notifications.filter(notification => notification.id !== notificationId));
      
      // In real implementation, you would make an API call here
      return true;
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Erreur lors de la suppression de la notification');
      return false;
    }
  };

  const deleteAllNotifications = async () => {
    try {
      // In a real app, this would be an API call
      // For now, we'll update the local state
      setNotifications([]);
      
      // In real implementation, you would make an API call here
      toast.success('Toutes les notifications ont été supprimées');
      return true;
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      toast.error('Erreur lors de la suppression des notifications');
      return false;
    }
  };

  // Load notifications on component mount
  useEffect(() => {
    fetchNotifications();
    
    // In a real app, you might set up a websocket connection here
    // or polling to get real-time notifications
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [userId]);

  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refresh: fetchNotifications,
  };
} 
>>>>>>> Stashed changes
