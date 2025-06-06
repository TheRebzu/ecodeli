'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  CalendarClock,
  User,
  Truck,
  Clock,
  Phone,
  MapPinned,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import DeliveryStatusIndicator from '@/components/shared/deliveries/delivery-status';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDeliveryLiveTracking } from '@/hooks/features/use-delivery-tracking';
import { DeliveryStatus } from '@prisma/client';
import Link from 'next/link';
import { cn } from '@/lib/utils/common';

interface DeliveryDetailCardProps {
  deliveryId: string;
  className?: string;
  showActions?: boolean;
  showMap?: boolean;
  showTimeline?: boolean;
  isInteractive?: boolean;
}

const DeliveryDetailCard: React.FC<DeliveryDetailCardProps> = ({
  deliveryId,
  className,
  showActions = true,
  showMap = false,
  showTimeline = false,
  isInteractive = true,
}) => {
  // Récupérer les données de livraison
  const { deliveryInfo, isLoading, error } = useDeliveryLiveTracking(deliveryId);

  // Formatter les dates
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Non définie';
    return format(new Date(date), 'PPp', { locale: fr });
  };

  // État de chargement
  if (isLoading) {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Chargement des détails...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Affichage d'erreur
  if (error || !deliveryInfo) {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <p className="text-sm">Impossible de charger les détails de cette livraison</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Livraison #{deliveryInfo.id.slice(-6)}
          </CardTitle>
          <DeliveryStatusIndicator status={deliveryInfo.status as DeliveryStatus} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Adresses */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Adresse de collecte</p>
              <p className="text-sm text-muted-foreground">{deliveryInfo.pickupAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPinned className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Adresse de livraison</p>
              <p className="text-sm text-muted-foreground">{deliveryInfo.deliveryAddress}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Dates */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Date de collecte</p>
              <p className="text-sm text-muted-foreground">{formatDate(deliveryInfo.pickupDate)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Livraison estimée</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(deliveryInfo.estimatedArrival)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Personnes */}
        <div className="space-y-3">
          {deliveryInfo.client && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Client</p>
                <p className="text-sm text-muted-foreground">{deliveryInfo.client.name}</p>
              </div>
            </div>
          )}

          {deliveryInfo.deliverer && (
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Livreur</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{deliveryInfo.deliverer.name}</p>
                  {deliveryInfo.deliverer.phone && (
                    <a
                      href={`tel:${deliveryInfo.deliverer.phone}`}
                      className="flex items-center text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Appeler
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {showActions && isInteractive && (
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/[locale]/(protected)/client/deliveries/${deliveryId}`}
              className="flex items-center"
            >
              Détails
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default DeliveryDetailCard;
