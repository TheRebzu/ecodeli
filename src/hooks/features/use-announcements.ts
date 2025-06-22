"use client";

import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import type { RouterOutputs, RouterInputs } from "@/trpc/shared";

type CreateAnnouncementInput = RouterInputs["clientAnnouncements"]["createAnnouncement"];
type AnnouncementOutput = RouterOutputs["clientAnnouncements"]["getMyAnnouncements"];

export const useAnnouncements = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Récupérer toutes les annonces du client
  const {
    data: announcements,
    isLoading,
    error,
    refetch
  } = api.clientAnnouncements.getMyAnnouncements.useQuery(
    {}, // Filtres optionnels
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  );

  // Mutation pour créer une annonce
  const createAnnouncementMutation = api.clientAnnouncements.createAnnouncement.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: "Annonce créée avec succès"
      });
      refetch(); // Recharger la liste des annonces
    },
    onError: (error) => {
      console.error("Erreur création annonce:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer l'annonce"
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  // Mutation pour mettre à jour une annonce
  const updateAnnouncementMutation = api.clientAnnouncements.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès", 
        description: "Annonce mise à jour avec succès"
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'annonce"
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    }
  });

  // Fonction pour créer une annonce
  const createAnnouncement = useCallback(async (data: CreateAnnouncementInput) => {
    setIsCreating(true);
    try {
      const result = await createAnnouncementMutation.mutateAsync(data);
      return result;
    } catch (error) {
      throw error;
    }
  }, [createAnnouncementMutation]);

  // Fonction pour créer une annonce de test rapide
  const createTestAnnouncement = useCallback(async () => {
    const testData: CreateAnnouncementInput = {
      title: "Livraison Express Test",
      description: "Besoin d'une livraison rapide entre deux points de la ville",
      deliveryType: "EXPRESS",
      pickupAddress: "123 Rue de la République, Lyon",
      pickupCity: "Lyon", 
      pickupPostalCode: "69001",
      deliveryAddress: "456 Avenue de la Liberté, Lyon",
      deliveryCity: "Lyon",
      deliveryPostalCode: "69002",
      packageType: "SMALL_PACKAGE",
      estimatedWeight: 2.5,
      suggestedPrice: 25.00,
      priority: "NORMAL",
      requiresSignature: true,
      photos: []
    };

    return createAnnouncement(testData);
  }, [createAnnouncement]);

  // Fonction pour mettre à jour une annonce
  const updateAnnouncement = useCallback(async (id: string, data: Partial<CreateAnnouncementInput>) => {
    setIsUpdating(true);
    try {
      const result = await updateAnnouncementMutation.mutateAsync({
        id,
        ...data
      });
      return result;
    } catch (error) {
      throw error;
    }
  }, [updateAnnouncementMutation]);

  // Fonction pour supprimer une annonce
  const deleteAnnouncementMutation = api.clientAnnouncements.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Annonce supprimée avec succès"
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive", 
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'annonce"
      });
    }
  });

  const deleteAnnouncement = useCallback(async (id: string) => {
    try {
      await deleteAnnouncementMutation.mutateAsync({ id });
    } catch (error) {
      throw error;
    }
  }, [deleteAnnouncementMutation]);

  // Fonction pour rafraîchir les données
  const refreshAnnouncements = useCallback(async () => {
    try {
      await refetch();
      toast({
        title: "Succès",
        description: "Annonces actualisées"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur", 
        description: "Impossible de rafraîchir les annonces"
      });
    }
  }, [refetch, toast]);

  // Statistiques dérivées
  const stats = {
    total: announcements?.announcements?.length || 0,
    published: announcements?.announcements?.filter(a => a.status === "PUBLISHED")?.length || 0,
    draft: announcements?.announcements?.filter(a => a.status === "DRAFT")?.length || 0,
    completed: announcements?.announcements?.filter(a => a.status === "COMPLETED")?.length || 0
  };

  return {
    // Données
    announcements: announcements?.announcements || [],
    stats,
    
    // États
    isLoading,
    isCreating,
    isUpdating,
    error,
    
    // Actions
    createAnnouncement,
    createTestAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements
  };
};

export default useAnnouncements;