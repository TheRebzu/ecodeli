"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { UserRole } from "@prisma/client";

interface ProfileState {
  // État local du profil
  profileView: "info" | "documents" | "addresses" | "preferences" | "security";
  isEditingProfile: boolean;
  isAddingAddress: boolean;
  editingAddressId: string | null;
  selectedDocumentType: string | null;

  // Profile spécifique aux marchands et aux fournisseurs
  profile: {
    companyName?: string;
    businessAddress?: string;
    vatNumber?: string;
    serviceType?: string;
    serviceRadius?: number;
  } | null;

  // Actions
  setProfileView: (view: ProfileState["profileView"]) => void;
  setIsEditingProfile: (isEditing: boolean) => void;
  setIsAddingAddress: (isAdding: boolean) => void;
  setEditingAddressId: (addressId: string | null) => void;
  setSelectedDocumentType: (documentType: string | null) => void;

  // Utilitaires pour récupérer les sections de profil en fonction du rôle
  getAvailableSections: (role: UserRole) => ProfileState["profileView"][];

  // Réinitialiser le store
  reset: () => void;
}

const initialState = {
  profileView: "info" as const,
  isEditingProfile: false,
  isAddingAddress: false,
  editingAddressId: null,
  selectedDocumentType: null,
  profile: null,
};

export const useProfileStore = create<ProfileState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setProfileView: (view) => set({ profileView: view }),

        setIsEditingProfile: (isEditing) =>
          set({ isEditingProfile: isEditing }),

        setIsAddingAddress: (isAdding) => set({ isAddingAddress: isAdding }),

        setEditingAddressId: (addressId) =>
          set({ editingAddressId: addressId }),

        setSelectedDocumentType: (documentType) =>
          set({ selectedDocumentType: documentType }),

        getAvailableSections: (role) => {
          // Sections disponibles par défaut pour tous les rôles
          const commonSections: ProfileState["profileView"][] = [
            "info",
            "preferences",
            "security",
          ];

          // Sections spécifiques par rôle
          switch (role) {
            case UserRole.CLIENT:
              return [...commonSections, "addresses"];
            case UserRole.DELIVERER:
              return [...commonSections, "documents"];
            case UserRole.MERCHANT:
              return [...commonSections, "documents"];
            case UserRole.PROVIDER:
              return [...commonSections, "documents"];
            default:
              return commonSections;
          }
        },

        reset: () => set(initialState),
      }),
      {
        name: "profile-store",
        partialize: (state) => ({
          // Exclure certains états du stockage persistant
          profileView: state.profileView,
        }),
      },
    ),
  ),
);
