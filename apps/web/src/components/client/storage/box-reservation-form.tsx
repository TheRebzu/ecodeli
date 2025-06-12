import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  boxReservationCreateSchema,
  BoxReservationCreateInput,
} from '@/schemas/storage/storage.schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { OptimalPricingCalculator } from '@/components/client/storage/optimal-pricing-calculator';
import { BoxRecommendations } from '@/components/client/storage/box-recommendations';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BoxWithWarehouse } from '@/types/warehouses/storage-box';
import { useTranslations } from 'next-intl';
import { BoxDetailCard } from '@/components/client/storage/box-detail-card';
import { useBoxReservation } from '@/hooks/common/use-storage';
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Package,
  FileText,
  MapPin,
  Clock,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/trpc/react';

interface BoxReservationFormProps {
  box: BoxWithWarehouse;
  startDate: Date;
  endDate: Date;
  onBack?: () => void;
  onSuccess?: (reservationId: string) => void;
}

type ReservationStep = 'selection' | 'details' | 'payment' | 'confirmation';

export function BoxReservationForm({
  box,
  startDate,
  endDate,
  onBack,
  onSuccess,
}: BoxReservationFormProps) {
  const t = useTranslations('storage');
  const [step, setStep] = useState<ReservationStep>('selection');
  const [selectedBox, setSelectedBox] = useState(box);
  const [calculatedPricing, setCalculatedPricing] = useState<any>(null);

  // Mutation pour créer la réservation
  const createReservation = api.storage.createBoxReservation.useMutation();

  const form = useForm<BoxReservationCreateInput>({
    resolver: zodResolver(boxReservationCreateSchema),
    defaultValues: {
      boxId: selectedBox.id,
      startDate,
      endDate,
      notes: '',
    },
  });

  // Calcul de la durée et du prix total
  const durationInDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = durationInDays * selectedBox.pricePerDay;

  const onSubmit = (data: BoxReservationCreateInput) => {
    createReservation.mutate(
      {
        ...data,
        boxId: selectedBox.id,
      },
      {
        onSuccess: result => {
          setStep('confirmation');
          onSuccess?.(result.id);
        },
      }
    );
  };

  const handleStepForward = () => {
    const steps: ReservationStep[] = ['selection', 'details', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleStepBack = () => {
    const steps: ReservationStep[] = ['selection', 'details', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      onBack?.();
    }
  };

  const getStepProgress = () => {
    const steps = ['selection', 'details', 'payment', 'confirmation'];
    return ((steps.indexOf(step) + 1) / steps.length) * 100;
  };

  const getStepIcon = (stepName: ReservationStep) => {
    switch (stepName) {
      case 'selection':
        return Package;
      case 'details':
        return FileText;
      case 'payment':
        return CreditCard;
      case 'confirmation':
        return CheckCircle2;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'selection':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Box sélectionnée</CardTitle>
                <CardDescription>
                  Vérifiez votre sélection ou explorez d'autres options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{selectedBox.name}</h3>
                    <Badge variant="outline">{selectedBox.boxType}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>Taille: {selectedBox.size}m²</div>
                    <div>Prix: {selectedBox.pricePerDay}€/jour</div>
                    <div>Entrepôt: {selectedBox.warehouse.name}</div>
                    <div>Adresse: {selectedBox.warehouse.address}</div>
                  </div>
                  {selectedBox.features && selectedBox.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedBox.features.map((feature: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Calculateur de prix optimal */}
            <OptimalPricingCalculator
              box={selectedBox}
              startDate={startDate}
              endDate={endDate}
              onPricingCalculated={setCalculatedPricing}
            />

            {/* Recommandations alternatives */}
            <BoxRecommendations
              filters={{
                warehouseId: selectedBox.warehouse.id,
                startDate,
                endDate,
              }}
              onBoxSelect={boxId => {
                // Dans un cas réel, il faudrait récupérer les détails de la box
                console.log('Box alternative sélectionnée:', boxId);
              }}
              maxRecommendations={3}
            />
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails de la réservation</CardTitle>
                <CardDescription>
                  Période du {format(startDate, 'PPP', { locale: fr })} au{' '}
                  {format(endDate, 'PPP', { locale: fr })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Box sélectionnée</span>
                    <span className="font-medium">{selectedBox.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Durée</span>
                    <span className="font-medium">
                      {durationInDays} {durationInDays > 1 ? 'jours' : 'jour'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Prix total</span>
                    <span className="font-bold text-lg">{totalPrice}€</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('reservation.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('reservation.notesPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('reservation.notesHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <Alert variant="default" className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('reservation.paymentSimulation')}</AlertTitle>
              <AlertDescription>{t('reservation.paymentDescription')}</AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">{t('reservation.paymentDetails')}</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('reservation.subtotal')}</span>
                  <span>{totalPrice}€</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reservation.serviceFee')}</span>
                  <span>0€</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reservation.vat')}</span>
                  <span>{(totalPrice * 0.2).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>{t('reservation.finalTotal')}</span>
                  <span>{(totalPrice * 1.2).toFixed(2)}€</span>
                </div>
              </div>
            </div>

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('reservation.termsTitle')}</AlertTitle>
              <AlertDescription>{t('reservation.termsDescription')}</AlertDescription>
            </Alert>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">{t('reservation.confirmed')}</h2>
            <p className="text-muted-foreground">{t('reservation.confirmationMessage')}</p>
            <Alert>
              <AlertTitle>{t('reservation.accessCodeTitle')}</AlertTitle>
              <AlertDescription>{t('reservation.accessCodeDescription')}</AlertDescription>
            </Alert>
            <Button onClick={() => (window.location.href = '/client/storage')} className="w-full">
              {t('reservation.viewReservations')}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicateur de progression */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Réservation de box</h2>
          <Badge variant="outline">{step === 'confirmation' ? 'Confirmée' : 'En cours'}</Badge>
        </div>
        <Progress value={getStepProgress()} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Sélection</span>
          <span>Détails</span>
          <span>Paiement</span>
          <span>Confirmation</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {renderStepContent()}

          {step !== 'confirmation' && (
            <div className="flex gap-2 justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleStepBack}
                disabled={step === 'selection' && !onBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>

              <div className="flex gap-2">
                {step === 'selection' && (
                  <Button type="button" onClick={handleStepForward}>
                    Continuer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}

                {step === 'details' && (
                  <Button type="button" onClick={handleStepForward}>
                    Procéder au paiement
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}

                {step === 'payment' && (
                  <Button
                    type="submit"
                    disabled={createReservation.isLoading}
                    className="bg-primary"
                  >
                    {createReservation.isLoading && (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    )}
                    <CreditCard className="h-4 w-4 mr-2" />
                    Confirmer le paiement
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
