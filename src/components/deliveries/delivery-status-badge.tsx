import { DeliveryStatus } from '@/types/delivery';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface StatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

// Définition des couleurs pour chaque statut
const statusColors: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PENDING]: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10',
  [DeliveryStatus.ACCEPTED]: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/10',
  [DeliveryStatus.PICKED_UP]: 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/10',
  [DeliveryStatus.IN_TRANSIT]: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/10',
  [DeliveryStatus.DELIVERED]: 'bg-green-500/10 text-green-500 hover:bg-green-500/10',
  [DeliveryStatus.CONFIRMED]: 'bg-green-600/10 text-green-600 hover:bg-green-600/10',
  [DeliveryStatus.CANCELLED]: 'bg-red-500/10 text-red-500 hover:bg-red-500/10',
  [DeliveryStatus.DISPUTED]: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/10',
};

export default function DeliveryStatusBadge({ status, className = '' }: StatusBadgeProps) {
  const t = useTranslations('deliveries');

  return (
    <Badge variant="outline" className={`${statusColors[status]} ${className}`}>
      {t(`statuses.${status}`)}
    </Badge>
  );
}
