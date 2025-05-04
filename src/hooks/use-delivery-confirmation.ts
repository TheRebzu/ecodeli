import { useState } from 'react';
import { api } from '../trpc/react';
import { useRouter } from 'next/router';
import { DeliveryConfirmationInput } from '@/schemas/delivery-tracking.schema';

// Type pour la preuve de livraison
type ProofType = 'PHOTO' | 'SIGNATURE' | 'CODE';

/**
 * Hook personnalisé pour gérer le processus de confirmation d'une livraison
 * Permet aux clients de confirmer la réception d'un colis
 */
export function useDeliveryConfirmation(deliveryId: string) {
  const router = useRouter();
  const [confirmationCode, setConfirmationCode] = useState('');
  const [proofType, setProofType] = useState<ProofType | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Récupérer les détails de la livraison
  const { data: delivery, isLoading } = api.deliveryTracking.getDeliveryById.useQuery({
    deliveryId,
  });

  // Mutation pour confirmer la livraison
  const confirmMutation = api.deliveryTracking.confirmDelivery.useMutation({
    onSuccess: () => {
      setIsConfirming(false);
      setError(null);

      // Rediriger vers la page de détail avec un message de succès
      router.push({
        pathname: `/client/deliveries/${deliveryId}`,
        query: { confirmed: 'true' },
      });
    },
    onError: err => {
      setIsConfirming(false);
      setError(err.message);
    },
  });

  // Fonction pour mettre à jour le code de confirmation
  const updateConfirmationCode = (code: string) => {
    setConfirmationCode(code);
    // Effacer l'erreur quand le code change
    if (error) setError(null);
  };

  // Fonction pour mettre à jour la preuve de livraison
  const updateProof = (type: ProofType, url: string) => {
    setProofType(type);
    setProofUrl(url);
  };

  // Fonction pour soumettre la confirmation
  const confirmDelivery = async () => {
    if (!confirmationCode) {
      setError('Le code de confirmation est requis');
      return false;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const data: DeliveryConfirmationInput = {
        deliveryId,
        confirmationCode,
        ...(proofType && proofUrl && { proofType, proofUrl }),
      };

      await confirmMutation.mutateAsync(data);
      return true;
    } catch {
      // Les erreurs sont gérées dans onError
      return false;
    }
  };

  // Vérifier si la confirmation est possible
  const canConfirm = delivery?.status === 'DELIVERED';

  return {
    delivery,
    isLoading,
    confirmationCode,
    updateConfirmationCode,
    updateProof,
    confirmDelivery,
    isConfirming,
    canConfirm,
    error,
  };
}
