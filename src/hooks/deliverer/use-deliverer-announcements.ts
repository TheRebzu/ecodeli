import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";

export interface AnnouncementFilters {
  maxDistance?: number;
  minPrice?: number;
  maxPrice?: number;
  deliveryType?: string[];
  urgency?: "LOW" | "MEDIUM" | "HIGH";
  pickupDateStart?: Date;
  pickupDateEnd?: Date;
  sortBy?: "distance" | "price" | "date" | "priority";
  sortOrder?: "asc" | "desc";
}

export interface UseDelivererAnnouncementsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableGeolocation?: boolean;
}

export function useDelivererAnnouncements(
  delivererId: string,
  options: UseDelivererAnnouncementsOptions = {}
) {
  const { 
    autoRefresh = true, 
    refreshInterval = 30000, // 30 secondes
    enableGeolocation = true 
  } = options;

  const { toast } = useToast();
  const { position, error: locationError, isLoading: locationLoading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000 // 1 minute
  });

  const [filters, setFilters] = useState<AnnouncementFilters>({
    maxDistance: 50,
    sortBy: "distance",
    sortOrder: "asc"
  });

  const [applicationStatus, setApplicationStatus] = useState<Record<string, string>>({});

  // Requ�te pour r�cup�rer les annonces disponibles
  const {
    data: announcements,
    isLoading: announcementsLoading,
    error: announcementsError,
    refetch: refetchAnnouncements
  } = api.deliverer.announcements.searchAvailable.useQuery({
    delivererId,
    filters: {
      ...filters,
      location: enableGeolocation && position ? {
        latitude: position.latitude,
        longitude: position.longitude
      } : undefined
    }
  }, {
    enabled: !!delivererId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: false,
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de charger les annonces",
        variant: "destructive"
      });
    }
  });

  // Requ�te pour r�cup�rer les candidatures du livreur
  const {
    data: applications,
    isLoading: applicationsLoading,
    refetch: refetchApplications
  } = api.deliverer.announcements.getMyApplications.useQuery({
    delivererId,
    status: undefined
  }, {
    enabled: !!delivererId,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Mutation pour postuler � une annonce
  const applyToAnnouncementMutation = api.deliverer.announcements.apply.useMutation({
    onSuccess: (application) => {
      setApplicationStatus(prev => ({
        ...prev,
        [application.announcementId]: "PENDING"
      }));
      
      toast({
        title: "Candidature envoy�e",
        description: "Votre candidature a �t� envoy�e avec succ�s",
        variant: "default"
      });

      // Rafra�chir les donn�es
      refetchApplications();
      refetchAnnouncements();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la candidature",
        variant: "destructive"
      });
    }
  });

  // Mutation pour cr�er un trajet planifi�
  const createRouteMutation = api.deliverer.routes.create.useMutation({
    onSuccess: (result) => {
      toast({
        title: "Trajet cr��",
        description: `Trajet cr�� avec succ�s. ${result.matchingAnnouncements.length} annonce(s) correspondante(s) trouv�e(s)`,
        variant: "default"
      });

      // Rafra�chir les annonces
      refetchAnnouncements();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de cr�er le trajet",
        variant: "destructive"
      });
    }
  });

  // Synchroniser le statut des candidatures
  useEffect(() => {
    if (applications?.applications) {
      const statusMap: Record<string, string> = {};
      applications.applications.forEach(app => {
        statusMap[app.announcementId] = app.status;
      });
      setApplicationStatus(statusMap);
    }
  }, [applications]);

  // Fonctions utilitaires
  const updateFilters = useCallback((newFilters: Partial<AnnouncementFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      maxDistance: 50,
      sortBy: "distance",
      sortOrder: "asc"
    });
  }, []);

  const applyToAnnouncement = useCallback(
    (
      announcementId: string, 
      options: {
        proposedPrice?: number;
        estimatedPickupTime?: Date;
        estimatedDeliveryTime?: Date;
        message?: string;
        vehicleType?: string;
      } = {}
    ) => {
      if (applicationStatus[announcementId]) {
        toast({
          title: "Candidature d�j� envoy�e",
          description: "Vous avez d�j� postul� � cette annonce",
          variant: "destructive"
        });
        return;
      }

      applyToAnnouncementMutation.mutate({
        delivererId,
        announcementId,
        ...options
      });
    },
    [delivererId, applicationStatus, applyToAnnouncementMutation, toast]
  );

  const createRoute = useCallback(
    (routeData: {
      startLocation: {
        latitude: number;
        longitude: number;
        address: string;
      };
      endLocation: {
        latitude: number;
        longitude: number;
        address: string;
      };
      plannedDate: Date;
      timeWindow?: {
        start: string;
        end: string;
      };
      vehicleType?: string;
      capacity?: number;
    }) => {
      createRouteMutation.mutate({
        delivererId,
        ...routeData
      });
    },
    [delivererId, createRouteMutation]
  );

  const refreshData = useCallback(() => {
    refetchAnnouncements();
    refetchApplications();
  }, [refetchAnnouncements, refetchApplications]);

  // Calculer les statistiques
  const stats = {
    totalAnnouncements: announcements?.length || 0,
    pendingApplications: applications?.applications.filter(app => app.status === "PENDING").length || 0,
    acceptedApplications: applications?.applications.filter(app => app.status === "ACCEPTED").length || 0,
    rejectedApplications: applications?.applications.filter(app => app.status === "REJECTED").length || 0,
    averageDistance: announcements?.reduce((sum, ann) => sum + (ann.distance || 0), 0) / (announcements?.length || 1) || 0,
    averagePrice: announcements?.reduce((sum, ann) => sum + Number(ann.totalPrice), 0) / (announcements?.length || 1) || 0
  };

  // Utilitaires de tri et filtrage c�t� client
  const sortedAnnouncements = announcements?.slice().sort((a, b) => {
    if (!filters.sortBy) return 0;

    let aValue: any;
    let bValue: any;

    switch (filters.sortBy) {
      case "distance":
        aValue = a.distance || 0;
        bValue = b.distance || 0;
        break;
      case "price":
        aValue = Number(a.totalPrice);
        bValue = Number(b.totalPrice);
        break;
      case "date":
        aValue = new Date(a.preferredPickupDate || a.createdAt);
        bValue = new Date(b.preferredPickupDate || b.createdAt);
        break;
      case "priority":
        const priorityOrder = { "LOW": 1, "MEDIUM": 2, "HIGH": 3 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      default:
        return 0;
    }

    if (filters.sortOrder === "desc") {
      return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });

  const filteredAnnouncements = sortedAnnouncements?.filter(announcement => {
    // Filtrer les annonces pour lesquelles on a d�j� postul�
    if (applicationStatus[announcement.id]) {
      return false;
    }

    // Autres filtres...
    if (filters.minPrice && Number(announcement.totalPrice) < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice && Number(announcement.totalPrice) > filters.maxPrice) {
      return false;
    }

    if (filters.deliveryType && filters.deliveryType.length > 0) {
      if (!filters.deliveryType.includes(announcement.deliveryType)) {
        return false;
      }
    }

    if (filters.urgency && announcement.priority !== filters.urgency) {
      return false;
    }

    if (filters.pickupDateStart && announcement.preferredPickupDate) {
      if (new Date(announcement.preferredPickupDate) < filters.pickupDateStart) {
        return false;
      }
    }

    if (filters.pickupDateEnd && announcement.preferredPickupDate) {
      if (new Date(announcement.preferredPickupDate) > filters.pickupDateEnd) {
        return false;
      }
    }

    return true;
  });

  return {
    // Donn�es
    announcements: filteredAnnouncements || [],
    applications: applications?.applications || [],
    
    // �tats de chargement
    isLoading: announcementsLoading || applicationsLoading,
    isLocationLoading: locationLoading,
    
    // Erreurs
    error: announcementsError || locationError,
    
    // Actions
    applyToAnnouncement,
    createRoute,
    refreshData,
    updateFilters,
    clearFilters,
    
    // �tats des mutations
    isApplying: applyToAnnouncementMutation.isPending,
    isCreatingRoute: createRouteMutation.isPending,
    
    // Filtres et tri
    filters,
    
    // Statuts des candidatures
    applicationStatus,
    
    // Position actuelle
    currentPosition: position,
    
    // Statistiques
    stats,
    
    // Utilitaires
    hasLocation: !!position,
    canApplyTo: (announcementId: string) => !applicationStatus[announcementId],
  };
}

// Hook sp�cialis� pour les notifications d'annonces
export function useAnnouncementNotifications(delivererId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Configuration pour les notifications en temps réel
    // Utilise le polling intégré de tRPC pour l'instant
    // Pas besoin d'interval manuel car tRPC gère déjà le refetchInterval
    return () => {
      // Cleanup si nécessaire
    };
  }, [delivererId]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    clearAll
  };
}

// Hook pour les routes planifi�es
export function useDelivererRoutes(delivererId: string) {
  const { toast } = useToast();

  const {
    data: routes,
    isLoading,
    refetch
  } = api.deliverer.routes.getMyRoutes.useQuery({
    delivererId
  }, {
    enabled: !!delivererId
  });

  const deleteRouteMutation = api.deliverer.routes.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Trajet supprim�",
        description: "Le trajet a �t� supprim� avec succ�s",
        variant: "default"
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le trajet",
        variant: "destructive"
      });
    }
  });

  const deleteRoute = useCallback((routeId: string) => {
    deleteRouteMutation.mutate({ routeId });
  }, [deleteRouteMutation]);

  return {
    routes: routes || [],
    isLoading,
    deleteRoute,
    isDeleting: deleteRouteMutation.isPending,
    refetch
  };
}