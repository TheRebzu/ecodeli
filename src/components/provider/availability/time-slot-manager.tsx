"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  AlertTriangle,
  Settings,
  Users,
  MapPin
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  capacity: number;
  bookedCount: number;
  price: number;
  isRecurring: boolean;
  recurringDays: number[];
  description?: string;
  isActive: boolean;
  serviceIds: string[];
  date?: Date;
}

interface WeeklyTemplate {
  [key: number]: TimeSlot[]; // 0 = Dimanche, 1 = Lundi, etc.
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
  { value: 0, label: "Dimanche", short: "Dim" },
];

export default function TimeSlotManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplate>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Queries tRPC
  const { data: timeSlots, refetch: refetchTimeSlots } = api.provider.getTimeSlots.useQuery({
    startDate: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    endDate: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  });

  const { data: services } = api.provider.getServices.useQuery();
  
  const { data: bookings } = api.provider.getBookings.useQuery({
    startDate: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    endDate: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    status: "CONFIRMED",
  });

  // Mutations
  const createTimeSlot = api.provider.createTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Créneau créé avec succès");
      refetchTimeSlots();
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateTimeSlot = api.provider.updateTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Créneau modifié avec succès");
      refetchTimeSlots();
      setEditingSlot(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteTimeSlot = api.provider.deleteTimeSlot.useMutation({
    onSuccess: () => {
      toast.success("Créneau supprimé avec succès");
      refetchTimeSlots();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const bulkCreateFromTemplate = api.provider.bulkCreateTimeSlots.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.created} créneaux créés à partir du modèle`);
      refetchTimeSlots();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // États du formulaire
  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "10:00",
    capacity: 1,
    price: 0,
    isRecurring: false,
    recurringDays: [] as number[],
    description: "",
    serviceIds: [] as string[],
    date: new Date(),
  });

  const resetForm = () => {
    setFormData({
      startTime: "09:00",
      endTime: "10:00",
      capacity: 1,
      price: 0,
      isRecurring: false,
      recurringDays: [],
      description: "",
      serviceIds: [],
      date: new Date(),
    });
  };

  const handleCreateSlot = () => {
    if (!formData.startTime || !formData.endTime) {
      toast.error("Veuillez définir les heures de début et de fin");
      return;
    }

    if (formData.isRecurring && formData.recurringDays.length === 0) {
      toast.error("Veuillez sélectionner au moins un jour pour la récurrence");
      return;
    }

    const duration = calculateDuration(formData.startTime, formData.endTime);
    if (duration <= 0) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }

    createTimeSlot.mutate({
      ...formData,
      duration,
    });
  };

  const handleUpdateSlot = () => {
    if (!editingSlot) return;

    const duration = calculateDuration(formData.startTime, formData.endTime);
    if (duration <= 0) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }

    updateTimeSlot.mutate({
      id: editingSlot.id,
      ...formData,
      duration,
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce créneau ?")) {
      deleteTimeSlot.mutate({ id: slotId });
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes - startMinutes;
  };

  const getAvailabilityStatus = (slot: TimeSlot): string => {
    if (!slot.isActive) return "Inactif";
    if (slot.bookedCount >= slot.capacity) return "Complet";
    if (slot.bookedCount > 0) return "Partiellement réservé";
    return "Disponible";
  };

  const getStatusColor = (slot: TimeSlot): string => {
    if (!slot.isActive) return "bg-gray-500";
    if (slot.bookedCount >= slot.capacity) return "bg-red-500";
    if (slot.bookedCount > 0) return "bg-yellow-500";
    return "bg-green-500";
  };

  const startEditing = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      price: slot.price,
      isRecurring: slot.isRecurring,
      recurringDays: slot.recurringDays,
      description: slot.description || "",
      serviceIds: slot.serviceIds,
      date: slot.date || new Date(),
    });
    setShowCreateModal(true);
  };

  const applyWeeklyTemplate = () => {
    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    
    const slotsToCreate: any[] = [];
    
    weekDates.forEach((date, index) => {
      const dayOfWeek = date.getDay();
      const templateSlots = weeklyTemplate[dayOfWeek] || [];
      
      templateSlots.forEach((template) => {
        slotsToCreate.push({
          ...template,
          date,
          id: undefined, // Nouveau créneau
        });
      });
    });

    if (slotsToCreate.length > 0) {
      bulkCreateFromTemplate.mutate({ slots: slotsToCreate });
    } else {
      toast.info("Aucun modèle défini pour cette semaine");
    }
  };

  const renderDayView = () => {
    const daySlots = timeSlots?.filter(slot => 
      slot.date && isSameDay(new Date(slot.date), selectedDate)
    ) || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Créneaux du {format(selectedDate, "dd MMMM yyyy", { locale: fr })}
          </h3>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau créneau
          </Button>
        </div>

        {daySlots.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Aucun créneau défini pour cette date</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {daySlots.map((slot) => (
              <Card key={slot.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {slot.startTime} - {slot.endTime}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-white text-xs", getStatusColor(slot))}
                    >
                      {getAvailabilityStatus(slot)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {slot.bookedCount}/{slot.capacity}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {slot.duration}min
                    </div>
                  </div>
                  
                  {slot.price > 0 && (
                    <div className="text-sm font-medium">
                      Prix: {slot.price}€
                    </div>
                  )}
                  
                  {slot.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {slot.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => startEditing(slot)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteSlot(slot.id)}
                      disabled={slot.bookedCount > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Semaine du {format(startDate, "dd MMMM", { locale: fr })} au{" "}
            {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "dd MMMM yyyy", { locale: fr })}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={applyWeeklyTemplate}>
              <Settings className="w-4 h-4 mr-2" />
              Appliquer modèle
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau créneau
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const daySlots = timeSlots?.filter(slot => 
              slot.date && isSameDay(new Date(slot.date), date)
            ) || [];

            return (
              <Card key={index} className={cn(
                "min-h-[200px]",
                isToday(date) && "ring-2 ring-blue-500 ring-opacity-50"
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-center">
                    {DAYS_OF_WEEK.find(d => d.value === date.getDay())?.short}
                    <br />
                    {format(date, "dd/MM")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {daySlots.map((slot) => (
                    <div 
                      key={slot.id}
                      className={cn(
                        "p-2 rounded text-xs cursor-pointer hover:opacity-80",
                        getStatusColor(slot),
                        "text-white"
                      )}
                      onClick={() => startEditing(slot)}
                    >
                      <div className="font-medium">
                        {slot.startTime}-{slot.endTime}
                      </div>
                      <div className="opacity-90">
                        {slot.bookedCount}/{slot.capacity}
                      </div>
                    </div>
                  ))}
                  {daySlots.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4">
                      Aucun créneau
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des créneaux horaires</h1>
        
        <div className="flex items-center gap-4">
          <Select value={viewMode} onValueChange={(value: "day" | "week" | "month") => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, "dd MMMM yyyy", { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {viewMode === "day" && renderDayView()}
      {viewMode === "week" && renderWeekView()}

      {/* Modal de création/édition */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingSlot ? "Modifier le créneau" : "Nouveau créneau"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity">Nombre de places</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (optionnelle)</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez ce créneau..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                />
                <Label htmlFor="recurring">Créneau récurrent</Label>
              </div>

              {formData.isRecurring && (
                <div>
                  <Label>Jours de la semaine</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={formData.recurringDays.includes(day.value) ? "default" : "outline"}
                        onClick={() => {
                          const days = formData.recurringDays.includes(day.value)
                            ? formData.recurringDays.filter(d => d !== day.value)
                            : [...formData.recurringDays, day.value];
                          setFormData({ ...formData, recurringDays: days });
                        }}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingSlot(null);
                    resetForm();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button
                  onClick={editingSlot ? handleUpdateSlot : handleCreateSlot}
                  disabled={createTimeSlot.isPending || updateTimeSlot.isPending}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {editingSlot ? "Modifier" : "Créer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
