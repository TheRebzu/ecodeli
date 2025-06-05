'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  Clock,
  PlusCircle,
  Trash2,
  Grid3X3,
  List,
  Calendar as CalendarGridIcon,
} from 'lucide-react';
import { formatDate, formatTime, formatDateTime } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { CalendarView } from '@/components/schedule/calendar-view';

interface Booking {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  client: {
    name: string;
    image?: string;
  };
  service: {
    name: string;
    price: number;
  };
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Calendrier des disponibilités pour les prestataires de services
 */
export function ProviderCalendar() {
  const t = useTranslations('services.provider');
  const router = useRouter();
  const utils = api.useUtils();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showAddAvailability, setShowAddAvailability] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<string>('1'); // Lundi par défaut
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Récupérer les réservations pour le prestataire
  const bookingsQuery = api.service.getMyProviderBookings.useQuery({});

  // Récupérer les disponibilités du prestataire
  const availabilitiesQuery = api.service.getMyAvailabilities.useQuery();

  // Mutation pour ajouter une disponibilité
  const createAvailabilityMutation = api.service.createAvailability.useMutation({
    onSuccess: () => {
      toast.success(t('availability.added'));
      setShowAddAvailability(false);
      utils.service.getMyAvailabilities.invalidate();
    },
    onError: error => {
      toast.error(error.message || t('availability.addFailed'));
    },
  });

  // Mutation pour supprimer une disponibilité
  const deleteAvailabilityMutation = api.service.deleteAvailability.useMutation({
    onSuccess: () => {
      toast.success(t('availability.deleted'));
      utils.service.getMyAvailabilities.invalidate();
    },
    onError: error => {
      toast.error(error.message || t('availability.deleteFailed'));
    },
  });

  // Filtrer les réservations pour la date sélectionnée
  const bookingsForSelectedDate = date
    ? bookingsQuery.data?.filter(booking => {
        const bookingDate = new Date(booking.startTime);
        return (
          bookingDate.getDate() === date.getDate() &&
          bookingDate.getMonth() === date.getMonth() &&
          bookingDate.getFullYear() === date.getFullYear()
        );
      })
    : [];

  // Fonction pour ajouter une disponibilité
  const handleAddAvailability = () => {
    createAvailabilityMutation.mutate({
      dayOfWeek: parseInt(dayOfWeek),
      startTime,
      endTime,
    });
  };

  // Fonction pour supprimer une disponibilité
  const handleDeleteAvailability = (id: string) => {
    if (confirm(t('availability.confirmDelete'))) {
      deleteAvailabilityMutation.mutate({ id });
    }
  };

  // Traduction des jours de la semaine
  const getDayName = (day: number) => {
    const days = [
      t('days.sunday'),
      t('days.monday'),
      t('days.tuesday'),
      t('days.wednesday'),
      t('days.thursday'),
      t('days.friday'),
      t('days.saturday'),
    ];
    return days[day];
  };

