'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createReviewSchema } from '@/schemas/service.schema';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StarIcon } from 'lucide-react';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface RatingFormProps {
  bookingId: string;
  serviceId: string;
  serviceName: string;
  providerName: string;
  onSuccess?: () => void;
}

/**
 * Formulaire d'évaluation pour un service
 */
export function RatingForm({
  bookingId,
  serviceId,
  serviceName,
  providerName,
  onSuccess,
}: RatingFormProps) {
  const t = useTranslations('services.review');
  const router = useRouter();
  const [hoverRating, setHoverRating] = useState(0);

  // Initialisation du formulaire
  const form = useForm({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      bookingId,
      rating: 0,
      comment: '',
    },
  });

  // Récupérer les détails de la réservation pour vérifier si une évaluation existe déjà
  const bookingQuery = api.service.getBookingById.useQuery(
    { id: bookingId },
    {
      onSuccess: data => {
        if (data.review) {
          form.setValue('rating', data.review.rating);
          form.setValue('comment', data.review.comment || '');
        }
      },
    }
  );

  // Mutation pour créer ou mettre à jour une évaluation
  const createReviewMutation = api.service.createReview.useMutation({
    onSuccess: () => {
      toast.success(t('success'));
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/[locale]/(protected)/client/services/${serviceId}`);
      }
    },
    onError: error => {
      toast.error(error.message || t('error'));
    },
  });

  // Soumettre le formulaire
  const onSubmit = (data: any) => {
    createReviewMutation.mutate({
      bookingId: data.bookingId,
      rating: data.rating,
      comment: data.comment,
    });
  };

  // Vérifier si une évaluation existe déjà
  const hasExistingReview = bookingQuery.data?.review;

  // Générer les étoiles pour l'évaluation
  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => i + 1).map(star => {
      const rating = form.getValues('rating');
      const filled = star <= (hoverRating || rating);

      return (
        <button
          key={star}
          type="button"
          className="relative p-1"
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => form.setValue('rating', star, { shouldValidate: true })}
        >
          <StarIcon
            className={`h-8 w-8 ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      );
    });
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{hasExistingReview ? t('editTitle') : t('title')}</CardTitle>
        <CardDescription>
          {t('subtitle', { service: serviceName, provider: providerName })}
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel>{t('ratingLabel')}</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-center">{renderStars()}</div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('commentLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('commentPlaceholder')}
                      className="h-32 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                createReviewMutation.isPending ||
                !form.formState.isDirty ||
                !form.getValues('rating')
              }
            >
              {createReviewMutation.isPending
                ? t('submitting')
                : hasExistingReview
                  ? t('update')
                  : t('submit')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
