import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DeliveryStatus } from '@prisma/client';

/**
 * Options pour la confirmation de livraison
 */
type ConfirmationOptions = {
  notes?: string;
  rating?: number;
  signature?: string; // Base64
  photos?: string[]; // URLs ou Base64
  latitude?: number;
  longitude?: number;
};

/**
 * Hook pour gérer le processus de confirmation de livraison
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryConfirmation(deliveryId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [confirmationStep, setConfirmationStep] = useState<
    'not_started' | 'code_verification' | 'signature' | 'rating' | 'completed'
  >('not_started');

  // Vérifier si la livraison est prête à être confirmée
  const {
    data: deliveryDetails,
    isLoading: isLoadingDelivery,
    error: deliveryError,
    refetch: refetchDelivery,
  } = useQuery({
    queryKey: ['delivery-for-confirmation', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null;
      return await trpc.delivery.getForConfirmation.query({ id: deliveryId });
    },
    enabled: !!deliveryId,
    staleTime: 1000 * 30, // 30 secondes
  });

  // Vérifier si l'utilisateur est autorisé à confirmer cette livraison
  const canConfirm = useCallback((): boolean => {
    if (!deliveryDetails || !session?.user) return false;

    // Le client peut confirmer une livraison marquée comme délivrée
    if (
      session.user.role === 'CLIENT' &&
      deliveryDetails.clientId === session.user.id &&
      deliveryDetails.status === DeliveryStatus.DELIVERED
    ) {
      return true;
    }

    // Le livreur peut initier la confirmation quand il arrive à destination
    if (
      session.user.role === 'DELIVERER' &&
      deliveryDetails.delivererId === session.user.id &&
      (deliveryDetails.status === DeliveryStatus.IN_TRANSIT ||
        deliveryDetails.status === DeliveryStatus.ARRIVING)
    ) {
      return true;
    }

    // L'administrateur peut toujours confirmer
    if (session.user.role === 'ADMIN') {
      return true;
    }

    return false;
  }, [deliveryDetails, session]);

  // Mutation pour initier la confirmation
  const { mutate: initiateConfirmation, isPending: isInitiating } = useMutation({
    mutationFn: async (options: { generateCode?: boolean } = {}) => {
      if (!deliveryId) throw new Error('ID de livraison non spécifié');

      return await trpc.delivery.initiateConfirmation.mutate({
        id: deliveryId,
        generateCode: options.generateCode ?? true,
      });
    },
    onSuccess: () => {
      setConfirmationStep('code_verification');
      toast.success('Confirmation initiée. Veuillez entrer le code de vérification.');

      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['delivery-for-confirmation', deliveryId] });
    },
    onError: error => {
      toast.error(`Erreur lors de l'initiation de la confirmation: ${error.message}`);
    },
  });

  // Mutation pour vérifier le code de confirmation
  const { mutate: verifyCode, isPending: isVerifying } = useMutation({
    mutationFn: async (code: string) => {
      if (!deliveryId) throw new Error('ID de livraison non spécifié');

      return await trpc.delivery.verifyConfirmationCode.mutate({
        id: deliveryId,
        code,
      });
    },
    onSuccess: () => {
      toast.success('Code vérifié avec succès.');
      setConfirmationStep('signature');

      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['delivery-for-confirmation', deliveryId] });
    },
    onError: error => {
      toast.error(`Erreur lors de la vérification du code: ${error.message}`);
    },
  });

  // Mutation pour confirmer la livraison
  const { mutate: confirmDelivery, isPending: isConfirming } = useMutation({
    mutationFn: async (options: ConfirmationOptions = {}) => {
      if (!deliveryId) throw new Error('ID de livraison non spécifié');

      return await trpc.delivery.confirmDelivery.mutate({
        id: deliveryId,
        notes: options.notes,
        rating: options.rating,
        signature: options.signature,
        photos: options.photos,
        location:
          options.latitude && options.longitude
            ? { latitude: options.latitude, longitude: options.longitude }
            : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Livraison confirmée avec succès!');
      setConfirmationStep('completed');

      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['delivery-for-confirmation', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['delivery', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });

      // Rediriger après un court délai
      setTimeout(() => {
        if (session?.user.role === 'CLIENT') {
          router.push('/client/deliveries');
        } else if (session?.user.role === 'DELIVERER') {
          router.push('/deliverer/deliveries');
        } else {
          router.push('/');
        }
      }, 2000);
    },
    onError: error => {
      toast.error(`Erreur lors de la confirmation de la livraison: ${error.message}`);
    },
  });

  // Vérifier si la livraison est déjà confirmée
  useEffect(() => {
    if (deliveryDetails?.status === DeliveryStatus.CONFIRMED) {
      setConfirmationStep('completed');
    }
  }, [deliveryDetails]);

  return {
    // Données
    deliveryDetails,
    confirmationStep,

    // Actions
    initiateConfirmation,
    verifyCode,
    confirmDelivery,
    setConfirmationStep, // Permet de naviguer manuellement entre les étapes

    // Validation
    canConfirm: canConfirm(),

    // États
    isLoading: isLoadingDelivery,
    isInitiating,
    isVerifying,
    isConfirming,
    error: deliveryError,
    refetchDelivery,
  };
}

/**
 * Hook pour gérer le code de vérification de livraison
 * @param deliveryId - ID de la livraison
 */
