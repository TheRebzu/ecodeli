'use client';

import { useTranslations } from 'next-intl';
import { VerificationForm } from './verification-form';
import { VerificationDocumentType } from '@/types/verification';

export function MerchantVerificationForm() {
  const t = useTranslations('verification.merchant');

  // Définir les documents requis pour un merchant
  const requiredDocuments = [
    {
      type: VerificationDocumentType.ID_CARD,
      label: t('documents.idCard.label'),
      description: t('documents.idCard.description'),
    },
    {
      type: VerificationDocumentType.BUSINESS_LICENSE,
      label: t('documents.businessLicense.label'),
      description: t('documents.businessLicense.description'),
    },
    {
      type: VerificationDocumentType.TAX_CERTIFICATE,
      label: t('documents.taxCertificate.label'),
      description: t('documents.taxCertificate.description'),
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
      verificationType="MERCHANT"
      title={t('formTitle')}
      description={t('formDescription')}
      submitButtonText={t('submitButton')}
    />
  );
} 