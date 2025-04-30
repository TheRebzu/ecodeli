'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Clock, User, Truck, Box, AlertCircle, BadgeCheck } from 'lucide-react';
import DeliveryStatusBadge from './delivery-status-badge';
import { DeliveryStatus } from '@/types/delivery';

interface DeliveryDetailCardProps {
  id: string;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: Date;
  deliveryDate?: Date;
  estimatedArrival?: Date;
  client: {
    id: string;
    name: string;
    image?: string;
  };
  deliverer?: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
  className?: string;
}

export default function DeliveryDetailCard({
  id,
  status,
  pickupAddress,
  deliveryAddress,
  pickupDate,
  deliveryDate,
  estimatedArrival,
  client,
  deliverer,
  className = '',
}: DeliveryDetailCardProps) {
  const t = useTranslations('deliveries');

  // Formater la date et l'heure
  const formatDateTime = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date instanceof Date ? date : new Date(date));
  };

  // Formater la date uniquement
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date instanceof Date ? date : new Date(date));
  };

  // Déterminer si la livraison est en retard
  const isLate =
    estimatedArrival &&
    new Date() > new Date(estimatedArrival) &&
    status !== DeliveryStatus.DELIVERED &&
    status !== DeliveryStatus.CONFIRMED;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t('detailCard.title')}</CardTitle>
          <DeliveryStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Informations sur les adresses */}
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('detailCard.pickupAddress')}</p>
                <p className="text-sm text-muted-foreground">{pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('detailCard.deliveryAddress')}</p>
                <p className="text-sm text-muted-foreground">{deliveryAddress}</p>
              </div>
            </div>
          </div>

          {/* Informations sur les dates */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                <span className="font-medium">{t('detailCard.pickupDate')}: </span>
                {formatDate(pickupDate)}
              </p>
            </div>

            {deliveryDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  <span className="font-medium">{t('detailCard.deliveryDate')}: </span>
                  {formatDateTime(deliveryDate)}
                </p>
              </div>
            )}

            {estimatedArrival && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{t('detailCard.estimatedArrival')}: </span>
                    {formatDateTime(estimatedArrival)}
                  </p>
                  {isLate && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {t('detailCard.late')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Informations sur les personnes */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('detailCard.client')}</p>
            </div>

            <div className="flex items-center space-x-2 ml-6">
              <Avatar className="h-8 w-8">
                <AvatarImage src={client.image} />
                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-sm">{client.name}</p>
            </div>

            {deliverer && (
              <>
                <div className="flex items-center space-x-2 mt-4">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{t('detailCard.deliverer')}</p>
                </div>

                <div className="flex items-center space-x-2 ml-6">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={deliverer.image} />
                    <AvatarFallback>{deliverer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm">{deliverer.name}</p>
                    {deliverer.rating && (
                      <div className="flex items-center mt-0.5">
                        <BadgeCheck className="h-3 w-3 text-primary mr-1" />
                        <p className="text-xs text-muted-foreground">
                          {deliverer.rating.toFixed(1)} / 5
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ID de la livraison */}
          <div className="flex items-center space-x-2 pt-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">ID: {id}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
