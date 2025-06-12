'use client';

import { DocumentType } from '@prisma/client';
import {
  FileIcon,
  FileTextIcon,
  IdCardIcon,
  CarIcon,
  HomeIcon,
  BuildingIcon,
  AwardIcon,
  ShieldIcon,
  User2Icon,
} from 'lucide-react';
import { DocumentTypeIconProps } from '@/components/shared/documents/document-types';

/**
 * Component to display an appropriate icon based on document type
 */
export function DocumentTypeIcon({ type, size = 5 }: DocumentTypeIconProps) {
  const getIconByType = () => {
    switch (type) {
      case DocumentType.ID_CARD:
        return <IdCardIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.DRIVING_LICENSE:
        return <IdCardIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.VEHICLE_REGISTRATION:
        return <CarIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.PROOF_OF_ADDRESS:
        return <HomeIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.BUSINESS_REGISTRATION:
        return <BuildingIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.QUALIFICATION_CERTIFICATE:
        return <AwardIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.INSURANCE:
        return <ShieldIcon className={`h-${size} w-${size} text-primary`} />;
      case DocumentType.SELFIE:
        return <User2Icon className={`h-${size} w-${size} text-primary`} />;
      default:
        return <FileIcon className={`h-${size} w-${size} text-primary`} />;
    }
  };

  return (
    <div className={`w-${size} h-${size} flex items-center justify-center`}>{getIconByType()}</div>
  );
}
