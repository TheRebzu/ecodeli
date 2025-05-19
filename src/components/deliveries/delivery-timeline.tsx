'use client';

import React, { useMemo } from 'react';
import { DeliveryStatus as DeliveryStatusEnum } from '@prisma/client';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from './delivery-status';
import { useDeliveryStatusHistory } from '@/hooks/use-delivery-status';
import { Loader2, CircleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DeliveryTimelineProps {
  deliveryId: string;
  className?: string;
  showDetails?: boolean;
  limit?: number;
}

const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
  deliveryId,
  className,
  showDetails = true,
  limit,
}) => {
  // Récupérer l'historique des statuts
  const { statusHistory, isLoading, error } = useDeliveryStatusHistory(deliveryId);

  // Formatage et limite de l'historique
  const historyItems = useMemo(() => {
    if (!statusHistory) return [];

    // Tri par date plus récente en premier
    const sortedHistory = [...statusHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limiter le nombre d'éléments si demandé
    return limit ? sortedHistory.slice(0, limit) : sortedHistory;
  }, [statusHistory, limit]);

  // Affichage de chargement
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Chargement de l'historique...</p>
      </div>
    );
  }

  // Affichage d'erreur
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-destructive">
        <CircleAlert className="h-8 w-8" />
        <p className="mt-2 text-sm">Erreur lors du chargement de l'historique</p>
      </div>
    );
  }

  // Affichage si aucun historique
  if (!historyItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <h3 className="text-sm font-medium mb-3">Historique de livraison</h3>
      <ol className="relative border-l border-muted">
        {historyItems.map((item, index) => {
          const config =
            STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNKNOWN;
          const Icon = config.icon;
          const date = new Date(item.timestamp);

          return (
            <li key={item.id || index} className="mb-6 ml-4">
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-white">
                <div className={cn('h-3 w-3 rounded-full', config.bgColor)}>
                  <span className="sr-only">{config.label}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <h4 className={cn('text-sm font-medium', config.color)}>{config.label}</h4>
                </div>
                <time className="text-xs text-muted-foreground" dateTime={date.toISOString()}>
                  {format(date, 'PPp', { locale: fr })}
                </time>
                {showDetails && item.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                )}
                {showDetails && item.reason && (
                  <p className="text-sm italic mt-1">Raison: {item.reason}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default DeliveryTimeline;
