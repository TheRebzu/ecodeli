import { useState, useCallback, useEffect } from 'react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import useAnnouncementStore, { useAnnouncementList } from '@/store/use-announcement-store';
import type { AnnouncementStatus, AnnouncementType, Announcement } from '@prisma/client';
import {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementFilterInput,
  CreateAnnouncementApplicationInput,
} from '@/schemas/announcement.schema';

type AnnouncementWithDetails = Announcement & {
  client?: {
    id: string;
    name: string;
    image?: string | null;
    rating?: number;
  };
  deliverer?: {
    id: string;
    userId: string;
    name: string;
    image?: string | null;
    rating?: number;
  };
  applications?: Array<{
    id: string;
    delivererId: string;
    status: string;
    proposedPrice: number;
    createdAt: Date;
  }>;
  isFavorite?: boolean;
};

type AnnouncementResponse = {
  items: AnnouncementWithDetails[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

type UseAnnouncementOptions = {
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  initialFilter?: Partial<AnnouncementFilterInput>;
};

/**
 * Hook principal pour la gestion des annonces
 */
export const useAnnouncement = (options: UseAnnouncementOptions = {}) => {
  const {
    enableAutoRefresh = true,
    refreshInterval = 60000, // 1 minute
    initialFilter = { page: 1, limit: 10 },
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<AnnouncementWithDetails | null>(
    null
  );
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Partial<AnnouncementFilterInput>>(initialFilter);

  const router = useRouter();

  // Utiliser le store Zustand pour les opérations plus complexes
  const {
    toggleFavorite,
    fetchAnnouncements: fetchFromStore,
    setFilters: setStoreFilters,
  } = useAnnouncementStore();

  /**
   * Récupère la liste des annonces avec filtrage
   */
  const fetchAnnouncements = useCallback(
    async (page: number = 1, filter: Partial<AnnouncementFilterInput> = {}) => {
      try {
        setIsLoading(true);
        setError(null);

        const mergedFilter = { ...filters, ...filter, page } as AnnouncementFilterInput;
        setFilters(mergedFilter);

        // Mettre à jour également le store pour la cohérence
        setStoreFilters(mergedFilter);

        // Utiliser la procédure tRPC getAll
        const response = await api.announcement.getAll.query(mergedFilter);

        setAnnouncements(response.items);
        setTotalCount(response.totalCount);
        setCurrentPage(response.currentPage);
        setTotalPages(response.totalPages);

        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement des annonces';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [filters, setStoreFilters]
  );

  /**
   * Récupère les détails d'une annonce spécifique
   */
  const fetchAnnouncementById = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.announcement.getById.query({ id });
      setCurrentAnnouncement(response);

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Erreur lors du chargement de l'annonce ${id}`;
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Crée une nouvelle annonce
   */
  const createAnnouncement = useCallback(async (data: CreateAnnouncementInput) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await api.announcement.create.mutate(data);

      toast.success('Annonce créée avec succès');

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la création de l'annonce";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Met à jour une annonce existante
   */
  const updateAnnouncement = useCallback(
    async (id: string, data: UpdateAnnouncementInput) => {
      try {
        setIsSaving(true);
        setError(null);

        const response = await api.announcement.update.mutate({
          id,
          ...data,
        });

        // Mettre à jour l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === id) {
          setCurrentAnnouncement({ ...currentAnnouncement, ...response });
        }

        toast.success('Annonce mise à jour avec succès');

        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la mise à jour de l'annonce";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Supprime une annonce
   */
  const deleteAnnouncement = useCallback(
    async (id: string) => {
      try {
        setIsDeleting(true);
        setError(null);

        await api.announcement.delete.mutate({ id });

        // Retirer l'annonce de la liste locale
        setAnnouncements(prev => prev.filter(a => a.id !== id));

        // Réinitialiser l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === id) {
          setCurrentAnnouncement(null);
        }

        toast.success('Annonce supprimée avec succès');

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la suppression de l'annonce";
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Publie une annonce
   */
  const publishAnnouncement = useCallback(
    async (id: string) => {
      try {
        setIsSaving(true);
        setError(null);

        const result = await api.announcement.publish.mutate({ id });

        // Mettre à jour l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === id) {
          setCurrentAnnouncement({
            ...currentAnnouncement,
            status: 'PUBLISHED' as AnnouncementStatus,
          });
        }

        toast.success('Annonce publiée avec succès');

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la publication de l'annonce";
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Annule une annonce
   */
  const cancelAnnouncement = useCallback(
    async (id: string, reason: string) => {
      try {
        setIsSaving(true);
        setError(null);

        await api.announcement.updateStatus.mutate({
          id,
          status: 'CANCELLED',
          cancelReason: reason,
        });

        // Mettre à jour l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === id) {
          setCurrentAnnouncement({
            ...currentAnnouncement,
            status: 'CANCELLED' as AnnouncementStatus,
            cancelReason: reason,
          });
        }

        toast.success('Annonce annulée avec succès');

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'annulation de l'annonce";
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Assigne un livreur à une annonce
   */
  const assignDeliverer = useCallback(
    async (announcementId: string, applicationId: string) => {
      try {
        setIsSaving(true);
        setError(null);

        const result = await api.announcement.assignDeliverer.mutate({
          announcementId,
          applicationId,
        });

        // Mettre à jour l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === announcementId) {
          // Trouver les détails de l'application sélectionnée
          const selectedApplication = currentAnnouncement.applications?.find(
            app => app.id === applicationId
          );

          if (selectedApplication) {
            setCurrentAnnouncement({
              ...currentAnnouncement,
              status: 'ASSIGNED' as AnnouncementStatus,
              delivererId: selectedApplication.delivererId,
              // Mettre à jour les applications pour montrer celle qui a été acceptée
              applications: currentAnnouncement.applications?.map(app => ({
                ...app,
                status: app.id === applicationId ? 'ACCEPTED' : 'REJECTED',
              })),
            });
          }
        }

        toast.success('Livreur assigné avec succès');

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'assignation du livreur";
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Effectue le processus de paiement pour une annonce
   */
  const payForAnnouncement = useCallback(
    async (announcementId: string, paymentMethodId?: string) => {
      try {
        setIsSaving(true);
        setError(null);

        // Requête au routeur de paiement
        const result = await api.payment.createForAnnouncement.mutate({
          announcementId,
          paymentMethodId,
        });

        if (result && result.clientSecret) {
          // Redirection vers la page de confirmation de paiement
          router.push(
            `/client/announcements/${announcementId}/payment/confirm?session=${result.clientSecret}`
          );
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du paiement';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [router]
  );

  /**
   * Confirme le paiement d'une annonce
   */
  const confirmPayment = useCallback(async (clientSecret: string) => {
    try {
      setIsSaving(true);
      setError(null);

      const result = await api.payment.confirmPayment.mutate({
        clientSecret,
      });

      if (result.success) {
        toast.success('Paiement confirmé avec succès');
      } else {
        setError(result.error || 'Erreur lors de la confirmation du paiement');
        toast.error(result.error || 'Erreur lors de la confirmation du paiement');
      }

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la confirmation du paiement';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Postule pour une annonce (livreur)
   */
  const applyForAnnouncement = useCallback(
    async (announcementId: string, data: CreateAnnouncementApplicationInput) => {
      try {
        setIsSaving(true);
        setError(null);

        const result = await api.announcement.applyForAnnouncement.mutate({
          announcementId,
          ...data,
        });

        // Mettre à jour l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === announcementId) {
          const applications = currentAnnouncement.applications || [];
          setCurrentAnnouncement({
            ...currentAnnouncement,
            applications: [...applications, result],
          });
        }

        toast.success('Candidature envoyée avec succès');

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la candidature';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Retire une candidature (livreur)
   */
  const withdrawApplication = useCallback(
    async (announcementId: string, applicationId: string) => {
      try {
        setIsSaving(true);
        setError(null);

        await api.announcement.updateApplicationStatus.mutate({
          applicationId,
          status: 'WITHDRAWN',
        });

        // Mettre à jour l'annonce courante si c'est celle-ci
        if (currentAnnouncement && currentAnnouncement.id === announcementId) {
          setCurrentAnnouncement({
            ...currentAnnouncement,
            applications: currentAnnouncement.applications?.filter(app => app.id !== applicationId),
          });
        }

        toast.success('Candidature retirée avec succès');

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du retrait de candidature';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentAnnouncement]
  );

  /**
   * Ajoute/retire une annonce des favoris
   */
  const addToFavorites = useCallback(
    (id: string) => {
      // Utiliser la fonction du store pour gérer les favoris
      toggleFavorite(id);

      // Mettre à jour la liste locale
      setAnnouncements(prev =>
        prev.map(ann => (ann.id === id ? { ...ann, isFavorite: !ann.isFavorite } : ann))
      );

      // Mettre à jour l'annonce courante si c'est celle-ci
      if (currentAnnouncement && currentAnnouncement.id === id) {
        setCurrentAnnouncement({
          ...currentAnnouncement,
          isFavorite: !currentAnnouncement.isFavorite,
        });
      }
    },
    [toggleFavorite, currentAnnouncement]
  );

  // Effet pour l'auto-refresh si activé
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (enableAutoRefresh) {
      interval = setInterval(() => {
        fetchAnnouncements(currentPage, filters);
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [enableAutoRefresh, refreshInterval, currentPage, filters, fetchAnnouncements]);

  return {
    // États
    isLoading,
    isSaving,
    isDeleting,
    error,

    // Données
    announcements,
    currentAnnouncement,
    totalCount,
    currentPage,
    totalPages,
    filters,

    // Actions principales
    fetchAnnouncements,
    fetchAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,

    // Gestion du statut
    publishAnnouncement,
    cancelAnnouncement,
    assignDeliverer,

    // Paiement
    payForAnnouncement,
    confirmPayment,

    // Actions livreur
    applyForAnnouncement,
    withdrawApplication,

    // Favoris
    addToFavorites,

    // Utilitaires
    setFilters,
    resetError: () => setError(null),
  };
};

/**
 * Hook pour gérer les annonces d'un client spécifique
 */
export const useClientAnnouncements = (options: UseAnnouncementOptions = {}) => {
  const [myAnnouncements, setMyAnnouncements] = useState<AnnouncementWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    initialFilter = {
      page: 1,
      limit: 10,
    },
  } = options;

  const [filters, setFilters] = useState<Partial<AnnouncementFilterInput>>(initialFilter);

  /**
   * Récupère les annonces du client connecté
   */
  const fetchMyAnnouncements = useCallback(
    async (page: number = 1) => {
      try {
        setIsLoading(true);
        setError(null);

        const updatedFilters = { ...filters, page } as AnnouncementFilterInput;

        const response = await api.announcement.getMyAnnouncements.query(updatedFilters);

        setMyAnnouncements(response.items);

        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement de vos annonces';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  /**
   * Récupère les annonces en cours du client
   */
  const fetchActiveAnnouncements = useCallback(async () => {
    const activeFilters = {
      ...filters,
      status: ['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED', 'IN_PROGRESS'] as AnnouncementStatus[],
      page: 1,
    };

    setFilters(activeFilters);
    return fetchMyAnnouncements(1);
  }, [filters, fetchMyAnnouncements]);

  /**
   * Récupère l'historique des annonces du client
   */
  const fetchAnnouncementHistory = useCallback(async () => {
    const historyFilters = {
      ...filters,
      status: ['COMPLETED', 'CANCELLED', 'PAID'] as AnnouncementStatus[],
      page: 1,
    };

    setFilters(historyFilters);
    return fetchMyAnnouncements(1);
  }, [filters, fetchMyAnnouncements]);

  // On utilise useEffect avec une dépendance vide pour ne charger qu'une seule fois au montage
  // La fonction fetchMyAnnouncements contient des dépendances qui changent à chaque rendu
  useEffect(() => {
    // Charger les annonces du client au montage uniquement
    const initialLoad = async () => {
      await fetchMyAnnouncements(1);
    };
    
    initialLoad();
    // Tableau de dépendances vide pour éviter les rechargements en boucle
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    myAnnouncements,
    isLoading,
    error,
    filters,
    fetchMyAnnouncements,
    fetchActiveAnnouncements,
    fetchAnnouncementHistory,
    setFilters,
    resetError: () => setError(null),
  };
};

/**
 * Hook pour gérer les annonces disponibles pour un livreur
 */
export const useDelivererAnnouncements = (options: UseAnnouncementOptions = {}) => {
  const [availableAnnouncements, setAvailableAnnouncements] = useState<AnnouncementWithDetails[]>(
    []
  );
  const [myAssignedAnnouncements, setMyAssignedAnnouncements] = useState<AnnouncementWithDetails[]>(
    []
  );
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    initialFilter = {
      page: 1,
      limit: 10,
    },
  } = options;

  const [filters, setFilters] = useState<Partial<AnnouncementFilterInput>>(initialFilter);

  /**
   * Récupère les annonces disponibles pour les livreurs
   */
  const fetchAvailableAnnouncements = useCallback(
    async (page: number = 1) => {
      try {
        setIsLoading(true);
        setError(null);

        const updatedFilters = {
          ...filters,
          status: ['PUBLISHED', 'IN_APPLICATION'] as AnnouncementStatus[],
          page,
        } as AnnouncementFilterInput;

        // Utiliser la recherche avec filtre de statut
        const response = await api.announcement.search.query(updatedFilters);

        setAvailableAnnouncements(response.announcements);

        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement des annonces disponibles';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  /**
   * Récupère les annonces assignées au livreur connecté
   */
  const fetchMyAssignedAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.announcement.getAssignedToDeliverer.query({});

      setMyAssignedAnnouncements(response.announcements);

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement de vos livraisons';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupère les candidatures du livreur
   */
  const fetchMyApplications = useCallback(async () => {
    try {
      setIsLoadingApplications(true);
      setError(null);

      // Cette route n'existe pas spécifiquement, utiliser la route de recherche
      const response = await api.announcement.search.query({
        hasApplied: true,
        page: 1,
        limit: 20,
      });

      setMyApplications(response.announcements);

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement de vos candidatures';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  /**
   * Filtre les annonces par proximité géographique
   */
  const filterByProximity = useCallback(
    async (latitude: number, longitude: number, radius: number = 10) => {
      const proximityFilter = {
        ...filters,
        near: {
          latitude,
          longitude,
          radius,
        },
      };

      setFilters(proximityFilter);
      return fetchAvailableAnnouncements(1);
    },
    [filters, fetchAvailableAnnouncements]
  );

  useEffect(() => {
    // Charger les annonces disponibles au montage
    fetchAvailableAnnouncements(1);
  }, [fetchAvailableAnnouncements]);

  return {
    availableAnnouncements,
    myAssignedAnnouncements,
    myApplications,
    isLoading,
    isLoadingApplications,
    error,
    filters,
    fetchAvailableAnnouncements,
    fetchMyAssignedAnnouncements,
    fetchMyApplications,
    filterByProximity,
    setFilters,
    resetError: () => setError(null),
  };
};

export default useAnnouncement;
