'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { Check } from 'lucide-react';

interface VerificationResult {
  success: boolean;
  isVerified: boolean;
  message: string;
}

export function AutoVerificationChecker() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [hasChecked, setHasChecked] = useState(false);

  // Fonction pour gérer le succès de la vérification
  const handleVerificationSuccess = useCallback(
    async (data: VerificationResult) => {
      if (data?.success && data?.isVerified) {
        try {
          // Mettre à jour la session pour refléter le nouveau statut de vérification
          await update({ isVerified: true });

          // Afficher un toast de succès
          toast({
            title: 'Compte vérifié!',
            variant: 'default',
            duration: 5000,
          });
        } catch (error) {
          console.error("Erreur lors de la mise à jour de la session:", error);
        }
      }
    },
    [update, toast]
  );

  // Requête tRPC pour vérifier et mettre à jour le statut de vérification
  const { data: verificationResult } =
    api.verification.checkAndUpdateDelivererVerification.useQuery(undefined, {
      // Exécuter seulement pour les livreurs qui ne sont pas encore vérifiés et si on n'a pas déjà vérifié
      enabled: session?.user?.role === 'DELIVERER' && !session?.user?.isVerified && !hasChecked,
      // Désactiver toutes les formes de rafraîchissement automatique
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      // Garder les données indéfiniment
      staleTime: Infinity,
      cacheTime: Infinity,
      // Ne pas suspendre le composant pendant le chargement
      suspense: false,
    });

  // Utiliser useEffect pour réagir aux changements de données une seule fois
  useEffect(() => {
    if (verificationResult && !hasChecked) {
      handleVerificationSuccess(verificationResult);
      setHasChecked(true);
    }
  }, [verificationResult, hasChecked, handleVerificationSuccess]);

  // Marquer comme vérifié lors du premier montage
  useEffect(() => {
    if (session?.user && !hasChecked) {
      setHasChecked(true);
    }
  }, [session, hasChecked]);

  return null; // Ce composant ne rend rien visuellement
}
