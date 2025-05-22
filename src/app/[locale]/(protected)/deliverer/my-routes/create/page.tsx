'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, CheckCircle, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from '@/navigation';
import { toast } from 'sonner';
import { useRoleProtection } from '@/hooks/use-role-protection';
import { api } from '@/trpc/react';

// Définition du schéma de validation pour le formulaire
const routeFormSchema = z.object({
  name: z.string().min(3, { message: 'Le nom doit contenir au moins 3 caractères' }),
  startAddress: z.string().min(5, { message: "L'adresse de départ est requise" }),
  endAddress: z.string().min(5, { message: "L'adresse d'arrivée est requise" }),
  date: z.date().optional(),
  time: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.string()).optional(),
  isFlexible: z.boolean().default(false),
  flexibilityHours: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

// Options pour les jours de la semaine
const daysOfWeek = [
  { id: 'MONDAY', label: 'Lundi' },
  { id: 'TUESDAY', label: 'Mardi' },
  { id: 'WEDNESDAY', label: 'Mercredi' },
  { id: 'THURSDAY', label: 'Jeudi' },
  { id: 'FRIDAY', label: 'Vendredi' },
  { id: 'SATURDAY', label: 'Samedi' },
  { id: 'SUNDAY', label: 'Dimanche' },
];

export default function CreateRoutePage() {
  useRoleProtection(['DELIVERER']);
  const t = useTranslations('routes');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdRouteId, setCreatedRouteId] = useState<string | null>(null);

  // Initialiser le formulaire
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: '',
      startAddress: '',
      endAddress: '',
      date: new Date(),
      time: '08:00',
      isRecurring: false,
      recurringDays: [],
      isFlexible: false,
      flexibilityHours: 1,
      notes: '',
    },
  });

  // Valeurs actuelles du formulaire
  const isRecurring = form.watch('isRecurring');
  const isFlexible = form.watch('isFlexible');

  // Gérer la soumission du formulaire
  const onSubmit = async (data: RouteFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Dans une implémentation réelle, on utiliserait un appel tRPC
      // const response = await api.delivererRoute.createRoute.mutate(data);

      // Simuler un délai pour la démo
      setTimeout(() => {
        console.log('Données soumises:', data);
        setCreatedRouteId('route-123');
        setSuccess(true);
        setIsSubmitting(false);
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la création de l'itinéraire";
      setError(message);
      setIsSubmitting(false);
    }
  };

  // Afficher la page de succès si la création a réussi
  if (success && createdRouteId) {
    return (
      <div className="container py-10 max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('createSuccess')}</CardTitle>
            <CardDescription>{t('routeCreatedDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('whatNextTitle')}</AlertTitle>
              <AlertDescription>{t('routeCreatedNextSteps')}</AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/deliverer/my-routes">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToRoutes')}
                </Link>
              </Button>

              <Button className="flex-1" asChild>
                <Link href="/deliverer/announcements">{t('browseAnnouncements')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('createRoute')}</h1>
          <p className="text-muted-foreground mt-1">{t('createRouteDescription')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/deliverer/my-routes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('routeDetails')}</CardTitle>
                <CardDescription>{t('routeFormInstructions')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nom de l'itinéraire */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('routeName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('routeNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>{t('routeNameDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Adresse de départ */}
                <FormField
                  control={form.control}
                  name="startAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('startAddress')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <MapPin className="text-green-600 h-4 w-4 mr-2" />
                          <Input placeholder={t('startAddressPlaceholder')} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Adresse d'arrivée */}
                <FormField
                  control={form.control}
                  name="endAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('endAddress')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <MapPin className="text-red-600 h-4 w-4 mr-2" />
                          <Input placeholder={t('endAddressPlaceholder')} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Récurrence */}
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('recurring')}</FormLabel>
                        <FormDescription>{t('recurringDescription')}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Date pour les itinéraires non récurrents */}
                {!isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('date')}</FormLabel>
                          <FormControl>
                            <DatePicker date={field.value} setDate={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('time')}</FormLabel>
                          <FormControl>
                            <TimePicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Jours récurrents */}
                {isRecurring && (
                  <FormField
                    control={form.control}
                    name="recurringDays"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">{t('recurringDays')}</FormLabel>
                          <FormDescription>{t('recurringDaysDescription')}</FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {daysOfWeek.map(day => (
                            <FormField
                              key={day.id}
                              control={form.control}
                              name="recurringDays"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={day.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(day.id)}
                                        onCheckedChange={checked => {
                                          return checked
                                            ? field.onChange([...(field.value || []), day.id])
                                            : field.onChange(
                                                field.value?.filter(value => value !== day.id)
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{day.label}</FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Flexibilité */}
                <FormField
                  control={form.control}
                  name="isFlexible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('flexible')}</FormLabel>
                        <FormDescription>{t('flexibleDescription')}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Heures de flexibilité */}
                {isFlexible && (
                  <FormField
                    control={form.control}
                    name="flexibilityHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('flexibilityHours')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={24}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>{t('flexibilityHoursDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Notes additionnelles */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('notesPlaceholder')}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>{t('notesDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => router.back()} type="button">
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('createRoute')}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
