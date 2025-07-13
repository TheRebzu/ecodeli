"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Availability {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringDays?: number[];
  serviceIds?: string[];
  maxBookings: number;
  currentBookings: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function ProviderCalendar() {
  const t = useTranslations("provider.calendar");
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] =
    useState<Availability | null>(null);

  const [formData, setFormData] = useState({
    date: new Date(),
    startTime: "09:00",
    endTime: "18:00",
    isRecurring: false,
    recurringDays: [] as number[],
    serviceIds: [] as string[],
    maxBookings: 1,
  });

  const timeSlots: TimeSlot[] = [
    { time: "08:00", available: true },
    { time: "09:00", available: true },
    { time: "10:00", available: true },
    { time: "11:00", available: true },
    { time: "14:00", available: true },
    { time: "15:00", available: true },
    { time: "16:00", available: true },
    { time: "17:00", available: true },
    { time: "18:00", available: true },
  ];

  const daysOfWeek = [
    { value: 1, label: "Lundi" },
    { value: 2, label: "Mardi" },
    { value: 3, label: "Mercredi" },
    { value: 4, label: "Jeudi" },
    { value: 5, label: "Vendredi" },
    { value: 6, label: "Samedi" },
    { value: 0, label: "Dimanche" },
  ];

  useEffect(() => {
    if (!user?.id) return;
    fetchAvailabilities();
  }, [user?.id, selectedDate]);

  const fetchAvailabilities = async () => {
    try {
      setLoading(true);
      // Simuler la récupération des disponibilités
      // En production, faire un appel API réel
      const mockAvailabilities: Availability[] = [
        {
          id: "1",
          date: new Date(),
          startTime: "09:00",
          endTime: "12:00",
          isRecurring: false,
          maxBookings: 2,
          currentBookings: 1,
        },
        {
          id: "2",
          date: addDays(new Date(), 1),
          startTime: "14:00",
          endTime: "18:00",
          isRecurring: true,
          recurringDays: [1, 3, 5],
          maxBookings: 3,
          currentBookings: 0,
        },
      ];
      setAvailabilities(mockAvailabilities);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
      toast.error("Erreur lors du chargement des disponibilités");
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    try {
      // En production, faire un appel API pour sauvegarder
      toast.success(
        editingAvailability
          ? "Disponibilité mise à jour"
          : "Disponibilité créée",
      );
      setShowDialog(false);
      resetForm();
      fetchAvailabilities();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      // En production, faire un appel API pour supprimer
      toast.success("Disponibilité supprimée");
      fetchAvailabilities();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      startTime: "09:00",
      endTime: "18:00",
      isRecurring: false,
      recurringDays: [],
      serviceIds: [],
      maxBookings: 1,
    });
    setEditingAvailability(null);
  };

  const getAvailabilitiesForDate = (date: Date) => {
    return availabilities.filter((availability) => {
      if (availability.isRecurring && availability.recurringDays) {
        return availability.recurringDays.includes(date.getDay());
      }
      return (
        format(availability.date) ||
        "yyyy-MM-dd" === format(date) ||
        "yyyy-MM-dd"
      );
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une disponibilité
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAvailability
                  ? "Modifier la disponibilité"
                  : "Nouvelle disponibilité"}
              </DialogTitle>
              <DialogDescription>
                Définissez vos créneaux de disponibilité pour vos prestations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) =>
                      setFormData({ ...formData, startTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.time} value={slot.time}>
                          {slot.time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) =>
                      setFormData({ ...formData, endTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.time} value={slot.time}>
                          {slot.time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRecurring: checked })
                  }
                />
                <Label>Disponibilité récurrente</Label>
              </div>

              {formData.isRecurring && (
                <div>
                  <Label>Jours de la semaine</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {daysOfWeek.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.recurringDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                recurringDays: [
                                  ...formData.recurringDays,
                                  day.value,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                recurringDays: formData.recurringDays.filter(
                                  (d) => d !== day.value,
                                ),
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="maxBookings">Nombre max de réservations</Label>
                <Select
                  value={formData.maxBookings.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maxBookings: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? "réservation" : "réservations"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button onClick={saveAvailability}>
                {editingAvailability ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendrier */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Calendrier des disponibilités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={fr}
              className="rounded-md border"
              modifiers={{
                available: (date) => getAvailabilitiesForDate(date).length > 0,
              }}
              modifiersStyles={{
                available: { backgroundColor: "#10b981", color: "white" },
              }}
            />
          </CardContent>
        </Card>

        {/* Détails de la journée sélectionnée */}
        <Card>
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </CardTitle>
            <CardDescription>Disponibilités pour cette journée</CardDescription>
          </CardHeader>
          <CardContent>
            {getAvailabilitiesForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucune disponibilité pour cette date
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setFormData({ ...formData, date: selectedDate });
                    setShowDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {getAvailabilitiesForDate(selectedDate).map((availability) => (
                  <div key={availability.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {availability.startTime} - {availability.endTime}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {availability.currentBookings}/
                          {availability.maxBookings} réservations
                        </p>
                        {availability.isRecurring && (
                          <Badge variant="secondary" className="mt-1">
                            Récurrent
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingAvailability(availability);
                            setFormData({
                              date: availability.date,
                              startTime: availability.startTime,
                              endTime: availability.endTime,
                              isRecurring: availability.isRecurring,
                              recurringDays: availability.recurringDays || [],
                              serviceIds: availability.serviceIds || [],
                              maxBookings: availability.maxBookings,
                            });
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAvailability(availability.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informations */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Les disponibilités récurrentes s'appliquent automatiquement chaque
          semaine. Les clients pourront réserver des créneaux uniquement sur vos
          disponibilités définies.
        </AlertDescription>
      </Alert>
    </div>
  );
}
