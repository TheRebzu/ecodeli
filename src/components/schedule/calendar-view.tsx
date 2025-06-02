'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarIcon, Clock, User, DollarSign, MapPin } from 'lucide-react';
import { formatPrice, formatTime, formatDate } from '@/lib/format';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    type: 'booking' | 'availability' | 'blocked';
    status?: string;
    client?: {
      id: string;
      name: string;
      image?: string;
    };
    service?: {
      id: string;
      name: string;
      price: number;
    };
    notes?: string;
  };
}

interface BookingDetails {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  totalPrice: number;
  notes?: string;
  client: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
  };
}

/**
 * Vue calendrier avancée pour les prestataires
 * Intégration avec FullCalendar pour une expérience riche
 */
export function CalendarView() {
  const t = useTranslations('services.calendar');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('timeGridWeek');

  // Récupérer les réservations
  const bookingsQuery = api.service.getMyProviderBookings.useQuery({});

  // Récupérer les disponibilités
  const availabilitiesQuery = api.service.getMyAvailabilities.useQuery();

  // Mutation pour mettre à jour le statut d'une réservation
  const updateBookingMutation = api.service.updateBookingStatus.useMutation({
    onSuccess: () => {
      toast.success(t('booking.statusUpdated'));
      bookingsQuery.refetch();
      setShowEventDialog(false);
    },
    onError: error => {
      toast.error(error.message || t('booking.statusUpdateFailed'));
    },
  });

  // Récupérer les détails d'une réservation
  const bookingDetailsQuery = api.service.getBookingById.useQuery(
    { id: selectedEvent?.id || '' },
    { enabled: !!selectedEvent?.id && selectedEvent?.extendedProps.type === 'booking' }
  );

  // Convertir les données en événements FullCalendar
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Ajouter les réservations
    if (bookingsQuery.data) {
      bookingsQuery.data.forEach(booking => {
        const statusColors = {
          PENDING: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
          CONFIRMED: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
          COMPLETED: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
          CANCELLED: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
          RESCHEDULED: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
        };

        const colors = statusColors[booking.status as keyof typeof statusColors] || statusColors.PENDING;

        events.push({
          id: booking.id,
          title: `${booking.service.name} - ${booking.client.name}`,
          start: new Date(booking.startTime).toISOString(),
          end: new Date(booking.endTime).toISOString(),
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            type: 'booking',
            status: booking.status,
            client: booking.client,
            service: booking.service,
            notes: booking.notes,
          },
        });
      });
    }

    // Ajouter les disponibilités récurrentes (pour visualisation)
    if (availabilitiesQuery.data) {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours

      availabilitiesQuery.data.forEach(availability => {
        const current = new Date(now);
        while (current <= endDate) {
          if (current.getDay() === availability.dayOfWeek) {
            const [startHours, startMinutes] = availability.startTime.toString().split(':').map(Number);
            const [endHours, endMinutes] = availability.endTime.toString().split(':').map(Number);

            const startDateTime = new Date(current);
            startDateTime.setHours(startHours, startMinutes, 0, 0);

            const endDateTime = new Date(current);
            endDateTime.setHours(endHours, endMinutes, 0, 0);

            // Vérifier qu'il n'y a pas de réservation à ce moment
            const hasBooking = events.some(event => {
              const eventStart = new Date(event.start);
              const eventEnd = new Date(event.end);
              return (
                event.extendedProps.type === 'booking' &&
                ((startDateTime >= eventStart && startDateTime < eventEnd) ||
                 (endDateTime > eventStart && endDateTime <= eventEnd) ||
                 (startDateTime <= eventStart && endDateTime >= eventEnd))
              );
            });

            if (!hasBooking) {
              events.push({
                id: `availability-${availability.id}-${current.getTime()}`,
                title: t('availability.available'),
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                backgroundColor: '#f0fdf4',
                borderColor: '#22c55e',
                textColor: '#15803d',
                extendedProps: {
                  type: 'availability',
                },
              });
            }
          }
          current.setDate(current.getDate() + 1);
        }
      });
    }

    return events;
  }, [bookingsQuery.data, availabilitiesQuery.data, t]);

  // Gestionnaire de clic sur un événement
  const handleEventClick = useCallback((info: any) => {
    const event = info.event;
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: event.extendedProps,
    };

    setSelectedEvent(calendarEvent);
    
    if (calendarEvent.extendedProps.type === 'booking') {
      setShowEventDialog(true);
    }
  }, []);

  // Gestionnaire de mise à jour du statut
  const handleStatusUpdate = useCallback((newStatus: string) => {
    if (!selectedEvent) return;

    updateBookingMutation.mutate({
      id: selectedEvent.id,
      status: newStatus,
    });
  }, [selectedEvent, updateBookingMutation]);

  // Gestionnaire de changement de vue
  const handleViewChange = useCallback((view: string) => {
    setCalendarView(view as any);
  }, []);

  // Statut badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      PENDING: { label: t('status.pending'), variant: 'secondary' as const },
      CONFIRMED: { label: t('status.confirmed'), variant: 'default' as const },
      COMPLETED: { label: t('status.completed'), variant: 'secondary' as const },
      CANCELLED: { label: t('status.cancelled'), variant: 'destructive' as const },
      RESCHEDULED: { label: t('status.rescheduled'), variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Données de la réservation sélectionnée
  const bookingData = bookingDetailsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        
        <Tabs value={calendarView} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="dayGridMonth">{t('views.month')}</TabsTrigger>
            <TabsTrigger value="timeGridWeek">{t('views.week')}</TabsTrigger>
            <TabsTrigger value="timeGridDay">{t('views.day')}</TabsTrigger>
            <TabsTrigger value="listWeek">{t('views.list')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="h-[800px]">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              initialView={calendarView}
              editable={false}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              events={calendarEvents}
              eventClick={handleEventClick}
              height="100%"
              locale="fr"
              firstDay={1} // Lundi
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dialog de détails de réservation */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {t('booking.details')}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && formatDate(new Date(selectedEvent.start))}
            </DialogDescription>
          </DialogHeader>

          {bookingDetailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : bookingData ? (
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{t('booking.client')}</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-medium">{bookingData.client.name}</p>
                    <p className="text-sm text-muted-foreground">{bookingData.client.email}</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{t('booking.time')}</span>
                  </div>
                  <div className="pl-6">
                    <p>{formatTime(bookingData.startTime)} - {formatTime(bookingData.endTime)}</p>
                  </div>
                </div>
              </div>

              {/* Service et prix */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">{t('booking.service')}</span>
                </div>
                <div className="pl-6">
                  <p className="font-medium">{bookingData.service.name}</p>
                  <p className="text-sm text-muted-foreground">{bookingData.service.description}</p>
                  <p className="text-lg font-bold text-primary">{formatPrice(bookingData.totalPrice)}</p>
                </div>
              </div>

              {/* Statut */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{t('booking.status')}</span>
                </div>
                <div className="pl-6">
                  <StatusBadge status={bookingData.status} />
                </div>
              </div>

              {/* Notes */}
              {bookingData.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{t('booking.notes')}</span>
                  </div>
                  <div className="pl-6">
                    <p className="text-sm bg-muted p-3 rounded-md">{bookingData.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions de statut */}
              {bookingData.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStatusUpdate('CONFIRMED')}
                    disabled={updateBookingMutation.isPending}
                    className="flex-1"
                  >
                    {t('booking.confirm')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate('CANCELLED')}
                    disabled={updateBookingMutation.isPending}
                    className="flex-1"
                  >
                    {t('booking.cancel')}
                  </Button>
                </div>
              )}

              {bookingData.status === 'CONFIRMED' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStatusUpdate('COMPLETED')}
                    disabled={updateBookingMutation.isPending}
                    className="flex-1"
                  >
                    {t('booking.complete')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate('CANCELLED')}
                    disabled={updateBookingMutation.isPending}
                    className="flex-1"
                  >
                    {t('booking.cancel')}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
