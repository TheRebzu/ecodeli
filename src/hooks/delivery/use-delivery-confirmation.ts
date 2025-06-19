import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DeliveryStatus } from "@prisma/client";

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
  const { data } = useSession();
  const [deliveryDetails, setDeliveryDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<
    "not_started" | "code_verification" | "signature" | "rating" | "completed"
  >("not_started");

  // Fonction pour charger les détails de la livraison
  const fetchDeliveryDetails = useCallback(async () => {
    if (!deliveryId) return;

    setIsLoading(true);
    setError(null);
    try {
      const details = await api.delivery.getForConfirmation.query({ id  });
      setDeliveryDetails(details);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error("Erreur inconnue");
      setError(errorObj);
      console.error(
        "Erreur lors du chargement des détails de livraison:",
        errorObj,
      );
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  // Charger les détails au montage
  useEffect(() => {
    fetchDeliveryDetails();
  }, [fetchDeliveryDetails]);

  // Vérifier si l'utilisateur est autorisé à confirmer cette livraison
  const canConfirm = useCallback((): boolean => {
    if (!deliveryDetails || !session?.user) return false;

    // Le client peut confirmer une livraison marquée comme délivrée
    if (
      session.user.role === "CLIENT" &&
      deliveryDetails.clientId === session.user.id &&
      deliveryDetails.status === DeliveryStatus.DELIVERED
    ) {
      return true;
    }

    // Le livreur peut initier la confirmation quand il arrive à destination
    if (
      session.user.role === "DELIVERER" &&
      deliveryDetails.delivererId === session.user.id &&
      (deliveryDetails.status === DeliveryStatus.INTRANSIT ||
        deliveryDetails.status === DeliveryStatus.ARRIVING)
    ) {
      return true;
    }

    // L'administrateur peut toujours confirmer
    if (session.user.role === "ADMIN") {
      return true;
    }

    return false;
  }, [deliveryDetails, session]);

  // Fonction pour initier la confirmation
  const initiateConfirmation = useCallback(
    async (options: { generateCode?: boolean } = {}) => {
      if (!deliveryId) throw new Error("ID de livraison non spécifié");

      setIsInitiating(true);
      try {
        await api.delivery.initiateConfirmation.mutate({ id: deliveryId,
          generateCode: options.generateCode ?? true });

        setConfirmationStep("code_verification");
        toast.success(
          "Confirmation initiée. Veuillez entrer le code de vérification.",
        );

        // Recharger les détails
        await fetchDeliveryDetails();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        toast.error(
          `Erreur lors de l'initiation de la confirmation: ${errorMessage}`,
        );
        throw error;
      } finally {
        setIsInitiating(false);
      }
    },
    [deliveryId, fetchDeliveryDetails],
  );

  // Fonction pour vérifier le code de confirmation
  const verifyCode = useCallback(
    async (code: string) => {
      if (!deliveryId) throw new Error("ID de livraison non spécifié");

      setIsVerifying(true);
      try {
        await api.delivery.verifyConfirmationCode.mutate({ id: deliveryId,
          code });

        toast.success("Code vérifié avec succès.");
        setConfirmationStep("signature");

        // Recharger les détails
        await fetchDeliveryDetails();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        toast.error(`Erreur lors de la vérification du code: ${errorMessage}`);
        throw error;
      } finally {
        setIsVerifying(false);
      }
    },
    [deliveryId, fetchDeliveryDetails],
  );

  // Fonction pour confirmer la livraison
  const confirmDelivery = useCallback(
    async (options: ConfirmationOptions = {}) => {
      if (!deliveryId) throw new Error("ID de livraison non spécifié");

      setIsConfirming(true);
      try {
        await api.delivery.confirmDelivery.mutate({
          id: deliveryId,
          notes: options.notes,
          rating: options.rating,
          signature: options.signature,
          photos: options.photos,
          location:
            options.latitude && options.longitude
              ? { latitude: options.latitude, longitude: options.longitude }
              : undefined});

        toast.success("Livraison confirmée avec succès!");
        setConfirmationStep("completed");

        // Recharger les détails
        await fetchDeliveryDetails();

        // Rediriger après un court délai
        // Confirmation de livraison via API
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        toast.error(
          `Erreur lors de la confirmation de la livraison: ${errorMessage}`,
        );
        throw error;
      } finally {
        setIsConfirming(false);
      }
    },
    [deliveryId, fetchDeliveryDetails, session, router],
  );

  // Vérifier si la livraison est déjà confirmée
  useEffect(() => {
    if (deliveryDetails?.status === DeliveryStatus.CONFIRMED) {
      setConfirmationStep("completed");
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
    isLoading,
    isInitiating,
    isVerifying,
    isConfirming,
    error,
    refetchDelivery: fetchDeliveryDetails};
}

/**
 * Hook simple pour gérer la confirmation de livraison
 */
export const useSimpleDeliveryConfirmation = () => {
  const [isLoading, setIsLoading] = useState(false);

  const confirmDelivery = useCallback(
    async (deliveryId: string, confirmationData?: any) => {
      setIsLoading(true);
      try {
        const result = await api.delivery.confirmDelivery.mutate({ deliveryId,
          ...confirmationData });
        toast.success("Livraison confirmée avec succès");
        return result;
      } catch (error) {
        console.error("Erreur lors de la confirmation de livraison:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la confirmation",
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const cancelDelivery = useCallback(
    async (deliveryId: string, reason?: string) => {
      setIsLoading(true);
      try {
        const result = await api.delivery.cancelDelivery.mutate({ deliveryId,
          reason });
        toast.success("Livraison annulée avec succès");
        return result;
      } catch (error) {
        console.error("Erreur lors de l'annulation de livraison:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de l'annulation",
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    confirmDelivery,
    cancelDelivery,
    isLoading};
};
