'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { Check } from 'lucide-react';

interface VerificationResult {
  isVerified: boolean;
  updated: boolean;
}

export function AutoVerificationChecker() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  // Fonction pour gérer le succès de la vérification
  const handleVerificationSuccess = useCallback(
    async (data: VerificationResult) => {
      if (data?.updated) {
        // Mettre à jour la session pour refléter le nouveau statut de vérification
        await update({ isVerified: true });

        // Afficher un toast de succès
        toast({
          title: 'Compte vérifié!',
          description:
            'Votre compte a été vérifié avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
          variant: 'default',
          duration: 5000,
        });
      }
    },
    [update, toast]
  );

  // Requête tRPC pour vérifier et mettre à jour le statut de vérification
  const { data: verificationResult } =
    api.verification.checkAndUpdateDelivererVerification.useQuery(undefined, {
      // Exécuter seulement pour les livreurs qui ne sont pas encore vérifiés
      enabled: session?.user?.role === 'DELIVERER' && !session?.user?.isVerified,
      // Ne pas rafraîchir à chaque focus de fenêtre
      refetchOnWindowFocus: false,
      // Ne pas mettre en cache cette requête
      gcTime: 0,
      // Essayer une seule fois par session
      staleTime: Infinity,
    });

  // Utiliser useEffect pour réagir aux changements de données
  useEffect(() => {
    if (verificationResult) {
      handleVerificationSuccess(verificationResult);
    }
  }, [verificationResult, handleVerificationSuccess]);

  return null; // Ce composant ne rend rien visuellement
}
