'use client';

import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDeliveryStatus } from '@/hooks/use-delivery-status';
import { DeliveryStatus } from '@/types/delivery';
import {
  CheckCircle2,
  Truck,
  Package,
  MapPin,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DeliveryStatusUpdateProps {
  deliveryId: string;
  currentStatus: DeliveryStatus;
  className?: string;
}

export default function DeliveryStatusUpdate({
  deliveryId,
  currentStatus,
  className = '',
}: DeliveryStatusUpdateProps) {
  const t = useTranslations('deliveries.statusUpdate');
  const [note, setNote] = useState('');

  // Utiliser le hook personnalisé pour la mise à jour du statut
  const { actions, isUpdating, error } = useDeliveryStatus(deliveryId);

  // Déterminer les actions disponibles en fonction du statut actuel
  const canAccept = currentStatus === DeliveryStatus.PENDING;
  const canPickup = currentStatus === DeliveryStatus.ACCEPTED;
  const canTransit = currentStatus === DeliveryStatus.PICKED_UP;
  const canDeliver = currentStatus === DeliveryStatus.IN_TRANSIT;
  const canCancel = [
    DeliveryStatus.PENDING,
    DeliveryStatus.ACCEPTED,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.IN_TRANSIT,
  ].includes(currentStatus);

  // Gérer la position actuelle (à implémenter avec la géolocalisation)
  const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La géolocalisation n'est pas prise en charge par votre navigateur"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          reject(error);
        },
        { enableHighAccuracy: true }
      );
    });
  };

  // Fonctions pour gérer les actions avec les coordonnées
  const handleAccept = () => actions.acceptDelivery();

  const handlePickup = async () => {
    try {
      const position = await getCurrentPosition();
      return actions.startPickup();
    } catch (error) {
      // Si la géolocalisation échoue, continuer sans coordonnées
      return actions.startPickup();
    }
  };

  const handleTransit = async () => {
    try {
      const position = await getCurrentPosition();
      return actions.confirmPickup(position);
    } catch (error) {
      // Si la géolocalisation échoue, continuer sans coordonnées
      return actions.confirmPickup();
    }
  };

  const handleDeliver = async () => {
    try {
      const position = await getCurrentPosition();
      return actions.markAsDelivered(position);
    } catch (error) {
      // Si la géolocalisation échoue, continuer sans coordonnées
      return actions.markAsDelivered();
    }
  };

  const handleCancel = () => actions.cancelDelivery(note || 'Annulé par le livreur');

  // Détermine l'action principale en fonction de l'état actuel
  const getPrimaryAction = () => {
    if (canAccept)
      return {
        action: handleAccept,
        label: t('acceptDelivery'),
        icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
      };
    if (canPickup)
      return {
        action: handlePickup,
        label: t('startPickup'),
        icon: <Package className="h-4 w-4 mr-2" />,
      };
    if (canTransit)
      return {
        action: handleTransit,
        label: t('confirmPickup'),
        icon: <Truck className="h-4 w-4 mr-2" />,
      };
    if (canDeliver)
      return {
        action: handleDeliver,
        label: t('markAsDelivered'),
        icon: <MapPin className="h-4 w-4 mr-2" />,
      };
    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('statusIs')}: {t(`statuses.${currentStatus}`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {canCancel && (
          <div className="space-y-2">
            <Textarea
              placeholder={t('notePlaceholder')}
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={isUpdating}
            />
            <p className="text-xs text-muted-foreground">{t('noteHelp')}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {primaryAction && (
            <Button
              onClick={primaryAction.action}
              className="w-full flex items-center justify-center"
              disabled={isUpdating}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}

          {currentStatus === DeliveryStatus.DELIVERED && (
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>{t('waitingForConfirmation')}</AlertTitle>
              <AlertDescription>{t('clientMustConfirm')}</AlertDescription>
            </Alert>
          )}

          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              className="w-full flex items-center justify-center mt-4"
              disabled={isUpdating}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('cancelDelivery')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
