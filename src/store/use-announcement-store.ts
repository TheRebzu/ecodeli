import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { api } from "@/trpc/react";
import type {
  Announcement,
  AnnouncementStatus,
  DelivererApplication,
} from "@prisma/client";
import { toast } from "sonner";
import {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementFilterInput,
  CreateAnnouncementApplicationInput,
} from "@/schemas/delivery/announcement.schema";

// Types pour le store
export type AnnouncementWithDetails = Announcement & {
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
  applications?: DelivererApplication[];
};

type AnnouncementFilters = {
  status?: AnnouncementStatus[];
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  fromDate?: Date;
  toDate?: Date;
  type?: string[];
  categories?: string[];
  near?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  sortBy?: "date" | "price" | "distance" | "rating";
  sortOrder?: "asc" | "desc";
};

type AnnouncementState = {
  // Données des annonces
  announcements: AnnouncementWithDetails[];
  currentAnnouncement: AnnouncementWithDetails | null;
  favorites: string[];
  filters: AnnouncementFilters;

  // États de chargement
  isLoading: boolean;
  isLoadingDetails: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isApplying: boolean;

  // Pagination
  page: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;

  // Erreurs
  error: string | null;

  // Timestamps pour la gestion du cache
  lastFetched: number | null;
  lastDetailsUpdated: Record<string, number>;
};

type AnnouncementActions = {
  // Actions de chargement de données
  fetchAnnouncements: (
    filters?: AnnouncementFilterInput,
    reset?: boolean,
  ) => Promise<void>;
  fetchMoreAnnouncements: () => Promise<void>;
  fetchAnnouncementById: (id: string) => Promise<void>;
  refreshCurrentAnnouncement: () => Promise<void>;

  // Actions de gestion des annonces
  createAnnouncement: (data: CreateAnnouncementInput) => Promise<string | null>;
  updateAnnouncement: (
    id: string,
    data: UpdateAnnouncementInput,
  ) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;

  // Actions de statut
  cancelAnnouncement: (id: string, reason: string) => Promise<boolean>;
  publishAnnouncement: (id: string) => Promise<boolean>;
  assignDeliverer: (
    announcementId: string,
    applicationId: string,
  ) => Promise<boolean>;
  confirmDelivery: (
    announcementId: string,
    rating?: number,
    feedback?: string,
  ) => Promise<boolean>;
  reportProblem: (
    announcementId: string,
    problemType: string,
    description: string,
  ) => Promise<boolean>;

  // Actions pour les livreurs
  applyForAnnouncement: (
    announcementId: string,
    data: CreateAnnouncementApplicationInput,
  ) => Promise<boolean>;
  withdrawApplication: (
    announcementId: string,
    applicationId: string,
  ) => Promise<boolean>;

  // Gestion des favoris
  toggleFavorite: (announcementId: string) => void;

  // Gestion des filtres
  setFilters: (filters: Partial<AnnouncementFilters>) => void;
  resetFilters: () => void;

  // Utilitaires
  resetError: () => void;
  clearCurrentAnnouncement: () => void;
};

// Constantes pour le cache
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const DEFAULT_LIMIT = 10;

