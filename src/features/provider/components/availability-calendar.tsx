"use client";

import { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/fr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Plus,
  Settings,
  User,
  Calendar as CalendarIcon,
} from "lucide-react";

// Configuration moment en français
moment.locale("fr");
const localizer = momentLocalizer(moment);

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookingId?: string;
  clientName?: string;
  serviceName?: string;
}

interface WeeklyAvailability {
  [dayOfWeek: number]: TimeSlot[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "booking" | "availability" | "blocked";
    status?: string;
    client?: string;
    service?: string;
  };
}

export function AvailabilityCalendar() {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] =
    useState<WeeklyAvailability>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAddSlotDialog, setShowAddSlotDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Charger les disponibilités et réservations
  useEffect(() => {
    loadAvailabilityData();
  }, [selectedDate]);

  const loadAvailabilityData = async () => {
    setIsLoading(true);
    try {
      // Charger les disponibilités hebdomadaires
      const weeklyResponse = await fetch(
        "/api/provider/availability?type=weekly",
      );
      const weeklyData = await weeklyResponse.json();
      setWeeklyAvailability(weeklyData.availability || {});

      // Charger les réservations et créneaux du mois
      const startOfMonth = moment(selectedDate).startOf("month").toISOString();
      const endOfMonth = moment(selectedDate).endOf("month").toISOString();

      const dailyResponse = await fetch(
        `/api/provider/availability?type=daily&dateFrom=${startOfMonth}&dateTo=${endOfMonth}`,
      );
      const dailyData = await dailyResponse.json();

      // Charger les réservations
      const bookingsResponse = await fetch(
        `/api/provider/interventions?dateFrom=${startOfMonth}&dateTo=${endOfMonth}&status=CONFIRMED,IN_PROGRESS`,
      );
      const bookingsData = await bookingsResponse.json();

      // Convertir en événements de calendrier
      const calendarEvents: CalendarEvent[] = [];

      // Ajouter les réservations
      if (bookingsData.data?.interventions) {
        bookingsData.data.interventions.forEach((booking: any) => {
          const startDate = new Date(booking.scheduledDate);
          const [hours, minutes] = booking.scheduledTime
            ?.split(":")
            .map(Number) || [9, 0];
          startDate.setHours(hours, minutes);

          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + booking.duration);

          calendarEvents.push({
            id: booking.id,
            title: `${booking.service.name} - ${booking.client.firstName}`,
            start: startDate,
            end: endDate,
            resource: {
              type: "booking",
              status: booking.status,
              client: `${booking.client.firstName} ${booking.client.lastName}`,
              service: booking.service.name,
            },
          });
        });
      }

      // Générer les créneaux de disponibilité pour le mois
      generateAvailabilitySlots(calendarEvents);

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Erreur lors du chargement des disponibilités:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAvailabilitySlots = (existingEvents: CalendarEvent[]) => {
    const startOfMonth = moment(selectedDate).startOf("month");
    const endOfMonth = moment(selectedDate).endOf("month");
    const availabilityEvents: CalendarEvent[] = [];

    // Pour chaque jour du mois
    for (
      let date = startOfMonth.clone();
      date.isSameOrBefore(endOfMonth);
      date.add(1, "day")
    ) {
      const dayOfWeek = date.day();
      const daySlots = weeklyAvailability[dayOfWeek] || [];

      daySlots.forEach((slot) => {
        const [startHours, startMinutes] = slot.startTime
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = slot.endTime.split(":").map(Number);

        const slotStart = date
          .clone()
          .hours(startHours)
          .minutes(startMinutes)
          .toDate();
        const slotEnd = date
          .clone()
          .hours(endHours)
          .minutes(endMinutes)
          .toDate();

        // Vérifier s'il y a une réservation à ce créneau
        const hasBooking = existingEvents.some(
          (event) =>
            event.resource.type === "booking" &&
            moment(event.start).isSame(slotStart, "minute"),
        );

        if (!hasBooking && slot.isAvailable) {
          availabilityEvents.push({
            id: `available-${date.format("YYYY-MM-DD")}-${slot.startTime}`,
            title: "Disponible",
            start: slotStart,
            end: slotEnd,
            resource: {
              type: "availability",
            },
          });
        }
      });
    }

    setEvents((prev) => [...prev, ...availabilityEvents]);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({
      date: start,
      startTime: moment(start).format("HH:mm"),
      endTime: moment(end).format("HH:mm"),
    });
    setShowAddSlotDialog(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.resource.type === "booking") {
      // Ouvrir les détails de la réservation
      window.open(`/provider/interventions/${event.id}`, "_blank");
    }
  };

  const addTimeSlot = async () => {
    if (!selectedSlot) return;

    try {
      const response = await fetch("/api/provider/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "daily",
          date: selectedSlot.date.toISOString(),
          slots: [
            {
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
              isAvailable: true,
            },
          ],
        }),
      });

      if (response.ok) {
        setShowAddSlotDialog(false);
        setSelectedSlot(null);
        loadAvailabilityData();
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du créneau:", error);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3174ad";
    let borderColor = "#265985";

    if (event.resource.type === "booking") {
      if (event.resource.status === "CONFIRMED") {
        backgroundColor = "#16a34a";
        borderColor = "#15803d";
      } else if (event.resource.status === "IN_PROGRESS") {
        backgroundColor = "#dc2626";
        borderColor = "#b91c1c";
      }
    } else if (event.resource.type === "availability") {
      backgroundColor = "#06b6d4";
      borderColor = "#0891b2";
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: "white",
        border: "none",
        borderRadius: "4px",
      },
    };
  };

  const messages = {
    next: "Suivant",
    previous: "Précédent",
    today: "Aujourd'hui",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    date: "Date",
    time: "Heure",
    event: "Événement",
    allDay: "Toute la journée",
    noEventsInRange: "Aucun événement dans cette période",
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Calendrier des disponibilités
          </h1>
          <p className="text-muted-foreground">
            Gérez vos créneaux et visualisez vos rendez-vous
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowAddSlotDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un créneau
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Disponible</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    events.filter((e) => e.resource.type === "availability")
                      .length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Réservé</p>
                <p className="text-2xl font-bold text-green-600">
                  {events.filter((e) => e.resource.type === "booking").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">En cours</p>
                <p className="text-2xl font-bold text-orange-600">
                  {
                    events.filter((e) => e.resource.status === "IN_PROGRESS")
                      .length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-gray-400 rounded"></div>
              <div>
                <p className="text-sm font-medium">Taux d'occupation</p>
                <p className="text-2xl font-bold">
                  {events.length > 0
                    ? Math.round(
                        (events.filter((e) => e.resource.type === "booking")
                          .length /
                          events.length) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendrier */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              view={view}
              onView={setView}
              date={selectedDate}
              onNavigate={setSelectedDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              messages={messages}
              step={30}
              timeslots={2}
              min={new Date(0, 0, 0, 7, 0)}
              max={new Date(0, 0, 0, 22, 0)}
            />
          )}
        </CardContent>
      </Card>

      {/* Légende */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Légende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-cyan-500 rounded"></div>
              <span className="text-sm">Disponible</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Réservé confirmé</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">En cours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'ajout de créneau */}
      <Dialog open={showAddSlotDialog} onOpenChange={setShowAddSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un créneau de disponibilité</DialogTitle>
            <DialogDescription>
              Créez un nouveau créneau horaire pour recevoir des réservations
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  value={moment(selectedSlot.date).format("DD/MM/YYYY")}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Heure de début</Label>
                  <Input
                    type="time"
                    value={selectedSlot.startTime}
                    onChange={(e) =>
                      setSelectedSlot((prev) =>
                        prev ? { ...prev, startTime: e.target.value } : null,
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Heure de fin</Label>
                  <Input
                    type="time"
                    value={selectedSlot.endTime}
                    onChange={(e) =>
                      setSelectedSlot((prev) =>
                        prev ? { ...prev, endTime: e.target.value } : null,
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddSlotDialog(false)}
                >
                  Annuler
                </Button>
                <Button onClick={addTimeSlot}>Ajouter le créneau</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
