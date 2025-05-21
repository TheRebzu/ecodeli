'use client';

import { VerificationStatus } from '@/types/verification';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface VerificationStatusBannerProps {
  status: VerificationStatus;
  title: string;
  description: string;
  rejectionReason?: string;
  contactSupportLink?: string;
  className?: string;
}

export function VerificationStatusBanner({
  status,
  title,
  description,
  rejectionReason,
  contactSupportLink = '/support',
  className,
}: VerificationStatusBannerProps) {
  // Déterminer l'icône et les styles en fonction du statut
  const getStatusDetails = () => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          variant: 'success' as const,
          iconColor: 'text-green-500',
          borderColor: 'border-green-200',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
        };
      case VerificationStatus.PENDING:
        return {
          icon: <Clock className="h-5 w-5" />,
          variant: 'warning' as const,
          iconColor: 'text-yellow-500',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
        };
      case VerificationStatus.REJECTED:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          variant: 'destructive' as const,
          iconColor: 'text-red-500',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
        };
      default:
        return {
          icon: <Clock className="h-5 w-5" />,
          variant: 'default' as const,
          iconColor: 'text-muted-foreground',
          borderColor: 'border-border',
          bgColor: 'bg-muted',
          textColor: 'text-foreground',
        };
    }
  };

  const { icon, iconColor, borderColor, bgColor, textColor } = getStatusDetails();

  return (
    <Alert
      className={`flex items-start border ${borderColor} ${bgColor} ${className}`}
      variant="default"
    >
      <div className={`mr-2 mt-0.5 ${iconColor}`}>{icon}</div>
      <div className="flex-1">
        <AlertTitle className={`font-semibold text-lg ${textColor}`}>{title}</AlertTitle>
        <AlertDescription className={textColor}>{description}</AlertDescription>

        {status === VerificationStatus.REJECTED && rejectionReason && (
          <div className="mt-2 border-t border-red-200 pt-2">
            <p className="font-medium text-sm">Raison du rejet:</p>
            <p className="text-sm">{rejectionReason}</p>
            <Button
              variant="outline"
              className="mt-3 bg-white hover:bg-red-50"
              size="sm"
              asChild
            >
              <Link href={contactSupportLink}>Contacter le support</Link>
            </Button>
          </div>
        )}

        {status === VerificationStatus.PENDING && (
          <p className="text-sm mt-2">
            Nous vous notifierons par email lorsque votre vérification sera traitée.
          </p>
        )}
      </div>
    </Alert>
  );
} 