// Store Zustand
const useAnnouncementStore = create<AnnouncementState & AnnouncementActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // État initial
        announcements: [],
        currentAnnouncement: null,
        favorites: [],
        filters: {},

        isLoading: false,
        isLoadingDetails: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        isApplying: false,

        page: 1,
        limit: DEFAULT_LIMIT,
        totalCount: 0,
        hasMore: false,

        error: null,

        lastFetched: null,
        lastDetailsUpdated: {},

        // Actions pour récupérer les annonces
        fetchAnnouncements: async (filters = {}, reset = false) => {
          try {
            const currentState = get();
            // Si on a déjà des données récentes et que rien n'a changé, utiliser le cache
            const now = Date.now();
            if (
              !reset &&
              currentState.lastFetched &&
              now - currentState.lastFetched < CACHE_DURATION &&
              JSON.stringify(currentState.filters) ===
                JSON.stringify(filters) &&
              currentState.announcements.length > 0
            ) {
              return;
            }

            set({ isLoading: true, error: null });

            const newPage = reset ? 1 : currentState.page;
            const mergedFilters = reset
              ? { ...filters }
              : { ...currentState.filters, ...filters };

            const result = await api.announcement.getAnnouncements.query({
              ...mergedFilters,
              page: newPage,
              limit: currentState.limit,
            });

            set((state) => {
              state.isLoading = false;
              state.announcements = reset
                ? result.items
                : [...state.announcements, ...result.items];
              state.totalCount = result.totalCount;
              state.hasMore = result.items.length >= state.limit;
              state.page = newPage;
              state.filters = mergedFilters;
              state.lastFetched = now;

              // Marquer les favoris
              state.announcements = state.announcements.map((ann) => ({
                ...ann,
                isFavorite: state.favorites.includes(ann.id),
              }));
            });
          } catch (error) {
            set({
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors du chargement des annonces",
            });
            toast.error("Impossible de charger les annonces");
          }
        },

        fetchMoreAnnouncements: async () => {
          const { isLoading, hasMore, page } = get();
          if (isLoading || !hasMore) return;

          set((state) => {
            state.page = page + 1;
          });

          await get().fetchAnnouncements();
        },

        fetchAnnouncementById: async (id) => {
          try {
            const currentState = get();
            // Vérifier si nous avons des données récentes pour cette annonce
            const now = Date.now();
            const lastUpdated = currentState.lastDetailsUpdated[id] || 0;

            // Si l'annonce est déjà chargée et les données sont récentes, utiliser le cache
            if (
              currentState.currentAnnouncement?.id === id &&
              now - lastUpdated < CACHE_DURATION
            ) {
              return;
            }

            set({ isLoadingDetails: true, error: null });

            const result = await api.announcement.getAnnouncementById.query({
              id,
            });

            set((state) => {
              state.isLoadingDetails = false;
              state.currentAnnouncement = {
                ...result,
                isFavorite: state.favorites.includes(id),
              };
              state.lastDetailsUpdated[id] = now;
            });
          } catch (error) {
            set({
              isLoadingDetails: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors du chargement de l'annonce",
            });
            toast.error("Impossible de charger les détails de l'annonce");
          }
        },

        refreshCurrentAnnouncement: async () => {
          const { currentAnnouncement } = get();
          if (currentAnnouncement) {
            await get().fetchAnnouncementById(currentAnnouncement.id);
          }
        },

        // Actions de gestion des annonces
        createAnnouncement: async (data) => {
          try {
            set({ isCreating: true, error: null });

            const result =
              await api.announcement.createAnnouncement.mutate(data);

            set((state) => {
              state.isCreating = false;
              // Ajouter l'annonce créée à la liste si elle existe déjà
              if (state.announcements.length > 0) {
                state.announcements.unshift(result);
              }
            });

            toast.success("Annonce créée avec succès");
            return result.id;
          } catch (error) {
            set({
              isCreating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la création de l'annonce",
            });
            toast.error("Impossible de créer l'annonce");
            return null;
          }
        },

        updateAnnouncement: async (id, data) => {
          try {
            set({ isUpdating: true, error: null });

            const result = await api.announcement.updateAnnouncement.mutate({
              id,
              ...data,
            });

            set((state) => {
              state.isUpdating = false;

              // Mettre à jour l'annonce dans la liste
              state.announcements = state.announcements.map((ann) =>
                ann.id === id ? { ...ann, ...result } : ann,
              );

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === id) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  ...result,
                };
                state.lastDetailsUpdated[id] = Date.now();
              }
            });

            toast.success("Annonce mise à jour avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la mise à jour de l'annonce",
            });
            toast.error("Impossible de mettre à jour l'annonce");
            return false;
          }
        },

        deleteAnnouncement: async (id) => {
          try {
            set({ isDeleting: true, error: null });

            await api.announcement.deleteAnnouncement.mutate({ id });

            set((state) => {
              state.isDeleting = false;

              // Supprimer l'annonce de la liste
              state.announcements = state.announcements.filter(
                (ann) => ann.id !== id,
              );

              // Réinitialiser l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === id) {
                state.currentAnnouncement = null;
              }

              // Supprimer des favoris si présente
              state.favorites = state.favorites.filter((favId) => favId !== id);
            });

            toast.success("Annonce supprimée avec succès");
            return true;
          } catch (error) {
            set({
              isDeleting: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la suppression de l'annonce",
            });
            toast.error("Impossible de supprimer l'annonce");
            return false;
          }
        },

        // Actions de statut
        cancelAnnouncement: async (id, reason) => {
          try {
            set({ isUpdating: true, error: null });

            const result = await api.announcement.cancelAnnouncement.mutate({
              id,
              reason,
            });

            set((state) => {
              state.isUpdating = false;

              // Mettre à jour le statut dans la liste
              state.announcements = state.announcements.map((ann) =>
                ann.id === id
                  ? { ...ann, status: "CANCELLED", cancelReason: reason }
                  : ann,
              );

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === id) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  status: "CANCELLED",
                  cancelReason: reason,
                };
                state.lastDetailsUpdated[id] = Date.now();
              }
            });

            toast.success("Annonce annulée avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de l'annulation de l'annonce",
            });
            toast.error("Impossible d'annuler l'annonce");
            return false;
          }
        },

        publishAnnouncement: async (id) => {
          try {
            set({ isUpdating: true, error: null });

            const result = await api.announcement.publishAnnouncement.mutate({
              id,
            });

            set((state) => {
              state.isUpdating = false;

              // Mettre à jour le statut dans la liste
              state.announcements = state.announcements.map((ann) =>
                ann.id === id ? { ...ann, status: "PUBLISHED" } : ann,
              );

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === id) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  status: "PUBLISHED",
                };
                state.lastDetailsUpdated[id] = Date.now();
              }
            });

            toast.success("Annonce publiée avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la publication de l'annonce",
            });
            toast.error("Impossible de publier l'annonce");
            return false;
          }
        },

        assignDeliverer: async (announcementId, applicationId) => {
          try {
            set({ isUpdating: true, error: null });

            const result = await api.announcement.assignDeliverer.mutate({
              announcementId,
              applicationId,
            });

            set((state) => {
              state.isUpdating = false;

              // Trouver les détails de l'application sélectionnée
              const selectedApplication =
                state.currentAnnouncement?.applications?.find(
                  (app) => app.id === applicationId,
                );

              // Mettre à jour le statut et le livreur dans la liste
              state.announcements = state.announcements.map((ann) =>
                ann.id === announcementId
                  ? {
                      ...ann,
                      status: "ASSIGNED",
                      delivererId: selectedApplication?.delivererId,
                    }
                  : ann,
              );

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === announcementId) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  status: "ASSIGNED",
                  delivererId: selectedApplication?.delivererId,
                  // Mettre à jour les applications pour montrer celle qui a été acceptée
                  applications: state.currentAnnouncement.applications?.map(
                    (app) => ({
                      ...app,
                      status:
                        app.id === applicationId ? "ACCEPTED" : "REJECTED",
                    }),
                  ),
                };
                state.lastDetailsUpdated[announcementId] = Date.now();
              }
            });

            toast.success("Livreur assigné avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de l'assignation du livreur",
            });
            toast.error("Impossible d'assigner le livreur");
            return false;
          }
        },

        confirmDelivery: async (announcementId, rating, feedback) => {
          try {
            set({ isUpdating: true, error: null });

            await api.deliveryTracking.confirmDelivery.mutate({
              announcementId,
              rating,
              feedback,
            });

            set((state) => {
              state.isUpdating = false;

              // Mettre à jour le statut dans la liste
              state.announcements = state.announcements.map((ann) =>
                ann.id === announcementId
                  ? { ...ann, status: "COMPLETED" }
                  : ann,
              );

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === announcementId) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  status: "COMPLETED",
                  completedAt: new Date(),
                };
                state.lastDetailsUpdated[announcementId] = Date.now();
              }
            });

            toast.success("Livraison confirmée avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la confirmation de livraison",
            });
            toast.error("Impossible de confirmer la livraison");
            return false;
          }
        },

        reportProblem: async (announcementId, problemType, description) => {
          try {
            set({ isUpdating: true, error: null });

            await api.deliveryTracking.reportDeliveryProblem.mutate({
              announcementId,
              problemType,
              description,
            });

            set((state) => {
              state.isUpdating = false;

              // Mettre à jour le statut dans la liste
              state.announcements = state.announcements.map((ann) =>
                ann.id === announcementId ? { ...ann, status: "PROBLEM" } : ann,
              );

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === announcementId) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  status: "PROBLEM",
                };
                state.lastDetailsUpdated[announcementId] = Date.now();
              }
            });

            toast.success("Problème signalé avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors du signalement de problème",
            });
            toast.error("Impossible de signaler le problème");
            return false;
          }
        },

        // Actions pour les livreurs
        applyForAnnouncement: async (announcementId, data) => {
          try {
            set({ isApplying: true, error: null });

            const application =
              await api.announcement.applyForAnnouncement.mutate({
                announcementId,
                ...data,
              });

            set((state) => {
              state.isApplying = false;

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === announcementId) {
                const applications =
                  state.currentAnnouncement.applications || [];
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  applications: [...applications, application],
                };
                state.lastDetailsUpdated[announcementId] = Date.now();
              }
            });

            toast.success("Candidature envoyée avec succès");
            return true;
          } catch (error) {
            set({
              isApplying: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors de la candidature",
            });
            toast.error("Impossible d'envoyer la candidature");
            return false;
          }
        },

        withdrawApplication: async (announcementId, applicationId) => {
          try {
            set({ isUpdating: true, error: null });

            await api.announcement.withdrawApplication.mutate({
              announcementId,
              applicationId,
            });

            set((state) => {
              state.isUpdating = false;

              // Mettre à jour l'annonce courante si c'est celle-ci
              if (state.currentAnnouncement?.id === announcementId) {
                state.currentAnnouncement = {
                  ...state.currentAnnouncement,
                  applications: state.currentAnnouncement.applications?.filter(
                    (app) => app.id !== applicationId,
                  ),
                };
                state.lastDetailsUpdated[announcementId] = Date.now();
              }
            });

            toast.success("Candidature retirée avec succès");
            return true;
          } catch (error) {
            set({
              isUpdating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Erreur lors du retrait de candidature",
            });
            toast.error("Impossible de retirer la candidature");
            return false;
          }
        },

        // Gestion des favoris
        toggleFavorite: (announcementId) => {
          set((state) => {
            const isFavorite = state.favorites.includes(announcementId);

            if (isFavorite) {
              // Retirer des favoris
              state.favorites = state.favorites.filter(
                (id) => id !== announcementId,
              );
            } else {
              // Ajouter aux favoris
              state.favorites.push(announcementId);
            }

            // Mettre à jour l'indicateur dans la liste
            state.announcements = state.announcements.map((ann) =>
              ann.id === announcementId
                ? { ...ann, isFavorite: !isFavorite }
                : ann,
            );

            // Mettre à jour l'annonce courante si c'est celle-ci
            if (state.currentAnnouncement?.id === announcementId) {
              state.currentAnnouncement = {
                ...state.currentAnnouncement,
                isFavorite: !isFavorite,
              };
            }
          });

          // Sauvegarder l'état des favoris sur le serveur
          try {
            api.user.toggleFavoriteAnnouncement.mutate({ announcementId });
          } catch (error) {
            console.error("Erreur lors de la sauvegarde des favoris:", error);
            // Ne pas afficher d'erreur à l'utilisateur pour ne pas perturber l'expérience
          }
        },

        // Gestion des filtres
        setFilters: (filters) => {
          set((state) => {
            state.filters = { ...state.filters, ...filters };
          });
        },

        resetFilters: () => {
          set((state) => {
            state.filters = {};
          });
        },

        // Utilitaires
        resetError: () => {
          set({ error: null });
        },

        clearCurrentAnnouncement: () => {
          set({ currentAnnouncement: null });
        },
      })),
      {
        name: "announcement-store",
        // Ne persister que les favoris pour éviter les problèmes de données stales
        partialize: (state) => ({ favorites: state.favorites }),
      },
    ),
  ),
);

