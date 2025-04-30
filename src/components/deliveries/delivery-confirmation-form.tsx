'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonWithLoading } from '@/components/ui/button-with-loading';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDeliveryConfirmation } from '@/hooks/use-delivery-confirmation';
import { CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface DeliveryConfirmationFormProps {
  deliveryId: string;
  onCancel?: () => void;
  className?: string;
}

export default function DeliveryConfirmationForm({
  deliveryId,
  onCancel,
  className = '',
}: DeliveryConfirmationFormProps) {
  const t = useTranslations('deliveries.confirmation');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    delivery,
    confirmationCode,
    updateConfirmationCode,
    confirmDelivery,
    isConfirming,
    canConfirm,
    error,
  } = useDeliveryConfirmation(deliveryId);

  // Fonction pour gérer la confirmation
  const handleConfirm = async () => {
    const success = await confirmDelivery();
    if (success) {
      setShowSuccess(true);
    }
  };

  if (showSuccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            {t('successTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">{t('successMessage')}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCancel}>{t('backToDetails')}</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canConfirm && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('cannotConfirmTitle')}</AlertTitle>
            <AlertDescription>{t('cannotConfirmDescription')}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="confirmationCode">{t('codeLabel')}</Label>
          <Input
            id="confirmationCode"
            value={confirmationCode}
            onChange={e => updateConfirmationCode(e.target.value)}
            placeholder={t('codePlaceholder')}
            disabled={!canConfirm || isConfirming}
          />
          <p className="text-sm text-muted-foreground">{t('codeHelp')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback">{t('feedbackLabel')}</Label>
          <Textarea
            id="feedback"
            placeholder={t('feedbackPlaceholder')}
            disabled={!canConfirm || isConfirming}
          />
          <p className="text-sm text-muted-foreground">{t('feedbackHelp')}</p>
        </div>

        <div className="flex flex-col space-y-2 mt-6">
          <Button
            variant="outline"
            className="flex items-center"
            disabled={!canConfirm || isConfirming}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('uploadPhotoButton')}
          </Button>
          <p className="text-xs text-muted-foreground text-center">{t('photoOptional')}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
          {t('cancelButton')}
        </Button>
        <ButtonWithLoading
          onClick={handleConfirm}
          disabled={!canConfirm || isConfirming}
          loading={isConfirming}
        >
          {t('confirmButton')}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
