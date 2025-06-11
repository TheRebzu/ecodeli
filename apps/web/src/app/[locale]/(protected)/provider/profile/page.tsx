'use client';

import React from 'react';
import { ProfileHeader } from '@/components/shared/profile/profile-header';
import { ProfileInfoCard } from '@/components/ui/card';
import { ProfilePreferences } from '@/types/users/preferences';
import { ProfileDocumentsList } from '@/components/shared/documents/document-list';
import { ProviderProfileForm } from '@/components/profile/provider/provider-profile-form';
import { useProfileStore } from '@/store/use-profile-store';

export default function ProviderProfilePage() {
  // Dans cette page côté serveur Next.js, les hooks client React ne sont pas directement utilisables
  // Le state UI sera géré dans les composants client

  return (
    <div className="container mx-auto py-8">
      <ProfileHeader />

      <ProviderProfileContent />
    </div>
  );
}

// Ce composant côté client gère l'affichage conditionnel basé sur le state
function ProviderProfileContent() {
  const { profileView, isEditingProfile } = useProfileStore();

  // Afficher le formulaire si le mode édition est activé
  if (isEditingProfile) {
    return <ProviderProfileForm />;
  }

  // Afficher différentes sections en fonction de la vue sélectionnée
  switch (profileView) {
    case 'info':
      return <ProfileInfoCard />;
    case 'documents':
      return <ProfileDocumentsList />;
    case 'preferences':
      return <ProfilePreferences />;
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
