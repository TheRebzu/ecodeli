'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDetailedReviewSchema } from '@/schemas/service/ratings.schema';
import { RatingStars } from '@/components/client/deliveries/delivery-rating-form';
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
import { StarIcon, Plus, X, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface RatingFormProps {
  bookingId: string;
  serviceId: string;
  serviceName: string;
  providerName: string;
  onSuccess?: () => void;
  showDetailedRating?: boolean;
  existingReview?: any;
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
  showDetailedRating = true,
  existingReview,
}: RatingFormProps) {
  const t = useTranslations('services.review');
  const router = useRouter();
  const [hoverRating, setHoverRating] = useState(0);
  const [pros, setPros] = useState<string[]>(existingReview?.pros || []);
  const [cons, setCons] = useState<string[]>(existingReview?.cons || []);
  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [showDetailedForm, setShowDetailedForm] = useState(showDetailedRating);

  // Initialisation du formulaire
  const form = useForm({
    resolver: zodResolver(createDetailedReviewSchema),
    defaultValues: {
      bookingId,
      rating: existingReview?.rating || 0,
      comment: existingReview?.comment || '',
      pros: existingReview?.pros || [],
      cons: existingReview?.cons || [],
      wouldRecommend: existingReview?.wouldRecommend,
      punctuality: existingReview?.punctuality || 0,
      quality: existingReview?.quality || 0,
      communication: existingReview?.communication || 0,
      valueForMoney: existingReview?.valueForMoney || 0,
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

  // Mutation pour créer une évaluation détaillée
  const createDetailedReviewMutation = api.service.createDetailedReview.useMutation({
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

  // Ajouter/retirer un point positif
  const addPro = () => {
    if (newPro.trim() && pros.length < 5) {
      const updatedPros = [...pros, newPro.trim()];
      setPros(updatedPros);
      form.setValue('pros', updatedPros);
      setNewPro('');
    }
  };

  const removePro = (index: number) => {
    const updatedPros = pros.filter((_, i) => i !== index);
    setPros(updatedPros);
    form.setValue('pros', updatedPros);
  };

  // Ajouter/retirer un point négatif
  const addCon = () => {
    if (newCon.trim() && cons.length < 5) {
      const updatedCons = [...cons, newCon.trim()];
      setCons(updatedCons);
      form.setValue('cons', updatedCons);
      setNewCon('');
    }
  };

  const removeCon = (index: number) => {
    const updatedCons = cons.filter((_, i) => i !== index);
    setCons(updatedCons);
    form.setValue('cons', updatedCons);
  };

  // Soumettre le formulaire
  const onSubmit = (data: any) => {
    // Utiliser l'API détaillée si le mode détaillé est activé
    if (showDetailedForm) {
      createDetailedReviewMutation.mutate({
        bookingId: data.bookingId,
        rating: data.rating,
        comment: data.comment,
        pros: data.pros,
        cons: data.cons,
        wouldRecommend: data.wouldRecommend,
        punctuality: data.punctuality,
        quality: data.quality,
        communication: data.communication,
        valueForMoney: data.valueForMoney,
      });
    } else {
      createReviewMutation.mutate({
        bookingId: data.bookingId,
        rating: data.rating,
        comment: data.comment,
      });
    }
  };

  // Vérifier si une évaluation existe déjà
  const hasExistingReview = bookingQuery.data?.review;

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
                    <div className="flex items-center justify-center">
                      <RatingStars
                        rating={field.value}
                        onChange={field.onChange}
                        size="xl"
                        showValue
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showDetailedForm ? (
              <Tabs defaultValue="rating" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="rating">{t('generalRating')}</TabsTrigger>
                  <TabsTrigger value="detailed">{t('detailedRating')}</TabsTrigger>
                  <TabsTrigger value="feedback">{t('feedback')}</TabsTrigger>
                </TabsList>

                <TabsContent value="rating" className="space-y-4">
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

                  <FormField
                    control={form.control}
                    name="wouldRecommend"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <FormLabel>{t('wouldRecommend')}</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="detailed" className="space-y-4">
                  {(['punctuality', 'quality', 'communication', 'valueForMoney'] as const).map(
                    criterion => (
                      <FormField
                        key={criterion}
                        control={form.control}
                        name={criterion}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t(`criteria.${criterion}`)}</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <RatingStars
                                  rating={field.value || 0}
                                  onChange={field.onChange}
                                  size="md"
                                  showValue
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}
                </TabsContent>

                <TabsContent value="feedback" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        <span>{t('prosLabel')}</span>
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder={t('prosPlaceholder')}
                          value={newPro}
                          onChange={e => setNewPro(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && addPro()}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPro}
                          disabled={!newPro.trim() || pros.length >= 5}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pros.map((pro, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center space-x-1"
                          >
                            <span>{pro}</span>
                            <button
                              type="button"
                              onClick={() => removePro(index)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                        <span>{t('consLabel')}</span>
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder={t('consPlaceholder')}
                          value={newCon}
                          onChange={e => setNewCon(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && addCon()}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCon}
                          disabled={!newCon.trim() || cons.length >= 5}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cons.map((con, index) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="flex items-center space-x-1"
                          >
                            <span>{con}</span>
                            <button
                              type="button"
                              onClick={() => removeCon(index)}
                              className="ml-1 hover:text-red-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
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
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                createReviewMutation.isPending ||
                createDetailedReviewMutation.isPending ||
                !form.formState.isDirty ||
                !form.getValues('rating')
              }
            >
              {createReviewMutation.isPending || createDetailedReviewMutation.isPending
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
