import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boxAvailabilitySubscriptionSchema } from '@/schemas/storage/storage.schema';
import { BoxType } from '@/server/services/shared/storage.service';
import { useStorage } from '@/hooks/common/use-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar as CalendarIcon, BellRing, Mail, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { toast } from 'sonner';

type FormValues = {
  warehouseId?: string;
  boxType?: string;
  startDate: Date;
  endDate: Date;
  maxPrice: number;
  minSize: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
};

export function AvailabilityNotificationForm() {
  const t = useTranslations('storage');
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; location: string }[]>(
    []
  );
  const { subscribeToAvailability, getWarehouses } = useStorage();

  // Récupérer la liste des entrepôts au chargement du composant
  useState(() => {
    getWarehouses()
      .then(data => {
        if (data) {
          setWarehouses(data);
        }
      })
      .catch(() => {
        toast.error(t('warehouses.error'));
      });
  });

  // Configuration du formulaire avec React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(boxAvailabilitySubscriptionSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours par défaut
      maxPrice: 20,
      minSize: 2,
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await subscribeToAvailability.mutateAsync({
        warehouseId: data.warehouseId,
        boxType: data.boxType as BoxType,
        startDate: data.startDate,
        endDate: data.endDate,
        maxPrice: data.maxPrice,
        minSize: data.minSize,
        notificationPreferences: {
          email: data.emailNotifications,
          push: data.pushNotifications,
          sms: data.smsNotifications,
        },
      });

      form.reset();
      toast.success(t('subscription.success'), {
        description: t('subscription.successDescription'),
      });
    } catch (error) {
      toast.error(t('subscription.error'), {
        description: error instanceof Error ? error.message : t('errors.general'),
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Sélection de l'entrepôt */}
            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.warehouse')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectWarehouse')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map(warehouse => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} - {warehouse.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('subscription.warehouseDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type de box */}
            <FormField
              control={form.control}
              name="boxType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.boxType')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectBoxType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(BoxType).map(type => (
                        <SelectItem key={type} value={type}>
                          {t(`boxTypes.${type.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('subscription.boxTypeDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date de début */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('form.startDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: fr })
                          ) : (
                            <span>{t('form.pickDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>{t('subscription.startDateDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date de fin */}
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('form.endDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: fr })
                          ) : (
                            <span>{t('form.pickDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date => date < form.getValues('startDate')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>{t('subscription.endDateDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            {/* Prix maximum */}
            <FormField
              control={form.control}
              name="maxPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('form.priceRange')}: {field.value}€ {t('form.perDay')}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      min={5}
                      max={100}
                      step={1}
                      onValueChange={value => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>{t('subscription.priceDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Taille minimale */}
            <FormField
              control={form.control}
              name="minSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('form.minSize')}: {field.value} m³
                  </FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={value => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>{t('subscription.sizeDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">{t('subscription.notificationPreferences')}</h3>

              {/* Notifications email */}
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('subscription.emailNotifications')}
                      </FormLabel>
                      <FormDescription>{t('subscription.emailDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Notifications push */}
              <FormField
                control={form.control}
                name="pushNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <BellRing className="h-4 w-4" />
                        {t('subscription.pushNotifications')}
                      </FormLabel>
                      <FormDescription>{t('subscription.pushDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Notifications SMS */}
              <FormField
                control={form.control}
                name="smsNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {t('subscription.smsNotifications')}
                      </FormLabel>
                      <FormDescription>{t('subscription.smsDescription')}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={subscribeToAvailability.isPending}>
          {subscribeToAvailability.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('subscription.subscribe')}
        </Button>
      </form>
    </Form>
  );
}
