'use client';

import { VerificationStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { DocumentStatusBadgeProps } from './document-types';

/**
 * A component to display document verification status with appropriate styling
 */
export function DocumentStatusBadge({ status, variant = 'default' }: DocumentStatusBadgeProps) {
  if (!status) return null;

  const normalizedStatus = status.toUpperCase();

  // Map status to display properties
  const getStatusDisplay = () => {
    switch (normalizedStatus) {
      case 'PENDING':
        return {
          variant: 'outline' as const,
          icon: <Clock className={`${variant === 'compact' ? 'h-3 w-3' : 'mr-1 h-3 w-3'}`} />,
          label: variant === 'compact' ? '' : 'En attente',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      case 'APPROVED':
        return {
          variant: 'success' as const,
          icon: <CheckCircle className={`${variant === 'compact' ? 'h-3 w-3' : 'mr-1 h-3 w-3'}`} />,
          label: variant === 'compact' ? '' : 'Approuvé',
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'REJECTED':
        return {
          variant: 'destructive' as const,
          icon: <X className={`${variant === 'compact' ? 'h-3 w-3' : 'mr-1 h-3 w-3'}`} />,
          label: variant === 'compact' ? '' : 'Rejeté',
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      case 'EXPIRED':
        return {
          variant: 'warning' as const,
          icon: <AlertCircle className={`${variant === 'compact' ? 'h-3 w-3' : 'mr-1 h-3 w-3'}`} />,
          label: variant === 'compact' ? '' : 'Expiré',
          className: 'bg-orange-100 text-orange-800 border-orange-300',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: null,
          label: variant === 'compact' ? '' : status,
          className: '',
        };
    }
  };

  const { icon, label, className } = getStatusDisplay();

  return (
    <Badge className={`flex w-fit items-center ${className}`}>
      {icon}
      {label}
    </Badge>
  );
}
