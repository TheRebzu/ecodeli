import { useTranslations } from 'next-intl';
import { VerificationStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function VerificationStatusBadge({
  status,
  showIcon = true,
  size = 'md',
}: VerificationStatusBadgeProps) {
  const t = useTranslations();

  const sizeClasses = {
    sm: 'text-xs py-0 px-2.5',
    md: 'text-sm py-0.5 px-3',
    lg: 'text-base py-1 px-4',
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  switch (status) {
    case VerificationStatus.PENDING:
      return (
        <Badge
          variant="outline"
          className={`bg-yellow-50 text-yellow-700 border-yellow-200 ${sizeClasses[size]} gap-1.5`}
        >
          {showIcon && <Clock className="shrink-0" size={iconSize[size]} />}
          {t('status.pending')}
        </Badge>
      );
    case VerificationStatus.APPROVED:
      return (
        <Badge
          variant="outline"
          className={`bg-green-50 text-green-700 border-green-200 ${sizeClasses[size]} gap-1.5`}
        >
          {showIcon && <CheckCircle className="shrink-0" size={iconSize[size]} />}
          {t('status.approved')}
        </Badge>
      );
    case VerificationStatus.REJECTED:
      return (
        <Badge
          variant="outline"
          className={`bg-red-50 text-red-700 border-red-200 ${sizeClasses[size]} gap-1.5`}
        >
          {showIcon && <AlertTriangle className="shrink-0" size={iconSize[size]} />}
          {t('status.rejected')}
        </Badge>
      );
    default:
      return null;
  }
}
