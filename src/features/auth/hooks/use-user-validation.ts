import { useState, useEffect, useCallback } from "react";

interface ValidationStatus {
  emailVerified: boolean;
  profileVerified: boolean;
  documentsRequired: number;
  documentsSubmitted: number;
  documentsApproved: number;
  role: string;
}

interface ValidationFormData {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  additionalInfo?: string;
}

interface UseUserValidationReturn {
  status: ValidationStatus | null;
  isLoading: boolean;
  error: string | null;
  isFullyValidated: boolean;
  validateUser: (
    userId: string,
    userRole: string,
    profileData: ValidationFormData,
  ) => Promise<boolean>;
  refreshStatus: (userId: string) => Promise<void>;
  getValidationStep: () => {
    step: string;
    title: string;
    description: string;
    action: string;
    href: string;
  } | null;
}

export function useUserValidation(): UseUserValidationReturn {
  const [status, setStatus] = useState<ValidationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchValidationStatus = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/auth/validation-status?userId=${userId}`,
      );
      if (!response.ok) {
        throw new Error("Impossible de récupérer le statut de validation");
      }

      const data = await response.json();
      setStatus(data.status);
    } catch (err) {
      console.error("Erreur lors de la récupération du statut:", err);
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateUser = useCallback(
    async (
      userId: string,
      userRole: string,
      profileData: ValidationFormData,
    ): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/auth/validate-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            userRole,
            profileData,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de la validation");
        }

        // Rafraîchir le statut après validation
        await fetchValidationStatus(userId);
        return true;
      } catch (err) {
        console.error("Erreur lors de la validation:", err);
        setError(err instanceof Error ? err.message : "Erreur de connexion");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchValidationStatus],
  );

  const refreshStatus = useCallback(
    async (userId: string) => {
      await fetchValidationStatus(userId);
    },
    [fetchValidationStatus],
  );

  const isFullyValidated = useCallback(() => {
    if (!status) return false;
    return (
      status.emailVerified &&
      status.profileVerified &&
      (status.documentsRequired === 0 ||
        status.documentsApproved === status.documentsRequired)
    );
  }, [status]);

  const getValidationStep = useCallback(() => {
    if (!status) return null;

    if (!status.emailVerified) {
      return {
        step: "email",
        title: "Email à vérifier",
        description: "Vous devez vérifier votre adresse email pour continuer.",
        action: "Vérifier email",
        href: "/resend-verification",
      };
    }

    if (!status.profileVerified) {
      return {
        step: "profile",
        title: "Profil à compléter",
        description: "Complétez votre profil pour accéder à tous les services.",
        action: "Compléter profil",
        href: "/validate-user",
      };
    }

    if (
      status.documentsRequired > 0 &&
      status.documentsApproved < status.documentsRequired
    ) {
      return {
        step: "documents",
        title: "Documents en attente",
        description:
          "Soumettez les documents requis pour finaliser votre validation.",
        action: "Soumettre documents",
        href: "/documents/upload",
      };
    }

    return null;
  }, [status]);

  return {
    status,
    isLoading,
    error,
    isFullyValidated: isFullyValidated(),
    validateUser,
    refreshStatus,
    getValidationStep,
  };
}
