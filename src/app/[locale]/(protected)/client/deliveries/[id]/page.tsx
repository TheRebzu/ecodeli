'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Star, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeliveryTrackingMap from '@/components/deliveries/delivery-tracking-map';
import DeliveryDetailCard from '@/components/deliveries/delivery-detail-card';
import DeliveryTimeline from '@/components/deliveries/delivery-timeline';
import { useDeliveryTracking } from '@/hooks/use-delivery-tracking';
import { DeliveryStatus } from '@/types/delivery';

export default function DeliveryDetailPage() {
  const t = useTranslations('deliveries');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const deliveryId = params.id as string;
  const justConfirmed = searchParams.get('confirmed') === 'true';
  const justRated = searchParams.get('rated') === 'true';

  const { trackingInfo, delivery, coordinatesHistory, isLoading, isAuthorized, error } =
    useDeliveryTracking({ deliveryId });

  // Rediriger si non autorisé
  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.push('/client/deliveries');
    }
  }, [isLoading, isAuthorized, router]);

  // Préparer les props pour la carte
  const mapProps = delivery
    ? {
        deliveryId: delivery.id,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        status: delivery.status as DeliveryStatus,
        lastUpdate: delivery.lastLocationUpdate as Date | undefined,
        currentCoordinates:
          delivery.currentLat && delivery.currentLng
            ? ([delivery.currentLat, delivery.currentLng] as [number, number])
            : undefined,
      }
    : undefined;

  // Fonction pour retourner à la liste
  const handleBackToList = () => {
    router.push('/client/deliveries');
  };

  // Fonction pour aller à la page de confirmation
  const handleConfirm = () => {
    router.push(`/client/deliveries/${deliveryId}/confirm`);
  };

  // Fonction pour aller à la page d'évaluation
  const handleRate = () => {
    router.push(`/client/deliveries/${deliveryId}/rate`);
  };

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Vérifier si la livraison existe
  if (!delivery) {
    return (
      <div className="container max-w-5xl py-8">
        <Button variant="ghost" onClick={handleBackToList} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToList')}
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{error?.message || t('deliveryNotFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={handleBackToList}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToList')}
        </Button>

        <div className="flex gap-2">
          {delivery.status === DeliveryStatus.DELIVERED && (
            <Button onClick={handleConfirm}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('confirmDelivery')}
            </Button>
          )}

          {delivery.status === DeliveryStatus.CONFIRMED && !delivery.rating && (
            <Button onClick={handleRate}>
              <Star className="mr-2 h-4 w-4" />
              {t('rateDelivery')}
            </Button>
          )}
        </div>
      </div>

      {justConfirmed && (
        <Alert className="mb-6" variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{t('deliveryConfirmedTitle')}</AlertTitle>
          <AlertDescription>{t('deliveryConfirmedDescription')}</AlertDescription>
        </Alert>
      )}

      {justRated && (
        <Alert className="mb-6" variant="success">
          <Star className="h-4 w-4" />
          <AlertTitle>{t('deliveryRatedTitle')}</AlertTitle>
          <AlertDescription>{t('deliveryRatedDescription')}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="map">
            <TabsList className="mb-4">
              <TabsTrigger value="map">{t('tabs.map')}</TabsTrigger>
              <TabsTrigger value="info">{t('tabs.details')}</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="min-h-[400px]">
              {mapProps && <DeliveryTrackingMap {...mapProps} className="h-full" />}
            </TabsContent>

            <TabsContent value="info">
              <DeliveryDetailCard
                id={delivery.id}
                status={delivery.status as DeliveryStatus}
                pickupAddress={delivery.pickupAddress}
                deliveryAddress={delivery.deliveryAddress}
                pickupDate={new Date(delivery.pickupDate)}
                deliveryDate={delivery.deliveryDate ? new Date(delivery.deliveryDate) : undefined}
                estimatedArrival={
                  delivery.estimatedArrival ? new Date(delivery.estimatedArrival) : undefined
                }
                client={delivery.client}
                deliverer={delivery.deliverer || undefined}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <DeliveryTimeline status={delivery.status as DeliveryStatus} logs={delivery.logs || []} />

          {delivery.rating && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-2" />
                {t('yourRating')}
              </h3>
              <div className="flex mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < delivery.rating!.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              {delivery.rating.comment && <p className="mt-2 text-sm">{delivery.rating.comment}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(delivery.rating.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
