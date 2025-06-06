'use client';

import React from 'react';
import { ProfileHeader } from '@/components/shared/profile/profile-header';
import { ProfileInfoCard } from '@/components/profile/profile-info-card';
import { ProfilePreferences } from '@/components/profile/profile-preferences';
import { ClientProfileForm } from '@/components/profile/client/client-profile-form';
import { useProfileStore } from '@/store/use-profile-store';
import { UserRole } from '@prisma/client';

export default function ClientProfilePage() {
  // Dans cette page côté serveur Next.js, les hooks client React ne sont pas directement utilisables
  // Le state UI sera géré dans les composants client

  return (
    <div className="container mx-auto py-8">
      <ProfileHeader />

      <ClientProfileContent />
    </div>
  );
}
// Ce composant côté client gère l'affichage conditionnel basé sur le state
function ClientProfileContent() {
  // Astuce : On doit importer useProfileStore dans un composant client
  const { profileView, isEditingProfile } = useProfileStore();

  // Afficher le formulaire si le mode édition est activé
  if (isEditingProfile) {
    return <ClientProfileForm />;
  }

  // Afficher différentes sections en fonction de la vue sélectionnée
  switch (profileView) {
    case 'info':
      return <ProfileInfoCard />;
    case 'preferences':
      return <ProfilePreferences />;
    case 'addresses':
      // L'adresse est pour l'instant dans ProfileInfoCard
      // Mais on pourrait créer un composant dédié pour la gestion des adresses
      return (
        <div className="space-y-8">
          <ProfileInfoCard />
          {/* Futur composant de gestion des adresses */}
        </div>
      );
    case 'security':
      return (
        <div className="space-y-8">
          <div className="text-center py-10">
            <h2 className="text-xl font-medium mb-2">Sécurité du compte</h2>
            <p className="text-muted-foreground">
              Gestion de la sécurité de votre compte non disponible pour le moment.
            </p>
          </div>
        </div>
      );
    default:
      return <ProfileInfoCard />;
  }
}
