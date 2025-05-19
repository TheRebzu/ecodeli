'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Composant pour gérer la vérification du statut utilisateur
 * Optimisé pour éviter les requêtes en boucle et les rechargements indésirables
 */
export default function VerificationStatusProvider() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  // Utiliser une variable d'état pour éviter les vérifications multiples
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // Mutation pour forcer la vérification si nécessaire
  const verifyMutation = api.verification.manualCheckAndUpdateVerification.useMutation({
    onSuccess: async (data) => {
      if (data.success && data.isVerified) {
        // Mettre à jour la session avec le statut vérifié
        await update({ isVerified: true });
        
        // Afficher une notification avec les propriétés correctes
        toast({
          title: 'Compte vérifié',
          // Utiliser description pour Toast de Shadcn ou autre propriété selon votre implémentation
          variant: 'success',
          // Si toast-ui attend des enfants au lieu d'une description:
          children: (
            <div>Votre compte a été vérifié avec succès</div>
          )
        });
        
        // Rediriger après une courte pause pour permettre à la session de se mettre à jour complètement
        setTimeout(() => {
          // Forcer un rafraîchissement complet de la page pour s'assurer que le token est mis à jour dans les cookies
          window.location.href = `/${session?.user?.locale || session?.user?.id?.slice(0, 2) || 'fr'}/deliverer`;
        }, 2000);
      }
    },
  });

  // Vérifier le statut de l'utilisateur une seule fois au chargement du composant
  useEffect(() => {
    // Ne vérifier que pour les livreurs non vérifiés et seulement si on n'a pas déjà vérifié
    if (
      session?.user?.role === 'DELIVERER' &&
      !session.user.isVerified &&
      !hasCheckedStatus &&
      !verifyMutation.isPending
    ) {
      // Marquer comme vérifié immédiatement pour éviter plusieurs requêtes
      setHasCheckedStatus(true);
      
      // Délai avant de vérifier pour s'assurer que la session est chargée
      const timeoutId = setTimeout(() => {
        console.log('Vérification du statut utilisateur...');
        verifyMutation.mutate();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [session, hasCheckedStatus, verifyMutation]);

  // Ce composant ne rend rien visuellement
  return null;
} 