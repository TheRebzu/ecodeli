'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { api } from '@/trpc/react';
import { UpdateUserPreferences } from '@/schemas/user/user-preferences.schema';
import { useSession } from 'next-auth/react';

export function useUserPreferences() {
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // Requête pour obtenir les préférences
  const preferencesQuery = api.userPreferences.getUserPreferences.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation pour mettre à jour les préférences
  const updatePreferencesMutation = api.userPreferences.updateUserPreferences.useMutation({
    onSuccess: () => {
      preferencesQuery.refetch();
    },
  });

  // Fonction pour changer la langue
  const changeLocale = useCallback(
    (newLocale: string) => {
      // Si l'utilisateur est connecté, sauvegarder la préférence
      if (isAuthenticated) {
        updatePreferencesMutation.mutate({ locale: newLocale });
      }

      // Extraire le chemin actuel et le rediriger vers la même page dans la nouvelle langue
      const currentPath = window.location.pathname;
      const pathWithoutLocale = currentPath.replace(`/${locale}`, '') || '/';
      router.push(`/${newLocale}${pathWithoutLocale}`);
    },
    [locale, router, isAuthenticated, updatePreferencesMutation]
  );

  // Fonction pour mettre à jour les préférences
  const updatePreferences = useCallback(
    (preferences: UpdateUserPreferences) => {
      if (!isAuthenticated) return;

      updatePreferencesMutation.mutate(preferences);

      // Si la locale est modifiée, rediriger vers la nouvelle version localisée
      if (preferences.locale && preferences.locale !== locale) {
        const currentPath = window.location.pathname;
        const pathWithoutLocale = currentPath.replace(`/${locale}`, '') || '/';
        router.push(`/${preferences.locale}${pathWithoutLocale}`);
      }
    },
    [locale, router, isAuthenticated, updatePreferencesMutation]
  );

  return {
    locale,
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    changeLocale,
    updatePreferences,
    isUpdating: updatePreferencesMutation.isLoading,
  };
}
