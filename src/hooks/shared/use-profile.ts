"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  type ClientProfile,
  type DelivererProfile,
  type MerchantProfile,
  type ProviderProfile} from "@/schemas/user/profile.schema";
import { api } from "@/trpc/react";
import { UserRole } from "@prisma/client";

export function useProfile() {
  const router = useRouter();

  // Récupération du profil complet de l'utilisateur
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile} = api.profile.getMyProfile.useQuery();

  // Récupération du profil spécifique au rôle
  const {
    data: roleSpecificProfile,
    isLoading: isLoadingRoleProfile,
    error: roleProfileError,
    refetch: refetchRoleProfile} = api.profile.getMyRoleSpecificProfile.useQuery();

  type RoleSpecificProfile = MerchantProfile | ProviderProfile;

  const typedRoleSpecificProfile: RoleSpecificProfile | null =
    roleSpecificProfile as RoleSpecificProfile | null;

  // Procédure de mise à jour du profil
  const updateProfileMutation = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil mis à jour avec succès");
      // Rafraîchir les données du profil
      refetchProfile();
      refetchRoleProfile();
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour du profil: ${error.message}`);
    }});

  // Procédure d'ajout d'adresse (seulement pour les clients)
  const addAddressMutation = api.profile.addClientAddress.useMutation({
    onSuccess: () => {
      toast.success("Adresse ajoutée avec succès");
      refetchProfile();
      refetchRoleProfile();
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'ajout de l'adresse: ${error.message}`);
    }});

  // Procédure de mise à jour d'adresse (seulement pour les clients)
  const updateAddressMutation = api.profile.updateClientAddress.useMutation({
    onSuccess: () => {
      toast.success("Adresse mise à jour avec succès");
      refetchProfile();
      refetchRoleProfile();
    },
    onError: (error) => {
      toast.error(
        `Erreur lors de la mise à jour de l'adresse: ${error.message}`,
      );
    }});

  // Procédure de suppression d'adresse (seulement pour les clients)
  const deleteAddressMutation = api.profile.deleteClientAddress.useMutation({
    onSuccess: () => {
      toast.success("Adresse supprimée avec succès");
      refetchProfile();
      refetchRoleProfile();
    },
    onError: (error) => {
      toast.error(
        `Erreur lors de la suppression de l'adresse: ${error.message}`,
      );
    }});

  // Procédure pour définir une adresse par défaut (seulement pour les clients)
  const setDefaultAddressMutation = api.profile.setDefaultAddress.useMutation({
    onSuccess: () => {
      toast.success("Adresse par défaut définie avec succès");
      refetchProfile();
      refetchRoleProfile();
    },
    onError: (error) => {
      toast.error(
        `Erreur lors de la définition de l'adresse par défaut: ${error.message}`,
      );
    }});

  /**
   * Met à jour le profil de l'utilisateur en fonction de son rôle
   */
  const updateProfile = useCallback(
    (
      data: Partial<
        ClientProfile | DelivererProfile | MerchantProfile | ProviderProfile
      >,
    ) => {
      updateProfileMutation.mutate({ data  });
    },
    [updateProfileMutation],
  );

  /**
   * Ajoute une nouvelle adresse pour un client
   */
  const addAddress = useCallback(
    (addressData: {
      label: string;
      street: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    }) => {
      if (!profile || profile.role !== UserRole.CLIENT) {
        toast.error("Vous devez être un client pour ajouter une adresse");
        return;
      }

      addAddressMutation.mutate(addressData);
    },
    [addAddressMutation, profile],
  );

  /**
   * Met à jour une adresse existante
   */
  const updateAddress = useCallback(
    (
      addressId: string,
      addressData: {
        label: string;
        street: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
        isDefault?: boolean;
      },
    ) => {
      if (!profile || profile.role !== UserRole.CLIENT) {
        toast.error("Vous devez être un client pour modifier une adresse");
        return;
      }

      updateAddressMutation.mutate({ addressId,
        data: addressData });
    },
    [updateAddressMutation, profile],
  );

  /**
   * Supprime une adresse
   */
  const deleteAddress = useCallback(
    (addressId: string) => {
      if (!profile || profile.role !== UserRole.CLIENT) {
        toast.error("Vous devez être un client pour supprimer une adresse");
        return;
      }

      deleteAddressMutation.mutate({ addressId  });
    },
    [deleteAddressMutation, profile],
  );

  /**
   * Définit une adresse comme étant l'adresse par défaut
   */
  const setDefaultAddress = useCallback(
    (addressId: string) => {
      if (!profile || profile.role !== UserRole.CLIENT) {
        toast.error(
          "Vous devez être un client pour définir une adresse par défaut",
        );
        return;
      }

      setDefaultAddressMutation.mutate({ addressId  });
    },
    [setDefaultAddressMutation, profile],
  );

  return {
    profile,
    roleSpecificProfile,
    isLoadingProfile,
    isLoadingRoleProfile,
    profileError,
    roleProfileError,
    updateProfile,
    isUpdatingProfile: updateProfileMutation.isPending,
    addAddress,
    isAddingAddress: addAddressMutation.isPending,
    updateAddress,
    isUpdatingAddress: updateAddressMutation.isPending,
    deleteAddress,
    isDeletingAddress: deleteAddressMutation.isPending,
    setDefaultAddress,
    isSettingDefaultAddress: setDefaultAddressMutation.isPending,
    refreshProfile: () => {
      refetchProfile();
      refetchRoleProfile();
    }};
}