export function useDeliveryCode(deliveryId?: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [code, setCode] = useState<string>('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Requête pour obtenir le code de confirmation existant
  const {
    data: codeDetails,
    isLoading,
    error,
    refetch: refetchCode,
  } = useQuery({
    queryKey: ['delivery-code', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null;

      // Seul le livreur peut obtenir le code
      if (session?.user.role !== 'DELIVERER' && session?.user.role !== 'ADMIN') {
        return null;
      }

      return await trpc.delivery.getConfirmationCode.query({ id: deliveryId });
    },
    enabled: !!deliveryId && (session?.user.role === 'DELIVERER' || session?.user.role === 'ADMIN'),
    staleTime: 1000 * 30, // 30 secondes
  });

  // Mutation pour générer un nouveau code
  const { mutate: generateCode, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      if (!deliveryId) throw new Error('ID de livraison non spécifié');

      return await trpc.delivery.generateConfirmationCode.mutate({ id: deliveryId });
    },
    onSuccess: data => {
      setCode(data.code);
      setCodeExpiry(new Date(data.expiresAt));

      toast.success('Nouveau code généré avec succès');

      // Invalider les requêtes liées
      queryClient.invalidateQueries({ queryKey: ['delivery-code', deliveryId] });
    },
    onError: error => {
      toast.error(`Erreur lors de la génération du code: ${error.message}`);
    },
  });

  // Mettre à jour le code et l'expiration quand les détails sont chargés
  useEffect(() => {
    if (codeDetails) {
      setCode(codeDetails.code);
      setCodeExpiry(new Date(codeDetails.expiresAt));
    }
  }, [codeDetails]);

  // Mettre à jour le temps restant avant expiration
  useEffect(() => {
    if (!codeExpiry) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = codeExpiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(0);
        clearInterval(interval);
        setCode('');
        setCodeExpiry(null);
      } else {
        setTimeRemaining(Math.floor(diff / 1000)); // en secondes
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeExpiry]);

  // Formatter le temps restant
  const formattedTimeRemaining = useCallback(() => {
    if (timeRemaining <= 0) return '00:00';

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  // Vérifier si le code est expiré
  const isCodeExpired = useCallback(() => {
    if (!codeExpiry) return true;

    return new Date() > codeExpiry;
  }, [codeExpiry]);

  return {
    // Données
    code,
    codeExpiry,
    timeRemaining,
    formattedTimeRemaining: formattedTimeRemaining(),
    isCodeExpired: isCodeExpired(),

    // Actions
    generateCode,
    setCode, // Pour usage dans formulaires contrôlés
    refetchCode,

    // États
    isLoading,
    isGenerating,
    error,
  };
}
