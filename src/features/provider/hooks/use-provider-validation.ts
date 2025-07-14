import { useState, useCallback, useEffect } from "react";

export interface ProviderValidationData {
  profile: {
    businessName: string;
    siret: string;
    description: string;
    specialties: string[];
    hourlyRate: number;
    zone?: {
      coordinates: number[];
      radius: number;
    };
  };
  services: Array<{
    name: string;
    description: string;
    type: string;
    basePrice: number;
    priceUnit: string;
    duration?: number;
    requirements: string[];
    minAdvanceBooking: number;
    maxAdvanceBooking: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    expiryDate?: Date;
    certificateNumber?: string;
    documentUrl?: string;
  }>;
  rates: Array<{
    serviceType: string;
    baseRate: number;
    unitType: string;
    minimumCharge?: number;
  }>;
}

export interface ValidationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  completedAt?: Date;
  errorMessage?: string;
}

export interface ProviderValidationStatus {
  currentStatus: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  steps: ValidationStep[];
  progress: number;
  estimatedCompletionDate?: Date;
  rejectionReason?: string;
  nextAction?: string;
}

export interface CertificationRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  level: string;
  isRequired: boolean;
  status: "not_started" | "in_progress" | "completed" | "failed" | "expired";
  expiresAt?: Date;
  certificateUrl?: string;
  score?: number;
  attempts: number;
  maxAttempts: number;
}

interface UseProviderValidationReturn {
  // État de validation
  validationStatus: ProviderValidationStatus | null;
  isLoading: boolean;
  error: string | null;

  // Certifications
  requiredCertifications: CertificationRequirement[];
  certificationsLoading: boolean;

  // Actions de validation
  startValidation: (data: ProviderValidationData) => Promise<void>;
  refreshStatus: () => Promise<void>;
  startCertification: (certificationId: string) => Promise<void>;
  completeModule: (
    certificationId: string,
    moduleId: string,
    score: number,
  ) => Promise<void>;

  // Upload de documents
  uploadDocument: (file: File, type: string) => Promise<string>;

  // État des étapes
  currentStep: ValidationStep | null;
  nextStep: ValidationStep | null;
  canProceed: boolean;
  progressPercentage: number;
}

