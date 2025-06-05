'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DeliveryStatus } from '@prisma/client';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  MapPin,
  Navigation,
  Package2,
  MessageSquare,
  CheckCircle,
  Truck,
  AlertCircle,
  InfoIcon,
  ClipboardList,
  QrCode,
} from 'lucide-react';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { DeliveryStatusBadge } from '@/components/deliveries/delivery-status-badge';
import { DeliveryMap } from '@/components/deliveries/delivery-map';
import { DeliveryTimeline } from '@/components/deliveries/delivery-timeline';
import { DeliveryNotes } from '@/components/deliveries/delivery-notes';
import { DeliveryStatusUpdate } from '@/components/deliveries/delivery-status-update';
import { DeliveryContact } from '@/components/deliveries/delivery-contact';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('deliveries');
  const id = params.id as string;
  const [userLocation, setUserLocation] = useLocalStorage<{ lat: number; lng: number } | null>(
    'user-location',
    null
  );

  // Récupérer la position de l'utilisateur si disponible
  React.useEffect(() => {
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, [userLocation, setUserLocation]);

  // Récupérer les détails de la livraison
  const {
    data: delivery,
    isLoading,
    isError,
    error,
  } = trpc.deliveries.getDeliveryById.useQuery({ id });

  // Mettre à jour le statut de la livraison
  const updateDeliveryStatusMutation = trpc.deliveries.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      // Invalider le cache pour recharger les données
      utils.deliveries.getDeliveryById.invalidate({ id });
    },
  });

  const utils = trpc.useContext();

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6 max-w-md mx-auto md:max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="grid gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !delivery) {
    return (
      <div className="container py-6 max-w-md mx-auto">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error.title')}</AlertTitle>
          <AlertDescription>{error?.message || t('error.fetchFailed')}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/deliverer/deliveries')} className="mt-4">
          {t('actions.backToList')}
        </Button>
      </div>
    );
  }

  // Déterminer les actions disponibles en fonction du statut
  const canStartDelivery = delivery.status === 'ACCEPTED';
  const canCompleteDelivery = delivery.status === 'IN_TRANSIT';
  const canReportIssue = ['ACCEPTED', 'IN_TRANSIT'].includes(delivery.status);
  const isCompleted = ['DELIVERED', 'FAILED', 'CANCELLED'].includes(delivery.status);

  // Fonction pour démarrer la livraison
  const handleStartDelivery = () => {
    updateDeliveryStatusMutation.mutate({
      id: delivery.id,
      status: 'IN_TRANSIT',
    });
    // Rediriger vers la page de livraison active
    router.push(`/deliverer/deliveries/active?id=${delivery.id}`);
  };

  // Fonction pour marquer comme livrée
  const handleCompleteDelivery = () => {
    router.push(`/deliverer/deliveries/active?id=${delivery.id}&action=complete`);
  };

  // Fonction pour signaler un problème
  const handleReportIssue = () => {
    router.push(`/deliverer/deliveries/active?id=${delivery.id}&action=issue`);
  };

  // Fonction pour ouvrir l'application de navigation
  const handleNavigate = () => {
    if (delivery.recipient.coordinates) {
      // Ouvrir Google Maps avec les coordonnées
      const url = `https://www.google.com/maps/dir/?api=1&destination=${delivery.recipient.coordinates.lat},${delivery.recipient.coordinates.lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="container py-6 space-y-6 max-w-md mx-auto md:max-w-2xl pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('detail.title')}</h1>
          <p className="text-sm text-muted-foreground">#{delivery.trackingNumber}</p>
        </div>
      </div>

      {/* Statut et actions principales */}
      <Card className="overflow-hidden">
        <div className="bg-primary/10 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-full">
              <Package2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('detail.status')}</p>
              <DeliveryStatusBadge status={delivery.status} className="mt-1" />
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {canStartDelivery && (
              <Button
                variant="default"
                className="flex-1 md:flex-initial"
                onClick={handleStartDelivery}
              >
                <Truck className="h-4 w-4 mr-2" />
                {t('actions.startDelivery')}
              </Button>
            )}
            {canCompleteDelivery && (
              <Button
                variant="default"
                className="flex-1 md:flex-initial"
                onClick={handleCompleteDelivery}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('actions.completeDelivery')}
              </Button>
            )}
            {canReportIssue && (
              <Button
                variant="outline"
                className="flex-1 md:flex-initial"
                onClick={handleReportIssue}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {t('actions.reportIssue')}
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-4 pt-6">
          {delivery.recipient.coordinates && (
            <div className="rounded-lg overflow-hidden mb-6 border">
              <DeliveryMap
                destination={delivery.recipient.coordinates}
                origin={delivery.sender?.coordinates}
                currentLocation={userLocation}
                height={200}
              />
            </div>
          )}

          <div className="grid gap-4">
            {/* Informations destinataire */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{delivery.recipient.name}</p>
                <p className="text-sm text-muted-foreground">{delivery.recipient.address}</p>
                {delivery.recipient.accessCodes && (
                  <p className="text-xs mt-1">
                    <span className="font-medium">{t('detail.accessCodes')}:</span>{' '}
                    {delivery.recipient.accessCodes}
                  </p>
                )}
              </div>
            </div>

            {/* Numéro de téléphone */}
            {delivery.recipient.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <a
                    href={`tel:${delivery.recipient.phone}`}
                    className="text-primary hover:underline"
                  >
                    {delivery.recipient.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Date et heure de livraison */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm">
                  {formatDate(delivery.scheduledDelivery)}{' '}
                  <span className="text-muted-foreground">
                    • {formatTime(delivery.scheduledDelivery)}
                  </span>
                </p>
              </div>
            </div>

            {/* Instructions de livraison */}
            {delivery.deliveryInstructions && (
              <div className="flex items-start gap-3 mt-2">
                <InfoIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('detail.instructions')}</p>
                  <p className="text-sm text-muted-foreground">{delivery.deliveryInstructions}</p>
                </div>
              </div>
            )}

            {/* Informations sur le colis */}
            <div className="flex items-start gap-3 mt-2">
              <Package2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('detail.packageInfo')}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-1">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.weight')}</p>
                    <p className="text-sm">{delivery.packageWeight} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.dimensions')}</p>
                    <p className="text-sm">
                      {delivery.packageDimensions?.length || '–'} ×{' '}
                      {delivery.packageDimensions?.width || '–'} ×{' '}
                      {delivery.packageDimensions?.height || '–'} cm
                    </p>
                  </div>
                  {delivery.requiresSignature && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-amber-600">
                        {t('detail.requiresSignature')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          {/* Boutons d'action secondaires */}
          <div className="flex gap-2 w-full">
            {delivery.recipient.coordinates && (
              <Button variant="outline" className="flex-1" onClick={handleNavigate}>
                <Navigation className="h-4 w-4 mr-2" />
                {t('actions.navigate')}
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/deliverer/messages/${delivery.id}`)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('actions.contact')}
            </Button>
          </div>
          {canStartDelivery && (
            <Alert className="mt-2">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>{t('detail.tips.title')}</AlertTitle>
              <AlertDescription>{t('detail.tips.beforeStarting')}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>

      {/* Tabs pour informations supplémentaires */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            {t('tabs.timeline')}
          </TabsTrigger>
          <TabsTrigger value="notes">
            <ClipboardList className="h-4 w-4 mr-2" />
            {t('tabs.notes')}
          </TabsTrigger>
          <TabsTrigger value="verification">
            <QrCode className="h-4 w-4 mr-2" />
            {t('tabs.verification')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('timeline.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryTimeline events={delivery.statusHistory || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('notes.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryNotes deliveryId={delivery.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('verification.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{t('verification.description')}</p>
              {delivery.verificationCode ? (
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t('verification.code')}</p>
                  <p className="text-2xl font-mono font-bold tracking-widest">
                    {delivery.verificationCode}
                  </p>
                </div>
              ) : (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>{t('verification.noCode.title')}</AlertTitle>
                  <AlertDescription>{t('verification.noCode.description')}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Boutons flottants en bas de page */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
          <div className="container max-w-md mx-auto md:max-w-2xl">
            <div className="flex gap-2">
              {canStartDelivery ? (
                <Button className="flex-1" size="lg" onClick={handleStartDelivery}>
                  <Truck className="h-5 w-5 mr-2" />
                  {t('actions.startDelivery')}
                </Button>
              ) : canCompleteDelivery ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    onClick={handleReportIssue}
                  >
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {t('actions.reportIssue')}
                  </Button>
                  <Button className="flex-1" size="lg" onClick={handleCompleteDelivery}>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {t('actions.completeDelivery')}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
