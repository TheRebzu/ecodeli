'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DeliveryConfirmationForm from '@/components/deliverer/deliveries/delivery-confirmation-form';
import { useDeliveryConfirmation } from '@/hooks/delivery/use-delivery-confirmation';

export default function DeliveryConfirmationPage() {
  const t = useTranslations('client.deliveryConfirmation');
  const router = useRouter();
  const params = useParams();

  const deliveryId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Utiliser notre hook de confirmation
  const { deliveryDetails, confirmationStep, isLoading, error, canConfirm, refetchDelivery } =
    useDeliveryConfirmation(deliveryId);

  // Gérer la redirection après confirmation
  const handleSuccess = () => {
    router.push(`/client/deliveries/${deliveryId}?confirm=success`);
  };

  // Retourner aux détails de la livraison
  const handleCancel = () => {
    router.push(`/client/deliveries/${deliveryId}`);
  };

  // Afficher un squelette pendant le chargement
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToDetails')}
        </Button>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  // Afficher une erreur si la confirmation n'est pas possible
  if (error || !deliveryDetails) {
    return (
      <div className="container mx-auto py-6 max-w-xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToDetails')}
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{error?.message || t('deliveryNotFound')}</AlertDescription>
        </Alert>

        <div className="flex justify-center mt-6">
          <Button onClick={() => refetchDelivery()}>{t('tryAgain')}</Button>
        </div>
      </div>
    );
  }

  // Afficher un message si la livraison ne peut pas être confirmée
  if (!canConfirm) {
    return (
      <div className="container mx-auto py-6 max-w-xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToDetails')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t('cannotConfirmTitle')}</CardTitle>
            <CardDescription>{t('cannotConfirmDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {confirmationStep === 'not_started'
                  ? t('notReadyForConfirmation')
                  : confirmationStep === 'completed'
                    ? t('alreadyConfirmed')
                    : t('contactSupport')}
              </AlertDescription>
            </Alert>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleCancel}>{t('backToDetails')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si la livraison est en attente de confirmation, afficher le formulaire
  return (
    <div className="container mx-auto py-6 max-w-xl">
      <Button variant="ghost" size="sm" className="mb-6" onClick={handleCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToDetails')}
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('pageTitle')}</CardTitle>
          <CardDescription>{t('pageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>{t('instructionsTitle')}</AlertTitle>
            <AlertDescription>{t('instructionsDescription')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <DeliveryConfirmationForm
        deliveryId={deliveryId}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
        afterConfirmation="rating"
      />
    </div>
  );
}