export function useProviderValidation(
  providerId?: string,
): UseProviderValidationReturn {
  // États principaux
  const [validationStatus, setValidationStatus] =
    useState<ProviderValidationStatus | null>(null);
  const [requiredCertifications, setRequiredCertifications] = useState<
    CertificationRequirement[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [certificationsLoading, setCertificationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger le statut de validation
  const loadValidationStatus = useCallback(async () => {
    if (!providerId) {
      console.log('❌ loadValidationStatus: No providerId provided')
      return
    }

    console.log('🔄 loadValidationStatus: Starting with providerId:', providerId)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/provider/validation/status?providerId=${providerId}`)
      
      console.log('🔄 loadValidationStatus: Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ loadValidationStatus: Response not ok:', errorText)
        throw new Error('Erreur lors du chargement du statut')
      }
      
      const status = await response.json()
      console.log('✅ loadValidationStatus: Success, status:', status)
      setValidationStatus(status)
    } catch (err) {
      console.error('❌ loadValidationStatus: Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  // Charger les certifications requises
  const loadRequiredCertifications = useCallback(async (specialties: string[]) => {
    console.log('🔄 loadRequiredCertifications: Starting with specialties:', specialties)
    setCertificationsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/provider/certifications/required', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ specialties })
      })
      
      console.log('🔄 loadRequiredCertifications: Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ loadRequiredCertifications: Response not ok:', errorText)
        throw new Error('Erreur lors du chargement des certifications')
      }
      
      const certifications = await response.json()
      console.log('✅ loadRequiredCertifications: Success, certifications:', certifications)
      setRequiredCertifications(certifications)
    } catch (err) {
      console.error('❌ loadRequiredCertifications: Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement des certifications')
    } finally {
      setCertificationsLoading(false)
    }
  }, [])

  // Démarrer le processus de validation
  const startValidation = useCallback(async (data: ProviderValidationData) => {
    console.log('🔄 startValidation: Starting with data:', data)
    setIsLoading(true)
    setError(null)

      try {
        const response = await fetch("/api/provider/validation/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

      console.log('🔄 startValidation: Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ startValidation: Response not ok:', errorText)
        throw new Error('Erreur lors du démarrage de la validation')
      }

      const result = await response.json()
      console.log('✅ startValidation: Success, result:', result)
      
      // Recharger le statut
      await loadValidationStatus()
      
      // Charger les certifications requises
      await loadRequiredCertifications(data.profile.specialties)

    } catch (err) {
      console.error('❌ startValidation: Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur de validation')
    } finally {
      setIsLoading(false)
    }
  }, [loadValidationStatus, loadRequiredCertifications])

  // Rafraîchir le statut
  const refreshStatus = useCallback(async () => {
    console.log('🔄 refreshStatus: Called')
    await loadValidationStatus()
  }, [loadValidationStatus])

  // Démarrer une certification
  const startCertification = useCallback(async (certificationId: string) => {
    if (!providerId) {
      console.log('❌ startCertification: No providerId provided')
      return
    }

    console.log('🔄 startCertification: Starting with providerId:', providerId, 'certificationId:', certificationId)
    setIsLoading(true)
    setError(null)

      try {
        const response = await fetch("/api/provider/certifications/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerId,
            certificationId,
          }),
        });

      console.log('🔄 startCertification: Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ startCertification: Response not ok:', errorText)
        throw new Error('Erreur lors du démarrage de la certification')
      }

      console.log('✅ startCertification: Success')
      // Recharger le statut
      await loadValidationStatus()

    } catch (err) {
      console.error('❌ startCertification: Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur de certification')
    } finally {
      setIsLoading(false)
    }
  }, [providerId, loadValidationStatus])

  // Compléter un module
  const completeModule = useCallback(
    async (certificationId: string, moduleId: string, score: number) => {
      if (!providerId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/provider/certifications/complete-module",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              providerId,
              certificationId,
              moduleId,
              score,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la complétion du module");
        }

        // Recharger le statut
        await loadValidationStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de complétion");
      } finally {
        setIsLoading(false);
      }
    },
    [providerId, loadValidationStatus],
  );

  // Upload de document
  const uploadDocument = useCallback(
    async (file: File, type: string): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      try {
        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'upload");
        }

        const result = await response.json();
        return result.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'upload");
        throw err;
      }
    },
    [],
  );

  // Charger le statut au montage
  useEffect(() => {
    if (providerId) {
      loadValidationStatus();
    }
  }, [providerId, loadValidationStatus]);

  // Calculer les propriétés dérivées
  const currentStep =
    validationStatus?.steps.find(
      (step) => step.status === "in_progress" || step.status === "pending",
    ) || null;

  const nextStep =
    validationStatus?.steps.find((step, index) => {
      const currentStepIndex = validationStatus.steps.findIndex(
        (s) => s === currentStep,
      );
      return index === currentStepIndex + 1;
    }) || null;

  const canProceed =
    currentStep?.status !== "failed" &&
    validationStatus?.currentStatus !== "REJECTED";

  const progressPercentage = validationStatus?.progress || 0;

  return {
    // État de validation
    validationStatus,
    isLoading,
    error,

    // Certifications
    requiredCertifications,
    certificationsLoading,

    // Actions
    startValidation,
    refreshStatus,
    startCertification,
    completeModule,
    uploadDocument,

    // État des étapes
    currentStep,
    nextStep,
    canProceed,
    progressPercentage,
  };
}

// Hook pour la gestion des certifications
export function useProviderCertifications(providerId: string) {
  const [certifications, setCertifications] = useState<
    CertificationRequirement[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCertifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/provider/certifications?providerId=${providerId}`,
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des certifications");
      }

      const data = await response.json();
      setCertifications(data.certifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    if (providerId) {
      loadCertifications();
    }
  }, [providerId, loadCertifications]);

  return {
    certifications,
    loading,
    error,
    reload: loadCertifications,
  };
}

// Hook pour la gestion des modules de certification
export function useCertificationModules(certificationId: string) {
  const [modules, setModules] = useState<any[]>([]);
  const [currentModule, setCurrentModule] = useState<any | null>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadModules = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/provider/certifications/${certificationId}/modules`,
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des modules");
      }

      const data = await response.json();
      setModules(data.modules);
      setProgress(data.progress);

      // Trouver le module actuel (premier non terminé)
      const currentMod = data.modules.find((mod: any) => {
        const moduleProgress = data.progress.find(
          (p: any) => p.moduleId === mod.id,
        );
        return !moduleProgress || moduleProgress.status !== "COMPLETED";
      });

      setCurrentModule(currentMod || null);
    } catch (err) {
      console.error("Erreur chargement modules:", err);
    } finally {
      setLoading(false);
    }
  }, [certificationId]);

  const completeModule = useCallback(
    async (moduleId: string, score: number) => {
      try {
        const response = await fetch(
          "/api/provider/certifications/complete-module",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              certificationId,
              moduleId,
              score,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la complétion");
        }

        // Recharger les modules
        await loadModules();
      } catch (err) {
        console.error("Erreur complétion module:", err);
        throw err;
      }
    },
    [certificationId, loadModules],
  );

  useEffect(() => {
    if (certificationId) {
      loadModules();
    }
  }, [certificationId, loadModules]);

  return {
    modules,
    currentModule,
    progress,
    loading,
    completeModule,
    reload: loadModules,
  };
}

// Hook pour l'upload de documents
export function useDocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, type: string): Promise<string> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'upload");
        }

        const result = await response.json();
        setProgress(100);

        return result.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'upload");
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  };
}
