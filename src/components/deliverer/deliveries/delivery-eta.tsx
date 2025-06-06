'use client';

import React, { useEffect, useState } from 'react';
import { DeliveryStatus } from '@prisma/client';
import { useDeliveryLiveTracking } from '@/hooks/features/use-delivery-tracking';
import { format, formatDistance, isAfter, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils/common';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface DeliveryETAProps {
  deliveryId: string;
  showProgress?: boolean;
  showIcon?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  size?: 'sm' | 'md' | 'lg';
}

const DeliveryETA: React.FC<DeliveryETAProps> = ({
  deliveryId,
  showProgress = true,
  showIcon = true,
  className,
  variant = 'default',
  size = 'md',
}) => {
  // Récupérer les données de livraison
  const { deliveryInfo, isLoading } = useDeliveryLiveTracking(deliveryId);

  // État pour mettre à jour en temps réel
  const [now, setNow] = useState(new Date());

  // Mettre à jour le temps actuel toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Si pas de données ou pas d'ETA
  if (isLoading || !deliveryInfo || !deliveryInfo.estimatedArrival) {
    return (
      <div className={cn('flex items-center text-muted-foreground', className)}>
        {showIcon && <Clock className="mr-2 h-4 w-4" />}
        <span className="text-sm">ETA indisponible</span>
      </div>
    );
  }

  const eta = new Date(deliveryInfo.estimatedArrival);
  const pickupDate = deliveryInfo.pickupDate
    ? new Date(deliveryInfo.pickupDate)
    : new Date(deliveryInfo.createdAt);

  // Calcul des différences de temps
  const isDelivered = [DeliveryStatus.DELIVERED, DeliveryStatus.CONFIRMED].includes(
    deliveryInfo.status as DeliveryStatus
  );

  const isLate = isPast(eta) && !isDelivered;
  const timeRemaining = formatDistance(eta, now, { locale: fr, addSuffix: true });

  // Calcul du pourcentage de progression
  const totalTime = Math.max(eta.getTime() - pickupDate.getTime(), 0);
  const elapsedTime = Math.min(Math.max(now.getTime() - pickupDate.getTime(), 0), totalTime);
  const progressPercentage =
    totalTime > 0 ? Math.min(Math.round((elapsedTime / totalTime) * 100), 100) : 0;

  // Classes CSS selon la taille
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Icône selon le statut
  const Icon = isDelivered ? CheckCircle2 : isLate ? AlertTriangle : Clock;

  // Couleur selon le statut
  const statusColor = isDelivered ? 'text-green-600' : isLate ? 'text-amber-500' : 'text-blue-500';

  // Formatage de la date d'arrivée selon le variant
  const getETAText = () => {
    if (isDelivered) {
      return 'Livraison terminée';
    }

    if (variant === 'compact') {
      return timeRemaining;
    }

    if (variant === 'detailed') {
      return (
        <span>
          Arrivée prévue{' '}
          <time dateTime={eta.toISOString()}>{format(eta, 'PPp', { locale: fr })}</time>
          <span className="text-muted-foreground ml-1">({timeRemaining})</span>
        </span>
      );
    }

    return `Arrivée ${timeRemaining}`;
  };

  // Contenu de base
  const content = (
    <div className={cn('space-y-1', className)}>
      <div className={cn('flex items-center', sizeClasses[size])}>
        {showIcon && (
          <Icon
            className={cn(
              'mr-2',
              {
                'h-3 w-3': size === 'sm',
                'h-4 w-4': size === 'md',
                'h-5 w-5': size === 'lg',
              },
              statusColor
            )}
          />
        )}
        <span className={cn({ [statusColor]: isLate || isDelivered })}>{getETAText()}</span>
      </div>

      {showProgress && !isDelivered && variant !== 'compact' && (
        <Progress
          value={progressPercentage}
          className={cn('h-1.5', {
            'bg-slate-100': !isLate,
            'bg-amber-100': isLate,
          })}
          indicatorClassName={cn({
            'bg-blue-500': !isLate,
            'bg-amber-500': isLate,
          })}
        />
      )}
    </div>
  );

  // Ajouter un tooltip pour plus d'informations
  if (variant !== 'detailed') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">
              {isDelivered
                ? 'Livraison terminée'
                : `Arrivée estimée: ${format(eta, 'PPp', { locale: fr })}`}
            </p>
            {!isDelivered && (
              <p className="text-sm text-muted-foreground">
                {isLate
                  ? `En retard de ${formatDistance(now, eta, { locale: fr })}`
                  : `${timeRemaining}`}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default DeliveryETA;