export default useAnnouncementStore;

// Sélecteurs optimisés pour éviter les re-rendus inutiles
export const useAnnouncementList = () =>
  useAnnouncementStore((state) => ({
    announcements: state.announcements,
    isLoading: state.isLoading,
    error: state.error,
    filters: state.filters,
    hasMore: state.hasMore,
    totalCount: state.totalCount,
    fetchAnnouncements: state.fetchAnnouncements,
    fetchMoreAnnouncements: state.fetchMoreAnnouncements,
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
  }));

export const useAnnouncementDetails = (id?: string) =>
  useAnnouncementStore((state) => ({
    announcement: state.currentAnnouncement,
    isLoading: state.isLoadingDetails,
    isUpdating: state.isUpdating,
    error: state.error,
    fetchAnnouncement: state.fetchAnnouncementById,
    refresh: state.refreshCurrentAnnouncement,
    toggleFavorite: state.toggleFavorite,
  }));

export const useAnnouncementActions = () =>
  useAnnouncementStore((state) => ({
    create: state.createAnnouncement,
    update: state.updateAnnouncement,
    delete: state.deleteAnnouncement,
    cancel: state.cancelAnnouncement,
    publish: state.publishAnnouncement,
    assignDeliverer: state.assignDeliverer,
    confirmDelivery: state.confirmDelivery,
    reportProblem: state.reportProblem,
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    isDeleting: state.isDeleting,
    error: state.error,
    resetError: state.resetError,
  }));

export const useDelivererActions = () =>
  useAnnouncementStore((state) => ({
    apply: state.applyForAnnouncement,
    withdraw: state.withdrawApplication,
    isApplying: state.isApplying,
    isUpdating: state.isUpdating,
    error: state.error,
    resetError: state.resetError,
  }));
