'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { ButtonWithLoading } from '@/components/ui/button-with-loading';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Star,
  CheckCircle,
  ThumbsUp,
  AlertCircle,
  Package,
  Truck,
  Clock,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useDeliveryRating } from '@/hooks/use-delivery-rating';

// Schéma de validation
const ratingSchema = z.object({
  rating: z.number().min(1, { message: 'Veuillez attribuer au moins une étoile' }).max(5),
  deliverySpeed: z.number().min(1, { message: 'Veuillez évaluer la rapidité de livraison' }).max(5),
  delivererProfessionalism: z
    .number()
    .min(1, { message: 'Veuillez évaluer le professionnalisme du livreur' })
    .max(5),
  packageCondition: z.number().min(1, { message: "Veuillez évaluer l'état du colis" }).max(5),
  comment: z
    .string()
    .max(500, { message: 'Le commentaire ne peut pas dépasser 500 caractères' })
    .optional(),
  anonymous: z.boolean().default(false),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

export default function DeliveryRatingPage() {
  const t = useTranslations('client.deliveryRating');
  const router = useRouter();
  const params = useParams();

  const deliveryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [submitted, setSubmitted] = useState(false);

  // Utiliser notre hook de notation
  const { deliveryInfo, saveRating, isLoading, isSaving, error, canRate } =
    useDeliveryRating(deliveryId);

  // Initialiser le formulaire
  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: 0,
      deliverySpeed: 0,
      delivererProfessionalism: 0,
      packageCondition: 0,
      comment: '',
      anonymous: false,
    },
  });

  // Retourner aux détails de la livraison
  const handleCancel = () => {
    router.push(`/client/deliveries/${deliveryId}`);
  };

  // Soumettre le formulaire
  const onSubmit = async (data: RatingFormValues) => {
    try {
      await saveRating(data);
      setSubmitted(true);

      // Rediriger après 2 secondes
      setTimeout(() => {
        router.push(`/client/deliveries/${deliveryId}?rate=success`);
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de la soumission de l'évaluation:", error);
    }
  };

  // Composant d'étoiles interactives
  const StarRating = ({
    value,
    onChange,
    size = 'default',
    disabled = false,
  }: {
    value: number;
    onChange: (value: number) => void;
    size?: 'default' | 'sm' | 'lg';
    disabled?: boolean;
  }) => {
    const [hoverValue, setHoverValue] = useState(0);

    const starSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={cn(
              'focus:outline-none transition-all',
              disabled ? 'cursor-default' : 'cursor-pointer'
            )}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => !disabled && setHoverValue(0)}
            disabled={disabled}
          >
            <Star
              className={cn(
                starSize,
                'transition-all',
                (hoverValue || value) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              )}
            />
          </button>
        ))}
      </div>
    );
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

  // Afficher une erreur si l'évaluation n'est pas possible
  if (error || !deliveryInfo) {
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
          <Button onClick={handleCancel}>{t('backToDetails')}</Button>
        </div>
      </div>
    );
  }

  // Afficher un message si la livraison ne peut pas être évaluée
  if (!canRate) {
    return (
      <div className="container mx-auto py-6 max-w-xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToDetails')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t('cannotRateTitle')}</CardTitle>
            <CardDescription>{t('cannotRateDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {deliveryInfo.alreadyRated
                  ? t('alreadyRated')
                  : !deliveryInfo.isConfirmed
                    ? t('notConfirmedYet')
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

  // Afficher l'écran de confirmation après soumission
  if (submitted) {
    return (
      <div className="container mx-auto py-6 max-w-xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mt-4 bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl mt-3">{t('thankYouTitle')}</CardTitle>
            <CardDescription>{t('thankYouDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center my-2">
              <StarRating value={form.getValues('rating')} onChange={() => {}} size="lg" disabled />
            </div>
            <p className="text-muted-foreground text-sm mt-2">{t('redirecting')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Afficher le formulaire d'évaluation
  return (
    <div className="container mx-auto py-6 max-w-xl">
      <Button variant="ghost" size="sm" className="mb-6" onClick={handleCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToDetails')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t('pageTitle')}</CardTitle>
          <CardDescription>
            {t('pageDescription', {
              date: new Date(deliveryInfo.deliveryDate).toLocaleDateString('fr-FR'),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Note générale */}
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-center block text-lg">
                      {t('overallRating')}
                    </FormLabel>
                    <div className="flex justify-center pt-2 pb-4">
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        size="lg"
                        disabled={isSaving}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <h3 className="font-medium">{t('detailedRatings')}</h3>

              <div className="grid gap-6 md:grid-cols-1">
                {/* Vitesse de livraison */}
                <FormField
                  control={form.control}
                  name="deliverySpeed"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {t('deliverySpeed')}
                        </FormLabel>
                        <StarRating
                          value={field.value}
                          onChange={field.onChange}
                          size="sm"
                          disabled={isSaving}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Professionnalisme du livreur */}
                <FormField
                  control={form.control}
                  name="delivererProfessionalism"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                          {t('delivererProfessionalism')}
                        </FormLabel>
                        <StarRating
                          value={field.value}
                          onChange={field.onChange}
                          size="sm"
                          disabled={isSaving}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* État du colis */}
                <FormField
                  control={form.control}
                  name="packageCondition"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                          {t('packageCondition')}
                        </FormLabel>
                        <StarRating
                          value={field.value}
                          onChange={field.onChange}
                          size="sm"
                          disabled={isSaving}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Commentaire */}
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('commentLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('commentPlaceholder')}
                        className="resize-none min-h-[100px]"
                        {...field}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormDescription>{t('commentHelp')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Anonyme */}
              <FormField
                control={form.control}
                name="anonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSaving}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('anonymousRating')}</FormLabel>
                      <FormDescription>{t('anonymousDescription')}</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            {t('cancelButton')}
          </Button>
          <ButtonWithLoading
            onClick={form.handleSubmit(onSubmit)}
            loading={isSaving}
            disabled={!form.formState.isValid || isSaving}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            {t('submitButton')}
          </ButtonWithLoading>
        </CardFooter>
      </Card>
    </div>
  );
}
