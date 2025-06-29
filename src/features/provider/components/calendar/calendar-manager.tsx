"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalendarManagerProps {
  providerId: string;
}

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  address: string;
  notes?: string;
  price: number;
  createdAt: string;
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string;
  maxAppointments: number;
  currentAppointments: number;
}

interface DaySchedule {
  date: string;
  appointments: Appointment[];
  availabilities: Availability[];
  isToday: boolean;
  isAvailable: boolean;
}

export default function CalendarManager({ providerId }: CalendarManagerProps) {
  const t = useTranslations("provider.calendar");
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    maxAppointments: 5,
    isRecurring: true,
    specificDate: "",
  });

  const fetchSchedule = async (weekStart: Date) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/provider/calendar?week=${weekStart.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        setSchedule(data.schedule || []);
        setAvailabilities(data.availabilities || []);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const createAvailability = async () => {
    try {
      const response = await fetch("/api/provider/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          ...newAvailability,
        }),
      });

      if (response.ok) {
        toast.success(t("success.availability_created"));
        fetchSchedule(getWeekStart(currentWeek));
        setShowAvailabilityDialog(false);
        setNewAvailability({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          maxAppointments: 5,
          isRecurring: true,
          specificDate: "",
        });
      } else {
        toast.error(t("error.create_failed"));
      }
    } catch (error) {
      console.error("Error creating availability:", error);
      toast.error(t("error.create_failed"));
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const response = await fetch(`/api/provider/calendar/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(t("success.status_updated"));
        fetchSchedule(getWeekStart(currentWeek));
      } else {
        toast.error(t("error.update_failed"));
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error(t("error.update_failed"));
    }
  };

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getWeekDays = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
    fetchSchedule(getWeekStart(newWeek));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      confirmed: { color: "bg-blue-100 text-blue-800", label: t("status.confirmed") },
      in_progress: { color: "bg-purple-100 text-purple-800", label: t("status.in_progress") },
      completed: { color: "bg-green-100 text-green-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
      no_show: { color: "bg-gray-100 text-gray-800", label: t("status.no_show") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getDayName = (dayOfWeek: number) => {
    const days = [t("days.sunday"), t("days.monday"), t("days.tuesday"), t("days.wednesday"), t("days.thursday"), t("days.friday"), t("days.saturday")];
    return days[dayOfWeek];
  };

  useEffect(() => {
    fetchSchedule(getWeekStart(currentWeek));
  }, [providerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const weekStart = getWeekStart(currentWeek);
  const weekDays = getWeekDays(weekStart);

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>{t("weekly_schedule")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-4">
                {weekStart.toLocaleDateString()} - {getWeekDays(weekStart)[6].toLocaleDateString()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("add_availability")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("availability_dialog.title")}</DialogTitle>
                    <DialogDescription>
                      {t("availability_dialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dayOfWeek">{t("availability_dialog.day")}</Label>
                      <Select value={newAvailability.dayOfWeek.toString()} onValueChange={(value) => setNewAvailability({...newAvailability, dayOfWeek: parseInt(value)})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {getDayName(day)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">{t("availability_dialog.start_time")}</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newAvailability.startTime}
                          onChange={(e) => setNewAvailability({...newAvailability, startTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">{t("availability_dialog.end_time")}</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newAvailability.endTime}
                          onChange={(e) => setNewAvailability({...newAvailability, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="maxAppointments">{t("availability_dialog.max_appointments")}</Label>
                      <Input
                        id="maxAppointments"
                        type="number"
                        value={newAvailability.maxAppointments}
                        onChange={(e) => setNewAvailability({...newAvailability, maxAppointments: parseInt(e.target.value)})}
                      />
                    </div>
                    {!newAvailability.isRecurring && (
                      <div>
                        <Label htmlFor="specificDate">{t("availability_dialog.specific_date")}</Label>
                        <Input
                          id="specificDate"
                          type="date"
                          value={newAvailability.specificDate}
                          onChange={(e) => setNewAvailability({...newAvailability, specificDate: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={createAvailability}>
                      {t("availability_dialog.create")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Weekly Calendar */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const daySchedule = schedule.find(s => 
            new Date(s.date).toDateString() === day.toDateString()
          );
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <Card key={index} className={`${isToday ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-center">
                  <div className="font-semibold">
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {day.getDate()}
                  </div>
                  {daySchedule?.isAvailable && (
                    <div className="text-xs text-green-600 mt-1">
                      {t("available")}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {daySchedule?.appointments.length ? (
                    daySchedule.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-2 bg-gray-50 rounded-lg border-l-4 border-l-blue-500 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-medium truncate">{appointment.serviceType}</p>
                          <p className="text-xs text-gray-500">
                            {appointment.startTime} - {appointment.endTime}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            <span className="truncate">{appointment.clientName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            {getStatusBadge(appointment.status)}
                            <span className="text-xs font-semibold text-green-600">
                              {appointment.price}€
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : daySchedule?.isAvailable ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-green-600">{t("no_appointments")}</p>
                      <p className="text-xs text-gray-400">{t("available_for_booking")}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400">{t("not_available")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Availabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>{t("current_availabilities")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availabilities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("no_availabilities_title")}
              </h3>
              <p className="text-gray-600 mb-4">
                {t("no_availabilities_description")}
              </p>
              <Button onClick={() => setShowAvailabilityDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("create_first_availability")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availabilities.map((availability) => (
                <Card key={availability.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{getDayName(availability.dayOfWeek)}</h4>
                        <p className="text-sm text-gray-600">
                          {availability.startTime} - {availability.endTime}
                        </p>
                      </div>
                      <Badge variant={availability.isRecurring ? "default" : "outline"}>
                        {availability.isRecurring ? t("recurring") : t("one_time")}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("max_appointments")}:</span>
                        <span>{availability.maxAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("current_bookings")}:</span>
                        <span className={availability.currentAppointments >= availability.maxAppointments ? 'text-red-600' : 'text-green-600'}>
                          {availability.currentAppointments}
                        </span>
                      </div>
                      {availability.specificDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("date")}:</span>
                          <span>{new Date(availability.specificDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between mt-3">
                      <Button size="sm" variant="outline" className="flex-1 mr-2">
                        <Edit className="w-3 h-3 mr-1" />
                        {t("edit")}
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.total_appointments")}</p>
                <p className="text-xl font-bold">
                  {schedule.reduce((total, day) => total + day.appointments.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.confirmed")}</p>
                <p className="text-xl font-bold">
                  {schedule.reduce((total, day) => 
                    total + day.appointments.filter(a => a.status === 'confirmed').length, 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.pending")}</p>
                <p className="text-xl font-bold">
                  {schedule.reduce((total, day) => 
                    total + day.appointments.filter(a => a.status === 'pending').length, 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.available_slots")}</p>
                <p className="text-xl font-bold">
                  {availabilities.reduce((total, av) => 
                    total + (av.maxAppointments - av.currentAppointments), 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Dialog */}
      {selectedAppointment && (
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("appointment_details.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("appointment_details.service")}</Label>
                  <p className="font-medium">{selectedAppointment.serviceType}</p>
                </div>
                <div>
                  <Label>{t("appointment_details.status")}</Label>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("appointment_details.client")}</Label>
                  <p className="font-medium">{selectedAppointment.clientName}</p>
                  <p className="text-sm text-gray-600">{selectedAppointment.clientPhone}</p>
                </div>
                <div>
                  <Label>{t("appointment_details.price")}</Label>
                  <p className="font-medium text-green-600">{selectedAppointment.price}€</p>
                </div>
              </div>
              <div>
                <Label>{t("appointment_details.time")}</Label>
                <p className="font-medium">
                  {selectedAppointment.startTime} - {selectedAppointment.endTime} ({selectedAppointment.duration}min)
                </p>
              </div>
              <div>
                <Label>{t("appointment_details.address")}</Label>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p>{selectedAppointment.address}</p>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <Label>{t("appointment_details.notes")}</Label>
                  <p className="text-gray-600">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter className="space-x-2">
              {selectedAppointment.status === 'pending' && (
                <Button onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}>
                  {t("appointment_details.confirm")}
                </Button>
              )}
              {selectedAppointment.status === 'confirmed' && (
                <Button onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in_progress')}>
                  {t("appointment_details.start")}
                </Button>
              )}
              {selectedAppointment.status === 'in_progress' && (
                <Button onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}>
                  {t("appointment_details.complete")}
                </Button>
              )}
              <Button variant="outline" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}>
                {t("appointment_details.cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}