  // Obtenir la couleur en fonction du statut de la réservation
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'RESCHEDULED':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Fonction pour naviguer vers les détails d'une réservation
  const goToBookingDetails = (id: string) => {
    router.push(`/[locale]/(protected)/provider/appointments/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
          <p className="text-muted-foreground">{t('calendar.description')}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={showCalendarView ? 'default' : 'outline'}
            onClick={() => setShowCalendarView(true)}
            className="flex items-center gap-2"
          >
            <CalendarGridIcon className="h-4 w-4" />
            {t('views.fullCalendar')}
          </Button>
          <Button
            variant={!showCalendarView ? 'default' : 'outline'}
            onClick={() => setShowCalendarView(false)}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            {t('views.listView')}
          </Button>
        </div>
      </div>

      {showCalendarView ? (
        <CalendarView />
      ) : (
        <Tabs defaultValue="calendar">
          <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto mb-6">
            <TabsTrigger value="calendar">{t('tabs.calendar')}</TabsTrigger>
            <TabsTrigger value="availability">{t('tabs.availability')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('tabs.analytics')}</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Calendrier */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>{t('calendar.title')}</CardTitle>
                  <CardDescription>{t('calendar.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="border rounded-md"
                  />
                </CardContent>
              </Card>

              {/* Réservations du jour */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>{date ? formatDate(date) : t('calendar.selectDate')}</CardTitle>
                  <CardDescription>
                    {bookingsForSelectedDate?.length
                      ? t('calendar.appointmentsCount', { count: bookingsForSelectedDate.length })
                      : t('calendar.noAppointments')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingsQuery.isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : bookingsForSelectedDate?.length === 0 ? (
                    <div className="text-center py-10">
                      <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-2 text-base font-medium text-gray-900">
                        {t('calendar.nothingScheduled')}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{t('calendar.freeDay')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookingsForSelectedDate?.map(booking => (
                        <div
                          key={booking.id}
                          className={`p-4 border rounded-lg ${getStatusColor(booking.status)} flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity`}
                          onClick={() => goToBookingDetails(booking.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between">
                              <span className="text-sm font-medium truncate">
                                {booking.service.name}
                              </span>
                              <span className="text-sm">{booking.client.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('availability.title')}</CardTitle>
                  <CardDescription>{t('availability.subtitle')}</CardDescription>
                </div>
                <Dialog open={showAddAvailability} onOpenChange={setShowAddAvailability}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('availability.add')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('availability.addTitle')}</DialogTitle>
                      <DialogDescription>{t('availability.addSubtitle')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="day">{t('availability.day')}</Label>
                        <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('availability.selectDay')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{t('days.monday')}</SelectItem>
                            <SelectItem value="2">{t('days.tuesday')}</SelectItem>
                            <SelectItem value="3">{t('days.wednesday')}</SelectItem>
                            <SelectItem value="4">{t('days.thursday')}</SelectItem>
                            <SelectItem value="5">{t('days.friday')}</SelectItem>
                            <SelectItem value="6">{t('days.saturday')}</SelectItem>
                            <SelectItem value="0">{t('days.sunday')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="startTime">{t('availability.startTime')}</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="endTime">{t('availability.endTime')}</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isRecurring"
                          checked={isRecurring}
                          onCheckedChange={setIsRecurring}
                        />
                        <Label htmlFor="isRecurring">{t('availability.recurring')}</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddAvailability(false)}>
                        {t('availability.cancel')}
                      </Button>
                      <Button
                        onClick={handleAddAvailability}
                        disabled={createAvailabilityMutation.isPending}
                      >
                        {createAvailabilityMutation.isPending
                          ? t('availability.adding')
                          : t('availability.add')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {availabilitiesQuery.isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : !availabilitiesQuery.data?.length ? (
                  <div className="text-center py-10">
                    <Clock className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-base font-medium text-gray-900">
                      {t('availability.noAvailability')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{t('availability.addSome')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availabilitiesQuery.data.map(availability => (
                      <div
                        key={availability.id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{getDayName(availability.dayOfWeek)}</div>
                          <div className="text-sm text-gray-500">
                            {availability.startTime} - {availability.endTime}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAvailability(availability.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Statistiques rapides */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('analytics.totalBookings')}
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookingsQuery.data?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">{t('analytics.thisMonth')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('analytics.pendingBookings')}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bookingsQuery.data?.filter(b => b.status === 'PENDING').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('analytics.requiresAction')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('analytics.completedBookings')}
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bookingsQuery.data?.filter(b => b.status === 'COMPLETED').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('analytics.thisMonth')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('analytics.availabilitySlots')}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{availabilitiesQuery.data?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">{t('analytics.activeSlots')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Réservations récentes */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.recentBookings')}</CardTitle>
                <CardDescription>{t('analytics.recentBookingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsQuery.isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : !bookingsQuery.data?.length ? (
                  <div className="text-center py-10">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-base font-medium text-gray-900">
                      {t('analytics.noBookings')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('analytics.noBookingsDescription')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingsQuery.data
                      .sort(
                        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                      )
                      .slice(0, 5)
                      .map(booking => (
                        <div
                          key={booking.id}
                          className={`p-4 border rounded-lg ${getStatusColor(booking.status)} flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity`}
                          onClick={() => goToBookingDetails(booking.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">
                                {formatDate(booking.startTime)} à {formatTime(booking.startTime)}
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between">
                              <span className="text-sm font-medium truncate">
                                {booking.service.name}
                              </span>
                              <span className="text-sm">{booking.client.name}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <Badge
                              variant={
                                booking.status === 'PENDING'
                                  ? 'secondary'
                                  : booking.status === 'CONFIRMED'
                                    ? 'default'
                                    : booking.status === 'COMPLETED'
                                      ? 'secondary'
                                      : booking.status === 'CANCELLED'
                                        ? 'destructive'
                                        : 'outline'
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
