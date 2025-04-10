'use client';

import { useState, useEffect } from 'react';
import { useIsClient } from '../use-is-client';

/**
 * Type pour représenter une notification
 */
export type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  type: 'info' | 'success' | 'warning' | 'error';
};

/**
 * Hook personnalisé pour gérer les notifications utilisateur
 * 
 * @param userId - ID de l'utilisateur connecté
 * @returns Objet contenant les notifications et les méthodes pour les gérer
 */
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isClient = useIsClient();

  // Fonction pour récupérer les notifications de l'utilisateur
  const fetchNotifications = async () => {
    if (!userId || !isClient) return;
    
    setIsLoading(true);
    
    try {
      // TODO: Implémenter la récupération des notifications depuis l'API
      // Pour l'instant, on utilise des données fictives
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Nouvelle mise à jour',
          message: 'La version 2.0 de l\'application est disponible !',
          isRead: false,
          createdAt: new Date(),
          type: 'info'
        },
        {
          id: '2',
          title: 'Livraison confirmée',
          message: 'Votre colis a été livré avec succès.',
          isRead: true,
          createdAt: new Date(Date.now() - 86400000), // 1 jour avant
          type: 'success'
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      // TODO: Implémenter la mise à jour via l'API
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      updateUnreadCount();
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
    }
  };

  // Fonction pour marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      // TODO: Implémenter la mise à jour via l'API
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    }
  };

  // Mettre à jour le compteur de notifications non lues
  const updateUnreadCount = () => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  };

  // Récupérer les notifications au chargement et quand userId change
  useEffect(() => {
    if (isClient && userId) {
      fetchNotifications();
    }
  }, [userId, isClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };
} 