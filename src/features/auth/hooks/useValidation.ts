"use client";

import { useAuth } from "./useAuth";
import { useState, useEffect } from "react";
import { UserRole } from "@/lib/auth/permissions";

export interface ValidationStatus {
  isValid: boolean;
  canLogin: boolean;
  needsEmailVerification: boolean;
  needsDocumentUpload: boolean;
  needsAdminValidation: boolean;
  needsTutorial: boolean;
  needsContractSignature: boolean;
  validationMessage: string;
  nextStepUrl?: string;
}

/**
 * Hook pour vérifier le statut de validation d'un utilisateur
 * Détermine les étapes manquantes selon le rôle
 */
export function useValidation(): ValidationStatus {
  const { user, isAuthenticated, needsAction } = useAuth();
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValid: false,
    canLogin: false,
    needsEmailVerification: false,
    needsDocumentUpload: false,
    needsAdminValidation: false,
    needsTutorial: false,
    needsContractSignature: false,
    validationMessage: "Chargement...",
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setValidationStatus({
        isValid: false,
        canLogin: false,
        needsEmailVerification: false,
        needsDocumentUpload: false,
        needsAdminValidation: false,
        needsTutorial: false,
        needsContractSignature: false,
        validationMessage: "Non connecté",
      });
      return;
    }

    const status: ValidationStatus = {
      isValid: true,
      canLogin: true,
      needsEmailVerification: needsAction.includes("EMAIL_VERIFICATION"),
      needsDocumentUpload: needsAction.includes("DOCUMENT_UPLOAD"),
      needsAdminValidation: needsAction.includes("ADMIN_VALIDATION"),
      needsTutorial: needsAction.includes("TUTORIAL_COMPLETION"),
      needsContractSignature: needsAction.includes("CONTRACT_SIGNATURE"),
      validationMessage: "Compte validé",
    };

    // Déterminer si l'utilisateur peut se connecter
    if (user.status === "SUSPENDED") {
      status.canLogin = false;
      status.validationMessage = "Compte suspendu";
    } else if (user.status === "INACTIVE") {
      status.canLogin = false;
      status.validationMessage = "Compte inactif";
    }

    // Messages et URLs selon les actions nécessaires
    if (status.needsEmailVerification) {
      status.canLogin = false;
      status.validationMessage = "Vérification email requise";
      status.nextStepUrl = "/verify-email";
    } else if (status.needsDocumentUpload) {
      status.canLogin = false;
      status.validationMessage = getDocumentUploadMessage(
        user.role as UserRole,
      );
      if (user.role === "PROVIDER") {
        status.nextStepUrl = "/provider/validation";
      } else if (user.role === "DELIVERER") {
        status.nextStepUrl = "/deliverer/validation";
      } else {
        status.nextStepUrl = "/onboarding/documents";
      }
    } else if (status.needsAdminValidation) {
      status.canLogin = false;
      status.validationMessage = "Validation admin en cours";
      if (user.role === "PROVIDER") {
        status.nextStepUrl = "/provider/validation";
      } else if (user.role === "DELIVERER") {
        status.nextStepUrl = "/deliverer/validation";
      } else {
        status.nextStepUrl = "/onboarding/pending";
      }
    } else if (status.needsTutorial) {
      status.validationMessage = "Tutoriel requis";
      status.nextStepUrl = "/onboarding/tutorial";
    } else if (status.needsContractSignature) {
      status.canLogin = false;
      status.validationMessage = "Signature de contrat requise";
      status.nextStepUrl = "/onboarding/contract";
    }

    setValidationStatus(status);
  }, [user, isAuthenticated, needsAction]);

  return validationStatus;
}

function getDocumentUploadMessage(role: UserRole): string {
  switch (role) {
    case "DELIVERER":
      return "Upload des documents requis (identité, permis, assurance)";
    case "PROVIDER":
      return "Upload des certifications requis";
    case "MERCHANT":
      return "Informations entreprise requises";
    default:
      return "Documents requis";
  }
}
