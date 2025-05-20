'use client';

import { useTranslations } from 'next-intl';
import { VerificationForm } from './verification-form';
import { VerificationDocumentType } from '@/types/verification';

export function ProviderVerificationForm() {
  const t = useTranslations('verification.provider');

  // Définir les documents requis pour un provider
  const requiredDocuments = [
    {
      type: VerificationDocumentType.ID_CARD,
      label: t('documents.idCard.label'),
      description: t('documents.idCard.description'),
    },
    {
      type: VerificationDocumentType.PROFESSIONAL_QUALIFICATION,
      label: t('documents.professionalQualification.label'),
      description: t('documents.professionalQualification.description'),
    },
    {
      type: VerificationDocumentType.INSURANCE_CERTIFICATE,
      label: t('documents.insuranceCertificate.label'),
      description: t('documents.insuranceCertificate.description'),
    },
    {
      type: VerificationDocumentType.PROOF_OF_ADDRESS,
      label: t('documents.proofOfAddress.label'),
      description: t('documents.proofOfAddress.description'),
    },
  ];

  return (
    <VerificationForm
      requiredDocuments={requiredDocuments}
      verificationType="PROVIDER"
      title={t('formTitle')}
      description={t('formDescription')}
      submitButtonText={t('submitButton')}
    />
  );
} 