import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boxReservationCreateSchema, BoxReservationCreateInput } from '@/schemas/storage.schema';
import { Button } from '@/components/ui/button';
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
import { BoxWithWarehouse } from '@/types/storage';
import { useTranslations } from 'next-intl';
import { BoxDetailCard } from './box-detail-card';
import { useBoxReservation } from '@/hooks/use-storage';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BoxReservationFormProps {
  box: BoxWithWarehouse;
  startDate: Date;
  endDate: Date;
  onBack?: () => void;
}

export function BoxReservationForm({ box, startDate, endDate, onBack }: BoxReservationFormProps) {
  const t = useTranslations('storage');
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const { createReservation } = useBoxReservation();

  const form = useForm<BoxReservationCreateInput>({
    resolver: zodResolver(boxReservationCreateSchema),
    defaultValues: {
      boxId: box.id,
      startDate,
      endDate,
      notes: '',
    },
  });

  // Calcul de la durée et du prix total
  const durationInDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = durationInDays * box.pricePerDay;

  const onSubmit = (data: BoxReservationCreateInput) => {
    if (step === 'details') {
      setStep('payment');
    } else if (step === 'payment') {
      createReservation.mutate(data, {
        onSuccess: () => {
          setStep('confirmation');
        },
      });
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'details':
        return (
          <div className="space-y-6">
            <BoxDetailCard
              box={box}
              onSelect={() => {}}
              startDate={startDate}
              endDate={endDate}
              showReserveButton={false}
            />

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">{t('reservation.summary')}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t('reservation.period')}</span>
                  <span>
                    {format(startDate, 'PPP', { locale: fr })} &mdash;{' '}
                    {format(endDate, 'PPP', { locale: fr })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reservation.duration')}</span>
                  <span>
                    {durationInDays}{' '}
                    {durationInDays > 1 ? t('reservation.days') : t('reservation.day')}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{t('reservation.totalPrice')}</span>
                  <span>{totalPrice}€</span>
                </div>
              </div>
            </div>

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {renderStepContent()}

        <div className="flex gap-2 justify-between mt-6">
          {step === 'details' && onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              {t('reservation.back')}
            </Button>
          )}

          {step === 'payment' && (
            <Button type="button" variant="outline" onClick={() => setStep('details')}>
              {t('reservation.back')}
            </Button>
          )}

          {step !== 'confirmation' && (
            <Button
              type="submit"
              className={`${step === 'details' && onBack ? '' : 'w-full'}`}
              disabled={createReservation.isLoading}
            >
              {step === 'details'
                ? t('reservation.continueToPayment')
                : t('reservation.confirmAndPay')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
