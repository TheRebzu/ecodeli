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
import { ButtonWithLoading } from '@/components/ui/button-with-loading';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDeliveryRating } from '@/hooks/use-delivery-rating';
import { CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface DeliveryRatingFormProps {
  deliveryId: string;
  onCancel?: () => void;
  className?: string;
}

export default function DeliveryRatingForm({
  deliveryId,
  onCancel,
  className = '',
}: DeliveryRatingFormProps) {
  const t = useTranslations('deliveries.rating');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    rating,
    comment,
    updateRating,
    updateComment,
    submitRating,
    isSubmitting,
    canRate,
    existingRating,
    error,
  } = useDeliveryRating(deliveryId);

  // Fonction pour gérer la soumission
  const handleSubmit = async () => {
    const success = await submitRating();
    if (success) {
      setShowSuccess(true);
    }
  };

  // Composant d'étoile pour la notation
  const RatingStar = ({ value, filled }: { value: number; filled: boolean }) => (
    <button
      type="button"
      onClick={() => updateRating(value)}
      className={`focus:outline-none ${filled ? 'text-yellow-500' : 'text-gray-300'}`}
      disabled={!canRate || isSubmitting}
    >
      <Star className="w-8 h-8" fill={filled ? 'currentColor' : 'none'} />
    </button>
  );

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
        <CardTitle>{existingRating ? t('editTitle') : t('title')}</CardTitle>
        <CardDescription>
          {existingRating ? t('editDescription') : t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canRate && !existingRating && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('cannotRateTitle')}</AlertTitle>
            <AlertDescription>{t('cannotRateDescription')}</AlertDescription>
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
          <Label htmlFor="rating">{t('ratingLabel')}</Label>
          <div className="flex justify-center space-x-2 py-4" id="rating">
            {[1, 2, 3, 4, 5].map(star => (
              <RatingStar key={star} value={star} filled={rating !== null && rating >= star} />
            ))}
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {rating ? t('ratingDescription', { rating }) : t('selectRating')}
          </p>
        </div>

        <div className="space-y-2 pt-4">
          <Label htmlFor="comment">{t('commentLabel')}</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={e => updateComment(e.target.value)}
            placeholder={t('commentPlaceholder')}
            rows={4}
            disabled={isSubmitting}
          />
          <p className="text-sm text-muted-foreground">{t('commentHelp')}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('cancelButton')}
        </Button>
        <ButtonWithLoading
          onClick={handleSubmit}
          disabled={(!canRate && !existingRating) || rating === null || isSubmitting}
          loading={isSubmitting}
        >
          {existingRating ? t('updateButton') : t('submitButton')}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
