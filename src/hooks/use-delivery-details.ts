import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DeliveryStatus } from '@prisma/client';

interface ErrorResponse {
  message: string;
}

/**
 * Hook pour obtenir les détails d'une livraison
 */
export function useDeliveryDetails(deliveryId: string) {
  const { data: session } = useSession();
  const router = useRouter();

  // Requête pour obtenir les détails
  const { 
    data: deliveryDetails, 
    isLoading,
    error,
    refetch
  } = trpc.deliveryTracking.getDeliveryById.useQuery(
    { deliveryId },
    {
      enabled: !!deliveryId && !!session,
      refetchInterval: (query) => {
        // Vérifier si les données existent
        if (!query.state.data) return 60000; // 1 minute par défaut
        
        // Rafraîchir plus fréquemment pour les livraisons en cours
        const status = query.state.data.status;
        if (status === DeliveryStatus.IN_TRANSIT) {
          return 15000; // 15 secondes
        }
        if (status === DeliveryStatus.PICKED_UP) {
          return 30000; // 30 secondes
        }
        return 60000; // 1 minute pour les autres statuts
      }
    }
  );

  // Rediriger si les détails sont introuvables ou accès non autorisé
  useEffect(() => {
    if (error) {
      toast.error("Impossible d'accéder aux détails de cette livraison");
      router.push('/client/deliveries');
    }
  }, [error, router]);

  // Mutation pour confirmer la livraison
  const { mutate: confirmDelivery, isPending: isConfirming } = trpc.deliveryTracking.confirmDelivery.useMutation({
    onSuccess: () => {
      toast.success("Livraison confirmée avec succès");
      refetch();
    },
    onError: (error: ErrorResponse) => {
      toast.error(`Erreur: ${error.message || "Impossible de confirmer la livraison"}`);
    }
  });

  // Mutation pour signaler un problème
  const { mutate: reportIssue, isPending: isReporting } = trpc.deliveryTracking.reportIssue.useMutation({
    onSuccess: () => {
      toast.success("Problème signalé avec succès");
      refetch();
    },
    onError: (error: ErrorResponse) => {
      toast.error(`Erreur: ${error.message || "Impossible de signaler le problème"}`);
    }
  });

  // Mutation pour noter la livraison
  const { mutate: rateDelivery, isPending: isRating } = trpc.deliveryTracking.rateDelivery.useMutation({
    onSuccess: () => {
      toast.success("Merci pour votre évaluation!");
      refetch();
    },
    onError: (error: ErrorResponse) => {
      toast.error(`Erreur: ${error.message || "Impossible d'enregistrer votre évaluation"}`);
    }
  });

  return {
    deliveryDetails,
    isLoading,
    confirmDelivery,
    isConfirming,
    reportIssue,
    isReporting,
    rateDelivery,
    isRating,
    refetch
  };
}
