"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Route,
  Car,
  Fuel,
  BarChart3,
  Target} from "lucide-react";
import { formatTime, formatDate } from "@/lib/i18n/formatters";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    type: "availability" | "delivery" | "route" | "break" | "exception";
    status?: string;
    zone?: string;
    optimizationScore?: number;
    notes?: string;
    estimatedEarnings?: number;
  };
}

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  zones: string[];
  isActive: boolean;
  notes?: string;
}

interface RouteOptimization {
  routeId: string;
  score: number;
  estimatedDeliveries: number;
  estimatedEarnings: number;
  zones: string[];
  timeSlots: string[];
}

export default function DelivererPlanning() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [calendarView, setCalendarView] = useState<
    "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek"
  >("timeGridWeek");
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilitySlot>({ dayOfWeek: 1,
    startTime: "08:00",
    endTime: "18:00",
    zones: [],
    isActive: true });

  // Queries
  const { data: delivererSchedule, refetch: refetchSchedule } =
    api.deliverer.schedule.getWeeklySchedule.useQuery({ startDate: startOfWeek(selectedDate),
      endDate: endOfWeek(selectedDate) });

  const { data } =
    api.deliverer.schedule.getAvailabilitySlots.useQuery();
  const { data } = api.deliverer.zones.getMyZones.useQuery();
  const { data } =
    api.deliverer.routes.getOptimizations.useQuery({ date: format(selectedDate, "yyyy-MM-dd") });
  const { data } = api.deliverer.schedule.getStats.useQuery({ period: "week",
    date: format(selectedDate, "yyyy-MM-dd") });

  // Mutations
  const createAvailabilityMutation =
    api.deliverer.schedule.createAvailability.useMutation({ onSuccess: () => {
        toast.success("Créneaux de disponibilité créés avec succès");
        setShowAvailabilityDialog(false);
        setAvailabilityForm({
          dayOfWeek: 1,
          startTime: "08:00",
          endTime: "18:00",
          zones: [],
          isActive: true });
        refetchSchedule();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la création des créneaux");
      }});

  const updateAvailabilityMutation =
    api.deliverer.schedule.updateAvailability.useMutation({
      onSuccess: () => {
        toast.success("Disponibilité mise à jour");
        refetchSchedule();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la mise à jour");
      }});

  const createExceptionMutation =
    api.deliverer.schedule.createException.useMutation({
      onSuccess: () => {
        toast.success("Exception créée");
        refetchSchedule();
      },
      onError: (error) => {
        toast.error(
          error.message || "Erreur lors de la création de l'exception",
        );
      }});

  const optimizeRouteMutation =
    api.deliverer.routes.optimizeForDate.useMutation({
      onSuccess: () => {
        toast.success("Route optimisée pour la date sélectionnée");
        refetchSchedule();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de l'optimisation");
      }});

  // Convert data to FullCalendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add availability slots
    if (availabilitySlots) {
      const startDate = startOfWeek(selectedDate);
      availabilitySlots.forEach((slot) => {
        for (let i = 0; i < 7; i++) {
          const slotDate = addDays(startDate, i);
          if (slotDate.getDay() === slot.dayOfWeek) {
            const [startHours, startMinutes] = slot.startTime
              .split(":")
              .map(Number);
            const [endHours, endMinutes] = slot.endTime.split(":").map(Number);

            const startDateTime = new Date(slotDate);
            startDateTime.setHours(startHours, startMinutes, 0, 0);

            const endDateTime = new Date(slotDate);
            endDateTime.setHours(endHours, endMinutes, 0, 0);

            events.push({
              id: `availability-${slot.id}-${slotDate.getTime()}`,
              title: `Disponible - ${slot.zones?.join(", ") || "Toutes zones"}`,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              backgroundColor: slot.isActive ? "#dcfce7" : "#f3f4f6",
              borderColor: slot.isActive ? "#16a34a" : "#9ca3af",
              textColor: slot.isActive ? "#166534" : "#6b7280",
              extendedProps: {
                type: "availability",
                zone: slot.zones?.join(", "),
                notes: slot.notes}});
          }
        }
      });
    }

    // Add scheduled deliveries
    if (delivererSchedule?.deliveries) {
      delivererSchedule.deliveries.forEach((delivery) => {
        const statusColors = {
          SCHEDULED: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" }, IN_PROGRESS: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
          COMPLETED: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
          CANCELLED: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" }};

        const colors =
          statusColors[delivery.status as keyof typeof statusColors] ||
          statusColors.SCHEDULED;

        events.push({
          id: `delivery-${delivery.id}`,
          title: `Livraison - ${delivery.trackingCode}`,
          start: new Date(delivery.scheduledPickupTime).toISOString(),
          end: new Date(delivery.estimatedDeliveryTime).toISOString(),
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            type: "delivery",
            status: delivery.status,
            estimatedEarnings: delivery.price}});
      });
    }

    // Add route optimizations as suggestions
    if (routeOptimizations) {
      routeOptimizations.forEach((optimization) => {
        optimization.timeSlots.forEach((timeSlot) => {
          const [startTime, endTime] = timeSlot.split("-");
          const startDateTime = new Date(
            `${format(selectedDate, "yyyy-MM-dd")}T${startTime}:00`,
          );
          const endDateTime = new Date(
            `${format(selectedDate, "yyyy-MM-dd")}T${endTime}:00`,
          );

          events.push({
            id: `optimization-${optimization.routeId}-${timeSlot}`,
            title: `Route suggérée - ${optimization.zones.join(", ")}`,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            backgroundColor: "#ede9fe",
            borderColor: "#8b5cf6",
            textColor: "#5b21b6",
            extendedProps: {
              type: "route",
              optimizationScore: optimization.score,
              estimatedEarnings: optimization.estimatedEarnings,
              zone: optimization.zones.join(", ")}});
        });
      });
    }

    return events;
  }, [availabilitySlots, delivererSchedule, routeOptimizations, selectedDate]);

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
      extendedProps: event.extendedProps};

    setSelectedEvent(calendarEvent);
    setShowEventDialog(true);
  }, []);

  const handleDateSelect = useCallback(
    (selectInfo: any) => {
      const start = new Date(selectInfo.start);
      const end = new Date(selectInfo.end);

      setAvailabilityForm({ ...availabilityForm,
        dayOfWeek: start.getDay(),
        startTime: format(start, "HH:mm"),
        endTime: format(end, "HH:mm") });
      setShowAvailabilityDialog(true);
    },
    [availabilityForm],
  );

  const handleViewChange = useCallback((view: string) => {
    setCalendarView(view as any);
  }, []);

  const handleCreateAvailability = () => {
    if (!availabilityForm.startTime || !availabilityForm.endTime) {
      toast.error("Veuillez remplir les heures de début et de fin");
      return;
    }

    createAvailabilityMutation.mutate(availabilityForm);
  };

  const handleOptimizeRoute = (date: string) => {
    optimizeRouteMutation.mutate({ date  });
  };

  const weekdays = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Planning de livraison</h1>
          <p className="text-muted-foreground">
            Gérez vos disponibilités et optimisez vos routes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={calendarView} onValueChange={handleViewChange}>
            <TabsList>
              <TabsTrigger value="dayGridMonth">Mois</TabsTrigger>
              <TabsTrigger value="timeGridWeek">Semaine</TabsTrigger>
              <TabsTrigger value="timeGridDay">Jour</TabsTrigger>
              <TabsTrigger value="listWeek">Liste</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => setShowAvailabilityDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter disponibilité
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {scheduleStats?.totalHours || 0}h
                </div>
                <div className="text-sm text-muted-foreground">
                  Heures programmées
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Route className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {scheduleStats?.totalDeliveries || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Livraisons prévues
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {scheduleStats?.optimizationScore || 0}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Score optimisation
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {scheduleStats?.estimatedEarnings || 0}€
                </div>
                <div className="text-sm text-muted-foreground">
                  Gains estimés
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Optimization Alert */}
      {routeOptimizations && routeOptimizations.length > 0 && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {routeOptimizations.length} suggestions d'optimisation
                disponibles pour augmenter vos gains
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptimizationDialog(true)}
              >
                Voir suggestions
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[700px]">
            <FullCalendar
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                listPlugin]}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: ""}}
              initialView={calendarView}
              editable={false}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              events={calendarEvents}
              eventClick={handleEventClick}
              select={handleDateSelect}
              height="100%"
              locale="fr"
              firstDay={1}
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
              allDaySlot={false}
              eventDisplay="block"
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false}}
              slotLabelFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false}}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Détails de l'événement
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && formatDate(new Date(selectedEvent.start))}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Titre</Label>
                <p className="text-sm">{selectedEvent.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Début</Label>
                  <p className="text-sm">
                    {formatTime(new Date(selectedEvent.start))}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fin</Label>
                  <p className="text-sm">
                    {formatTime(new Date(selectedEvent.end))}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Type</Label>
                <Badge variant="outline" className="ml-2">
                  {selectedEvent.extendedProps.type}
                </Badge>
              </div>

              {selectedEvent.extendedProps.zone && (
                <div>
                  <Label className="text-sm font-medium">Zone</Label>
                  <p className="text-sm">{selectedEvent.extendedProps.zone}</p>
                </div>
              )}

              {selectedEvent.extendedProps.estimatedEarnings && (
                <div>
                  <Label className="text-sm font-medium">Gains estimés</Label>
                  <p className="text-sm font-bold text-green-600">
                    {selectedEvent.extendedProps.estimatedEarnings}€
                  </p>
                </div>
              )}

              {selectedEvent.extendedProps.optimizationScore && (
                <div>
                  <Label className="text-sm font-medium">
                    Score d'optimisation
                  </Label>
                  <p className="text-sm">
                    {selectedEvent.extendedProps.optimizationScore}%
                  </p>
                </div>
              )}

              {selectedEvent.extendedProps.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.extendedProps.notes}
                  </p>
                </div>
              )}

              {selectedEvent.extendedProps.type === "route" && (
                <Button
                  className="w-full"
                  onClick={() =>
                    handleOptimizeRoute(
                      format(new Date(selectedEvent.start), "yyyy-MM-dd"),
                    )
                  }
                  disabled={optimizeRouteMutation.isPending}
                >
                  <Route className="h-4 w-4 mr-2" />
                  Appliquer cette route
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Availability Creation Dialog */}
      <Dialog
        open={showAvailabilityDialog}
        onOpenChange={setShowAvailabilityDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une disponibilité</DialogTitle>
            <DialogDescription>
              Créez un créneau récurrent de disponibilité
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="dayOfWeek">Jour de la semaine</Label>
              <Select
                value={availabilityForm.dayOfWeek.toString()}
                onValueChange={(value) =>
                  setAvailabilityForm({ ...availabilityForm,
                    dayOfWeek: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Heure de début</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={availabilityForm.startTime}
                  onChange={(e) =>
                    setAvailabilityForm({ ...availabilityForm,
                      startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endTime">Heure de fin</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={availabilityForm.endTime}
                  onChange={(e) =>
                    setAvailabilityForm({ ...availabilityForm,
                      endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Zones de livraison</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {deliveryZones?.map((zone) => (
                  <div key={zone.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={zone.id}
                      checked={availabilityForm.zones.includes(zone.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAvailabilityForm({ ...availabilityForm,
                            zones: [...availabilityForm.zones, zone.id] });
                        } else {
                          setAvailabilityForm({ ...availabilityForm,
                            zones: availabilityForm.zones.filter(
                              (id) => id !== zone.id,
                            ) });
                        }
                      }}
                    />
                    <Label htmlFor={zone.id} className="text-sm">
                      {zone.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Commentaires sur cette disponibilité..."
                value={availabilityForm.notes || ""}
                onChange={(e) =>
                  setAvailabilityForm({ ...availabilityForm,
                    notes: e.target.value })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={availabilityForm.isActive}
                onCheckedChange={(checked) =>
                  setAvailabilityForm({ ...availabilityForm,
                    isActive: checked })
                }
              />
              <Label htmlFor="isActive">Activer cette disponibilité</Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAvailabilityDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateAvailability}
                disabled={createAvailabilityMutation.isPending}
                className="flex-1"
              >
                {createAvailabilityMutation.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Route Optimization Dialog */}
      <Dialog
        open={showOptimizationDialog}
        onOpenChange={setShowOptimizationDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Suggestions d'optimisation
            </DialogTitle>
            <DialogDescription>
              Routes optimisées pour maximiser vos gains
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {routeOptimizations?.map((optimization) => (
              <Card key={optimization.routeId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          Score: {optimization.score}%
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          {optimization.estimatedEarnings}€ estimés
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>Zones: {optimization.zones.join(", ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Créneaux: {optimization.timeSlots.join(", ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Route className="h-3 w-3" />
                          <span>
                            {optimization.estimatedDeliveries} livraisons
                            estimées
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        handleOptimizeRoute(format(selectedDate, "yyyy-MM-dd"))
                      }
                      disabled={optimizeRouteMutation.isPending}
                    >
                      Appliquer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
