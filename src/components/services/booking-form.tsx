'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema } from '@/schemas/service.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClockIcon, CreditCardIcon, CheckCircleIcon, Calendar, User, MapPin } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/format';
import { useServiceBooking } from '@/hooks/use-service-booking';
import { TimeslotPicker } from '@/components/schedule/timeslot-picker';
import { CalendarView } from '@/components/schedule/calendar-view';

interface BookingFormProps {
  service: {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration?: number;
    provider: {
      id: string;
      name?: string;
      image?: string;
      address?: string;
      city?: string;
    };
  };
  selectedDate: Date | null;
  onCancel: () => void;
  showAdvancedOptions?: boolean;
}

/**
 * Formulaire de réservation de service
 */
export function BookingForm({ 
  service, 
  selectedDate, 
  onCancel, 
  showAdvancedOptions = true 
}: BookingFormProps) {
  const t = useTranslations('services.booking');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const {
    selectedTimeSlot,
    handleTimeSlotChange,
    availableTimeSlots,
    handleNotesChange,
    createBooking,
    notes,
  } = useServiceBooking({
    serviceId: service.id,
    providerId: service.provider.id,
  });

  // Données du formulaire
  const form = useForm({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      serviceId: service.id,
      providerId: service.provider.id,
      date: selectedDate ? formatDate(selectedDate) : '',
      startTime: selectedTimeSlot || '',
      notes: notes,
      paymentMethod: 'card',
    },
  });

  // Soumission du formulaire
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createBooking();
      // La redirection est gérée dans le hook useServiceBooking
    } catch (error) {
      console.error('Booking error:', error);
      setIsSubmitting(false);
    }
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">{t('form.selectDateFirst')}</p>
        <Button onClick={onCancel} variant="outline" className="mt-2">
          {t('form.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du service */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t('form.title')}</h2>
            <p className="text-muted-foreground">{service.name}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowServiceDetails(!showServiceDetails)}
          >
            {showServiceDetails ? t('form.hideDetails') : t('form.showDetails')}
          </Button>
        </div>

        {showServiceDetails && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informations du service */}
              <div>
                <h4 className="font-medium mb-2">{t('form.serviceInfo')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    <span>{service.duration ? `${service.duration} min` : t('form.durationVariable')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4" />
                    <span>{formatPrice(service.price)}</span>
                  </div>
                  {service.description && (
                    <p className="text-muted-foreground">{service.description}</p>
                  )}
                </div>
              </div>

              {/* Informations du prestataire */}
              <div>
                <h4 className="font-medium mb-2">{t('form.providerInfo')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{service.provider.name || t('form.provider')}</span>
                  </div>
                  {service.provider.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{service.provider.city}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date et heure avec TimeslotPicker */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('form.appointment')}
            </h3>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.date')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled value={formatDate(selectedDate)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.time')}</FormLabel>
                  <FormControl>
                    <TimeslotPicker
                      value={field.value}
                      onChange={value => {
                        field.onChange(value);
                        handleTimeSlotChange(value);
                      }}
                      placeholder={t('form.selectTime')}
                      mode="start"
                      minTime="06:00"
                      maxTime="22:00"
                      step={15}
                      showQuickSelect={true}
                    />
                  </FormControl>
                  <FormMessage />
                  {availableTimeSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('form.noAvailableSlots')}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Options avancées */}
          {showAdvancedOptions && (
            <div className="space-y-4">
              <h3 className="font-medium">{t('form.advancedOptions')}</h3>
              
              {/* Nombre de participants */}
              <FormField
                control={form.control}
                name="participantCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.participantCount')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newCount = Math.max(1, participantCount - 1);
                            setParticipantCount(newCount);
                            field.onChange(newCount);
                          }}
                          disabled={participantCount <= 1}
                        >
                          -
                        </Button>
                        <span className="w-16 text-center">{participantCount}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newCount = participantCount + 1;
                            setParticipantCount(newCount);
                            field.onChange(newCount);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Separator />

          {/* Notes spéciales */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.notes')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('form.notesPlaceholder')}
                    rows={3}
                    onChange={e => {
                      field.onChange(e);
                      handleNotesChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

        {/* Méthode de paiement */}
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>{t('form.paymentMethod')}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="card" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer flex items-center">
                      <CreditCardIcon className="w-4 h-4 mr-2" />
                      {t('form.creditCard')}
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="appWallet" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      {t('form.appWallet')}
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="paypal" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">PayPal</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

          {/* Récapitulatif amélioré */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">{t('form.summary')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>{t('form.servicePrice')}</span>
                <span>{formatPrice(service.price)}</span>
              </div>
              
              {showAdvancedOptions && participantCount > 1 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('form.participants')} (x{participantCount})</span>
                  <span>{formatPrice(service.price * participantCount)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-medium text-base">
                <span>{t('form.total')}</span>
                <span className="text-primary">
                  {formatPrice(service.price * (showAdvancedOptions ? participantCount : 1))}
                </span>
              </div>
              
              {selectedTimeSlot && selectedDate && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">
                      {formatDate(selectedDate)} à {selectedTimeSlot}
                      {service.duration && ` (${service.duration} min)`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Conditions générales */}
        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4"
                    onChange={e => field.onChange(e.target.checked)}
                  />
                </div>
              </FormControl>
              <div className="text-sm">
                {t.rich('form.termsAndConditions', {
                  link: chunks => (
                    <a href="/terms" className="text-primary hover:underline">
                      {chunks}
                    </a>
                  ),
                })}
              </div>
            </FormItem>
          )}
        />

          {/* Boutons d'action */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              {t('form.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !form.formState.isValid || !selectedTimeSlot}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span> {t('form.processing')}
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 mr-2" /> 
                  {t('form.confirmBooking')} 
                  {showAdvancedOptions && participantCount > 1 && (
                    <span className="ml-1">({participantCount})</span>
                  )}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
