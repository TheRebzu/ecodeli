import { useState } from 'react';
import { api } from '../trpc/react';
import { useRouter } from 'next/router';
import { DeliveryRatingInput } from '../schemas/delivery-tracking.schema';

/**
 * Hook personnalisé pour gérer l'évaluation d'une livraison
 * Permet aux clients d'évaluer leur expérience après une livraison confirmée
 */
export function useDeliveryRating(deliveryId: string) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer les détails de la livraison
  const {
    data: delivery,
    isLoading,
    refetch,
  } = api.deliveryTracking.getDeliveryById.useQuery({ deliveryId });

  // Mutation pour soumettre l'évaluation
  const ratingMutation = api.deliveryTracking.rateDelivery.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setError(null);

      // Rafraîchir les données pour afficher l'évaluation soumise
      refetch();

      // Rediriger vers la page de détail avec un message de succès
      router.push({
        pathname: `/client/deliveries/${deliveryId}`,
        query: { rated: 'true' },
      });
    },
    onError: err => {
      setIsSubmitting(false);
      setError(err.message);
    },
  });

  // Fonction pour mettre à jour la note
  const updateRating = (value: number) => {
    setRating(value);
    // Effacer l'erreur quand la note change
    if (error) setError(null);
  };

  // Fonction pour mettre à jour le commentaire
  const updateComment = (text: string) => {
    setComment(text);
  };

  // Fonction pour soumettre l'évaluation
  const submitRating = async () => {
    if (rating === null) {
      setError('Une note est requise');
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: DeliveryRatingInput = {
        deliveryId,
        rating,
        ...(comment && { comment }),
      };

      await ratingMutation.mutateAsync(data);
      return true;
    } catch {
      // Les erreurs sont gérées dans onError
      return false;
    }
  };

  // Vérifier si l'évaluation est possible
  const canRate = delivery?.status === 'CONFIRMED' && !delivery?.rating;

  // Vérifier si une évaluation existe déjà
  const existingRating = delivery?.rating;

  // Initialiser les valeurs à partir d'une évaluation existante
  if (existingRating && rating === null) {
    setRating(existingRating.rating);
    if (existingRating.comment) {
      setComment(existingRating.comment);
    }
  }

  return {
    delivery,
    isLoading,
    rating,
    comment,
    updateRating,
    updateComment,
    submitRating,
    isSubmitting,
    canRate,
    existingRating,
    error,
  };
}
