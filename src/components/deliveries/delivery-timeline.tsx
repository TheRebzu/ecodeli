'use client';

import { DeliveryStatus } from '@/types/delivery';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  MapPin,
  Truck,
  Home,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface DeliveryTimelineProps {
  status: DeliveryStatus;
  logs?: Array<{
    status: DeliveryStatus;
    timestamp: Date;
    note?: string;
  }>;
  className?: string;
}

// Définition de l'ordre des étapes dans la timeline
const timelineSteps = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ACCEPTED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
  DeliveryStatus.CONFIRMED,
];

// Icônes pour chaque statut
const statusIcons: Record<DeliveryStatus, React.ReactNode> = {
  [DeliveryStatus.PENDING]: <Clock className="h-6 w-6" />,
  [DeliveryStatus.ACCEPTED]: <CheckCircle2 className="h-6 w-6" />,
  [DeliveryStatus.PICKED_UP]: <Package className="h-6 w-6" />,
  [DeliveryStatus.IN_TRANSIT]: <Truck className="h-6 w-6" />,
  [DeliveryStatus.DELIVERED]: <MapPin className="h-6 w-6" />,
  [DeliveryStatus.CONFIRMED]: <Home className="h-6 w-6" />,
  [DeliveryStatus.CANCELLED]: <XCircle className="h-6 w-6" />,
  [DeliveryStatus.DISPUTED]: <AlertCircle className="h-6 w-6" />,
};

export default function DeliveryTimeline({
  status,
  logs = [],
  className = '',
}: DeliveryTimelineProps) {
  const t = useTranslations('deliveries');

  // Déterminer si le statut actuel est un statut d'erreur
  const isErrorStatus = status === DeliveryStatus.CANCELLED || status === DeliveryStatus.DISPUTED;

  // Obtenir la dernière mise à jour pour chaque étape
  const latestLogs = new Map<DeliveryStatus, { timestamp: Date; note?: string }>();
  logs.forEach(log => {
    if (
      !latestLogs.has(log.status) ||
      new Date(log.timestamp) > new Date(latestLogs.get(log.status)!.timestamp)
    ) {
      latestLogs.set(log.status, {
        timestamp: new Date(log.timestamp),
        note: log.note,
      });
    }
  });

  // Formater la date et l'heure
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('timeline.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {isErrorStatus ? (
            // Afficher un message d'erreur si le statut est annulé ou contesté
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                {statusIcons[status]}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  {t(`statuses.${status}`)}
                </h3>
                {latestLogs.has(status) && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(latestLogs.get(status)!.timestamp)}
                    </p>
                    {latestLogs.get(status)?.note && (
                      <p className="mt-1 text-sm">{latestLogs.get(status)?.note}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            // Afficher les étapes normales de la timeline
            timelineSteps.map((step, index) => {
              // Déterminer si l'étape est complétée, active ou à venir
              const isCompleted = timelineSteps.indexOf(status) >= index;
              const isActive = status === step;

              return (
                <div key={step} className="flex items-center space-x-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full 
                    ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? statusIcons[step] : <Circle className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold 
                      ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {t(`timeline.steps.${step}`)}
                    </h3>
                    {latestLogs.has(step) ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(latestLogs.get(step)!.timestamp)}
                        </p>
                        {latestLogs.get(step)?.note && (
                          <p className="mt-1 text-sm">{latestLogs.get(step)?.note}</p>
                        )}
                      </>
                    ) : isCompleted ? (
                      <p className="text-sm text-muted-foreground">{t('timeline.completed')}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('timeline.pending')}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
