import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../trpc/react';
import { toast } from 'sonner';
import { AnnouncementStatus, AnnouncementType, AnnouncementPriority } from '@/types/announcement';
import {
  CreateAnnouncementSchemaType,
  UpdateAnnouncementSchemaType,
  AnnouncementFiltersSchemaType,
} from '@/schemas/announcement.schema';

export function useAnnouncement() {
  const router = useRouter();
  const utils = api.useUtils();

  // État local pour la pagination et les filtres
  const [filters, setFilters] = useState<AnnouncementFiltersSchemaType>({
    limit: 10,
    offset: 0,
    sortOrder: 'desc',
    sortBy: 'createdAt',
  });

  // Récupération des annonces du client
  const myAnnouncements = api.announcement.getMyAnnouncements.useQuery({
    limit: filters.limit || 10,
    offset: filters.offset || 0,
    status: filters.status as AnnouncementStatus | undefined,
  });

  // Récupération de toutes les annonces avec filtres
  const allAnnouncements = api.announcement.getAll.useQuery(filters, {
    enabled: Object.keys(filters).length > 2, // Active la requête uniquement si des filtres sont définis
  });

  // Récupération d'une annonce par ID
  const getAnnouncementById = (id: string) => {
    return api.announcement.getById.useQuery({ id });
  };

  // Création d'une annonce
  const createAnnouncementMutation = api.announcement.create.useMutation({
    onSuccess: () => {
      // Invalider les requêtes pour recharger les données
      utils.announcement.getMyAnnouncements.invalidate();
      utils.announcement.getAll.invalidate();

      toast.success('Annonce créée avec succès');
      router.push('/client/announcements');
    },
    onError: error => {
      toast.error(error.message || "Erreur lors de la création de l'annonce");
    },
  });

  const createAnnouncement = (data: CreateAnnouncementSchemaType) => {
    createAnnouncementMutation.mutate(data);
  };

  // Mise à jour d'une annonce
  const updateAnnouncementMutation = api.announcement.update.useMutation({
    onSuccess: () => {
      // Invalider les requêtes pour recharger les données
      utils.announcement.getMyAnnouncements.invalidate();
      utils.announcement.getById.invalidate();
      utils.announcement.getAll.invalidate();

      toast.success('Annonce mise à jour avec succès');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || "Erreur lors de la mise à jour de l'annonce");
    },
  });

  const updateAnnouncement = (data: UpdateAnnouncementSchemaType) => {
    updateAnnouncementMutation.mutate(data);
  };

  // Suppression d'une annonce
  const deleteAnnouncementMutation = api.announcement.delete.useMutation({
    onSuccess: () => {
      // Invalider les requêtes pour recharger les données
      utils.announcement.getMyAnnouncements.invalidate();
      utils.announcement.getAll.invalidate();

      toast.success('Annonce supprimée avec succès');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || "Erreur lors de la suppression de l'annonce");
    },
  });

  const deleteAnnouncement = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      deleteAnnouncementMutation.mutate({ id });
    }
  };

  // Publication d'une annonce
  const publishAnnouncementMutation = api.announcement.publish.useMutation({
    onSuccess: () => {
      // Invalider les requêtes pour recharger les données
      utils.announcement.getMyAnnouncements.invalidate();
      utils.announcement.getById.invalidate();
      utils.announcement.getAll.invalidate();

      toast.success('Annonce publiée avec succès');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || "Erreur lors de la publication de l'annonce");
    },
  });

  const publishAnnouncement = (id: string) => {
    publishAnnouncementMutation.mutate({ id });
  };

  // Définir l'annonce comme complétée
  const completeAnnouncementMutation = api.announcement.complete.useMutation({
    onSuccess: () => {
      // Invalider les requêtes pour recharger les données
      utils.announcement.getMyAnnouncements.invalidate();
      utils.announcement.getById.invalidate();
      utils.announcement.getAll.invalidate();

      toast.success('Annonce marquée comme complétée');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || "Erreur lors de la complétion de l'annonce");
    },
  });

  const completeAnnouncement = (id: string) => {
    completeAnnouncementMutation.mutate({ id });
  };

  // Gestion des filtres
  const updateFilters = (newFilters: Partial<AnnouncementFiltersSchemaType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 })); // Réinitialiser l'offset lors du changement de filtre
  };

  // Gestion de la pagination
  const nextPage = () => {
    setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 10) }));
  };

  const prevPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: Math.max(0, (prev.offset || 0) - (prev.limit || 10)),
    }));
  };

  // Liste des types d'annonces pour les formulaires
  const announcementTypes = Object.values(AnnouncementType).map(type => ({
    value: type,
    label: getAnnouncementTypeLabel(type),
  }));

  // Liste des priorités pour les formulaires
  const announcementPriorities = Object.values(AnnouncementPriority).map(priority => ({
    value: priority,
    label: getAnnouncementPriorityLabel(priority),
  }));

  // Liste des statuts pour les filtres
  const announcementStatuses = Object.values(AnnouncementStatus).map(status => ({
    value: status,
    label: getAnnouncementStatusLabel(status),
  }));

  // Fonctions utilitaires pour les libellés
  function getAnnouncementTypeLabel(type: AnnouncementType): string {
    const typeLabels: Record<AnnouncementType, string> = {
      [AnnouncementType.PACKAGE]: 'Colis',
      [AnnouncementType.GROCERIES]: 'Courses',
      [AnnouncementType.DOCUMENTS]: 'Documents',
      [AnnouncementType.MEAL]: 'Repas',
      [AnnouncementType.FURNITURE]: 'Meubles',
      [AnnouncementType.OTHER]: 'Autre',
    };

    return typeLabels[type] || type;
  }

  function getAnnouncementPriorityLabel(priority: AnnouncementPriority): string {
    const priorityLabels: Record<AnnouncementPriority, string> = {
      [AnnouncementPriority.LOW]: 'Basse',
      [AnnouncementPriority.MEDIUM]: 'Moyenne',
      [AnnouncementPriority.HIGH]: 'Élevée',
      [AnnouncementPriority.URGENT]: 'Urgente',
    };

    return priorityLabels[priority] || priority;
  }

  function getAnnouncementStatusLabel(status: AnnouncementStatus): string {
    const statusLabels: Record<AnnouncementStatus, string> = {
      [AnnouncementStatus.DRAFT]: 'Brouillon',
      [AnnouncementStatus.PENDING]: 'En attente',
      [AnnouncementStatus.PUBLISHED]: 'Publiée',
      [AnnouncementStatus.ASSIGNED]: 'Attribuée',
      [AnnouncementStatus.IN_PROGRESS]: 'En cours',
      [AnnouncementStatus.COMPLETED]: 'Terminée',
      [AnnouncementStatus.CANCELLED]: 'Annulée',
    };

    return statusLabels[status] || status;
  }

  return {
    // Récupération des données
    myAnnouncements: myAnnouncements.data,
    allAnnouncements: allAnnouncements.data,
    getAnnouncementById,
    isLoading: myAnnouncements.isLoading || allAnnouncements.isLoading,

    // Actions
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    completeAnnouncement,

    // État des mutations
    isCreating: createAnnouncementMutation.isPending,
    isUpdating: updateAnnouncementMutation.isPending,
    isDeleting: deleteAnnouncementMutation.isPending,
    isPublishing: publishAnnouncementMutation.isPending,
    isCompleting: completeAnnouncementMutation.isPending,

    // Gestion des filtres
    filters,
    updateFilters,
    nextPage,
    prevPage,

    // Listes pour les formulaires
    announcementTypes,
    announcementPriorities,
    announcementStatuses,

    // Fonctions utilitaires
    getAnnouncementTypeLabel,
    getAnnouncementPriorityLabel,
    getAnnouncementStatusLabel,
  };
}
