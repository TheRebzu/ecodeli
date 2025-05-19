import { useState, useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { DeliveryStatus } from '@prisma/client';

type LocationUpdate = {
  id: string;
  location: { lat: number; lng: number };
  timestamp: number;
};

type StatusUpdate = {
  id: string;
  status: DeliveryStatus;
  note?: string;
  verificationCode?: string;
  timestamp: number;
};

type OfflineData = {
  locationUpdates: LocationUpdate[];
  statusUpdates: StatusUpdate[];
  lastSyncTimestamp: number | null;
};

/**
 * Hook pour gérer les livraisons en mode hors-ligne pour les livreurs
 *
 * Fonctionnalités:
 * - Stockage des mises à jour de position en mode hors-ligne
 * - Stockage des mises à jour de statut en mode hors-ligne
 * - Synchronisation automatique lorsque la connexion est rétablie
 * - Gestion des conflits de synchronisation
 */
export function useOfflineDeliveries() {
  // État local
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  // Stockage local des données hors-ligne
  const [offlineData, setOfflineData] = useLocalStorage<OfflineData>('offline-deliveries', {
    locationUpdates: [],
    statusUpdates: [],
    lastSyncTimestamp: null,
  });

  // tRPC mutations
  const utils = trpc.useContext();

  const updateLocationMutation = trpc.deliveries.updateDeliveryLocation.useMutation();
  const updateStatusMutation = trpc.deliveries.updateDeliveryStatus.useMutation();

  // Détection de l'état de la connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineMode) {
        toast.success('Connexion rétablie. Synchronisation en cours...');
        synchronizeOfflineData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (!offlineMode) {
        setOfflineMode(true);
        toast.warning('Vous êtes hors-ligne. Les actions seront enregistrées localement.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineMode]);

  // Activation manuelle du mode hors-ligne
  const enableOfflineMode = (enabled: boolean) => {
    setOfflineMode(enabled);
    if (enabled) {
      toast.info('Mode hors-ligne activé. Les actions seront enregistrées localement.');
    } else if (isOnline) {
      toast.info('Mode hors-ligne désactivé. Synchronisation en cours...');
      synchronizeOfflineData();
    }
  };

  // Mise à jour de la position en mode hors-ligne ou en ligne
  const updateDeliveryLocation = (id: string, location: { lat: number; lng: number }) => {
    if (!isOnline || offlineMode) {
      // Stocker la mise à jour en local
      const locationUpdate: LocationUpdate = {
        id,
        location,
        timestamp: Date.now(),
      };

      setOfflineData(prev => ({
        ...prev,
        locationUpdates: [...prev.locationUpdates, locationUpdate],
      }));

      return Promise.resolve({ success: true, offline: true });
    } else {
      // Envoi direct au serveur
      return updateLocationMutation
        .mutateAsync({ id, location })
        .then(() => ({ success: true, offline: false }))
        .catch(error => ({ success: false, error, offline: false }));
    }
  };

  // Mise à jour du statut en mode hors-ligne ou en ligne
  const updateDeliveryStatus = (params: {
    id: string;
    status: DeliveryStatus;
    note?: string;
    verificationCode?: string;
  }) => {
    const { id, status, note, verificationCode } = params;

    if (!isOnline || offlineMode) {
      // Stocker la mise à jour en local
      const statusUpdate: StatusUpdate = {
        id,
        status,
        note,
        verificationCode,
        timestamp: Date.now(),
      };

      setOfflineData(prev => ({
        ...prev,
        statusUpdates: [...prev.statusUpdates, statusUpdate],
      }));

      toast.success('Statut mis à jour localement (mode hors-ligne)');
      return Promise.resolve({ success: true, offline: true });
    } else {
      // Envoi direct au serveur
      return updateStatusMutation
        .mutateAsync(params)
        .then(() => {
          utils.deliveries.getDeliveryById.invalidate({ id });
          utils.deliveries.getDelivererActiveDeliveries.invalidate();
          return { success: true, offline: false };
        })
        .catch(error => ({ success: false, error, offline: false }));
    }
  };

  // Synchronisation des données hors-ligne
  const synchronizeOfflineData = async () => {
    if (isSyncing || (!offlineData.locationUpdates.length && !offlineData.statusUpdates.length)) {
      return;
    }

    setIsSyncing(true);

    try {
      // Synchroniser les mises à jour de position
      if (offlineData.locationUpdates.length > 0) {
        // Regrouper les mises à jour par livraison et ne garder que la plus récente
        const latestLocationUpdates = offlineData.locationUpdates.reduce<
          Record<string, LocationUpdate>
        >((acc, update) => {
          if (!acc[update.id] || acc[update.id].timestamp < update.timestamp) {
            acc[update.id] = update;
          }
          return acc;
        }, {});

        const locationPromises = Object.values(latestLocationUpdates).map(update =>
          updateLocationMutation
            .mutateAsync({
              id: update.id,
              location: update.location,
            })
            .catch(error => {
              console.error('Erreur lors de la synchronisation de la position:', error);
              return null;
            })
        );

        await Promise.all(locationPromises);
      }

      // Synchroniser les mises à jour de statut
      if (offlineData.statusUpdates.length > 0) {
        // Regrouper les mises à jour par livraison et ne garder que la plus récente
        const latestStatusUpdates = offlineData.statusUpdates.reduce<Record<string, StatusUpdate>>(
          (acc, update) => {
            if (!acc[update.id] || acc[update.id].timestamp < update.timestamp) {
              acc[update.id] = update;
            }
            return acc;
          },
          {}
        );

        const statusPromises = Object.values(latestStatusUpdates).map(update =>
          updateStatusMutation
            .mutateAsync({
              id: update.id,
              status: update.status,
              note: update.note,
              verificationCode: update.verificationCode,
            })
            .catch(error => {
              console.error('Erreur lors de la synchronisation du statut:', error);
              return null;
            })
        );

        await Promise.all(statusPromises);
      }

      // Rafraîchir les données
      utils.deliveries.getDelivererActiveDeliveries.invalidate();

      // Réinitialiser les données hors-ligne
      setOfflineData({
        locationUpdates: [],
        statusUpdates: [],
        lastSyncTimestamp: Date.now(),
      });

      toast.success('Synchronisation terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      toast.error('Erreur lors de la synchronisation des données hors-ligne');
    } finally {
      setIsSyncing(false);
    }
  };

  // Statistiques sur les données en attente de synchronisation
  const getPendingUpdatesStats = () => {
    return {
      locationUpdates: offlineData.locationUpdates.length,
      statusUpdates: offlineData.statusUpdates.length,
      lastSyncTimestamp: offlineData.lastSyncTimestamp,
    };
  };

  return {
    isOnline,
    offlineMode,
    isSyncing,
    enableOfflineMode,
    updateDeliveryLocation,
    updateDeliveryStatus,
    synchronizeOfflineData,
    getPendingUpdatesStats,
  };
}
