"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Clock, MapPin, Plus, Edit, Trash2, Users, CheckCircle, X } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

interface ProviderAvailabilityCalendarProps {
  providerId: string;
}

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypes: string[];
  maxBookings: number;
  currentBookings: number;
  status: "available" | "busy" | "blocked" | "holiday";
  notes?: string;
  recurringPattern?: {
    type: "weekly" | "monthly";
    interval: number;
    endDate?: string;
  };
}

interface BookingSlot {
  id: string;
  availabilityId: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  notes?: string;
  price: number;
}

interface ServiceType {
  id: string;
  name: string;
  category: string;
  duration: number; // en minutes
  price: number;
  description?: string;
  requirements?: string[];
}

interface WeeklyTemplate {
  id: string;
  name: string;
  schedule: {
    [key: string]: { // day of week (0-6)
      enabled: boolean;
      slots: {
        startTime: string;
        endTime: string;
        serviceTypes: string[];
        maxBookings: number;
      }[];
    };
  };
}

export default function ProviderAvailabilityCalendar({ providerId }: ProviderAvailabilityCalendarProps) {
  const t = useTranslations("provider.availability");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [weeklyTemplates, setWeeklyTemplates] = useState<WeeklyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSlotDialog, setShowAddSlotDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);

  const [newSlot, setNewSlot] = useState<Partial<AvailabilitySlot>>({
    startTime: "09:00",
    endTime: "10:00",
    serviceTypes: [],
    maxBookings: 1,
    status: "available",
    notes: ""
  });

  const [recurringOptions, setRecurringOptions] = useState({
    enabled: false,
    type: "weekly" as "weekly" | "monthly",
    interval: 1,
    endDate: ""
  });

  useEffect(() => {
    fetchAvailabilityData();
  }, [providerId, selectedDate]);

  const fetchAvailabilityData = async () => {
    if (!selectedDate) return;

    try {
      const startWeek = startOfWeek(selectedDate);
      const endWeek = endOfWeek(selectedDate);
      
      const [availabilityRes, bookingsRes, servicesRes, templatesRes] = await Promise.all([
        fetch(`/api/provider/availability?providerId=${providerId}&startDate=${format(startWeek, "yyyy-MM-dd")}&endDate=${format(endWeek, "yyyy-MM-dd")}`),
        fetch(`/api/provider/bookings?providerId=${providerId}&startDate=${format(startWeek, "yyyy-MM-dd")}&endDate=${format(endWeek, "yyyy-MM-dd")}`),
        fetch(`/api/provider/services?providerId=${providerId}`),
        fetch(`/api/provider/availability/templates?providerId=${providerId}`)
      ]);

      if (availabilityRes.ok) {
        const data = await availabilityRes.json();
        setAvailabilitySlots(data.slots || []);
      }

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServiceTypes(data.services || []);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setWeeklyTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching availability data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!selectedDate || !newSlot.startTime || !newSlot.endTime) return;

    try {
      const slotData = {
        ...newSlot,
        providerId,
        date: format(selectedDate, "yyyy-MM-dd"),
        recurringPattern: recurringOptions.enabled ? {
          type: recurringOptions.type,
          interval: recurringOptions.interval,
          endDate: recurringOptions.endDate || undefined
        } : undefined
      };

      const response = await fetch("/api/provider/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slotData)
      });

      if (response.ok) {
        await fetchAvailabilityData();
        setShowAddSlotDialog(false);
        setNewSlot({
          startTime: "09:00",
          endTime: "10:00",
          serviceTypes: [],
          maxBookings: 1,
          status: "available",
          notes: ""
        });
        setRecurringOptions({
          enabled: false,
          type: "weekly",
          interval: 1,
          endDate: ""
        });
      }
    } catch (error) {
      console.error("Error adding availability slot:", error);
    }
  };

  const handleUpdateSlot = async () => {
    if (!editingSlot) return;

    try {
      const response = await fetch(`/api/provider/availability/${editingSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSlot)
      });

      if (response.ok) {
        await fetchAvailabilityData();
        setEditingSlot(null);
      }
    } catch (error) {
      console.error("Error updating availability slot:", error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/provider/availability/${slotId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await fetchAvailabilityData();
      }
    } catch (error) {
      console.error("Error deleting availability slot:", error);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const response = await fetch("/api/provider/availability/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          templateId,
          startDate: format(selectedDate || new Date(), "yyyy-MM-dd"),
          weeks: 4 // Appliquer sur 4 semaines
        })
      });

      if (response.ok) {
        await fetchAvailabilityData();
      }
    } catch (error) {
      console.error("Error applying template:", error);
    }
  };

  const handleBookingAction = async (bookingId: string, action: "confirm" | "cancel") => {
    try {
      const response = await fetch(`/api/provider/bookings/${bookingId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId })
      });

      if (response.ok) {
        await fetchAvailabilityData();
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
    }
  };

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availabilitySlots.filter(slot => slot.date === dateStr);
  };

  const getBookingsForSlot = (slotId: string) => {
    return bookings.filter(booking => booking.availabilityId === slotId);
  };

  const getStatusBadge = (status: string, currentBookings: number, maxBookings: number) => {
    if (currentBookings >= maxBookings) {
      return <Badge className="bg-red-100 text-red-800">{t("status.full")}</Badge>;
    }

    const statusConfig = {
      available: { color: "bg-green-100 text-green-800", label: t("status.available") },
      busy: { color: "bg-orange-100 text-orange-800", label: t("status.busy") },
      blocked: { color: "bg-red-100 text-red-800", label: t("status.blocked") },
      holiday: { color: "bg-blue-100 text-blue-800", label: t("status.holiday") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getBookingStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: "bg-green-100 text-green-800", label: t("booking_status.confirmed") },
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("booking_status.pending") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("booking_status.cancelled") },
      completed: { color: "bg-blue-100 text-blue-800", label: t("booking_status.completed") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const generateWeeklyView = () => {
    const startWeek = startOfWeek(selectedDate || new Date());
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startWeek, i));
    
    return weekDays.map(day => ({
      date: day,
      slots: getSlotsForDate(day)
    }));
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  {t("actions.apply_template")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("template_dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("template_dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {weeklyTemplates.map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-gray-600">
                            {Object.entries(template.schedule)
                              .filter(([_, day]) => day.enabled)
                              .map(([dayNum, _]) => {
                                const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                                return days[parseInt(dayNum)];
                              })
                              .join(', ')}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => handleApplyTemplate(template.id)}>
                          {t("template_dialog.apply")}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowTemplateDialog(false)}>
                    {t("template_dialog.close")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddSlotDialog} onOpenChange={setShowAddSlotDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("actions.add_slot")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {selectedDate && t("add_dialog.description", { date: format(selectedDate, "PPP") })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">{t("add_dialog.start_time")}</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newSlot.startTime}
                        onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">{t("add_dialog.end_time")}</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newSlot.endTime}
                        onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="serviceTypes">{t("add_dialog.service_types")}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={t("add_dialog.select_services")} />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {service.duration}min - €{service.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxBookings">{t("add_dialog.max_bookings")}</Label>
                      <Input
                        id="maxBookings"
                        type="number"
                        min="1"
                        max="10"
                        value={newSlot.maxBookings}
                        onChange={(e) => setNewSlot({...newSlot, maxBookings: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">{t("add_dialog.status")}</Label>
                      <Select value={newSlot.status} onValueChange={(value) => setNewSlot({...newSlot, status: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">{t("status.available")}</SelectItem>
                          <SelectItem value="blocked">{t("status.blocked")}</SelectItem>
                          <SelectItem value="holiday">{t("status.holiday")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={recurringOptions.enabled}
                        onCheckedChange={(checked) => setRecurringOptions({...recurringOptions, enabled: checked})}
                      />
                      <Label>{t("add_dialog.recurring")}</Label>
                    </div>

                    {recurringOptions.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t("add_dialog.pattern")}</Label>
                          <Select value={recurringOptions.type} onValueChange={(value) => setRecurringOptions({...recurringOptions, type: value as any})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">{t("patterns.weekly")}</SelectItem>
                              <SelectItem value="monthly">{t("patterns.monthly")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t("add_dialog.end_date")}</Label>
                          <Input
                            type="date"
                            value={recurringOptions.endDate}
                            onChange={(e) => setRecurringOptions({...recurringOptions, endDate: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddSlot}>
                    {t("add_dialog.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">{t("tabs.calendar")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("tabs.bookings")}</TabsTrigger>
          <TabsTrigger value="weekly">{t("tabs.weekly_view")}</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{t("calendar.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : t("calendar.select_date")}
                  </CardTitle>
                  <CardDescription>
                    {selectedDate && getSlotsForDate(selectedDate).length > 0 
                      ? t("calendar.slots_count", { count: getSlotsForDate(selectedDate).length })
                      : t("calendar.no_slots")
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDate && getSlotsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-4">
                      {getSlotsForDate(selectedDate).map((slot) => {
                        const slotBookings = getBookingsForSlot(slot.id);
                        return (
                          <Card key={slot.id} className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5" />
                                <div>
                                  <h4 className="font-semibold">
                                    {slot.startTime} - {slot.endTime}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {slot.serviceTypes.length > 0 ? slot.serviceTypes.join(", ") : t("all_services")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(slot.status, slot.currentBookings, slot.maxBookings)}
                                <Badge variant="outline">
                                  {slot.currentBookings}/{slot.maxBookings}
                                </Badge>
                              </div>
                            </div>

                            {slotBookings.length > 0 && (
                              <div className="mb-3">
                                <h5 className="font-medium mb-2">{t("bookings")}:</h5>
                                <div className="space-y-2">
                                  {slotBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span className="text-sm">{booking.clientName}</span>
                                        <span className="text-sm text-gray-600">{booking.serviceType}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getBookingStatusBadge(booking.status)}
                                        {booking.status === "pending" && (
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => handleBookingAction(booking.id, "confirm")}>
                                              <CheckCircle className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleBookingAction(booking.id, "cancel")}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-600">
                                {slot.notes && <span>{t("notes")}: {slot.notes}</span>}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingSlot(slot)}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  {t("actions.edit")}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteSlot(slot.id)}>
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  {t("actions.delete")}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
                      <p className="text-gray-600 mb-4">{t("empty.description")}</p>
                      <Button onClick={() => setShowAddSlotDialog(true)}>
                        {t("empty.add_first_slot")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {bookings.filter(b => b.status === "pending").map((booking) => {
            const slot = availabilitySlots.find(s => s.id === booking.availabilityId);
            return (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{booking.clientName}</h4>
                      <p className="text-sm text-gray-600">
                        {booking.serviceType} - {slot?.date} {booking.startTime}-{booking.endTime}
                      </p>
                      <p className="text-sm font-medium">€{booking.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getBookingStatusBadge(booking.status)}
                      {booking.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleBookingAction(booking.id, "confirm")}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t("actions.confirm")}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleBookingAction(booking.id, "cancel")}>
                            <X className="h-4 w-4 mr-1" />
                            {t("actions.cancel")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {bookings.filter(b => b.status === "pending").length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_bookings.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_bookings.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("weekly_view.title")}</CardTitle>
              <CardDescription>{t("weekly_view.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {generateWeeklyView().map(({ date, slots }) => (
                  <div key={date.toISOString()} className="border rounded-lg p-3">
                    <div className="text-center mb-3">
                      <div className="text-sm font-medium">{format(date, "EEE")}</div>
                      <div className="text-lg font-bold">{format(date, "d")}</div>
                    </div>
                    <div className="space-y-2">
                      {slots.slice(0, 4).map((slot) => (
                        <div key={slot.id} className="text-xs p-2 rounded bg-blue-100 text-blue-800">
                          <div className="font-medium">{slot.startTime}</div>
                          <div>{slot.currentBookings}/{slot.maxBookings}</div>
                        </div>
                      ))}
                      {slots.length > 4 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{slots.length - 4} {t("weekly_view.more")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingSlot && (
        <Dialog open={!!editingSlot} onOpenChange={() => setEditingSlot(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("edit_dialog.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartTime">{t("edit_dialog.start_time")}</Label>
                  <Input
                    id="editStartTime"
                    type="time"
                    value={editingSlot.startTime}
                    onChange={(e) => setEditingSlot({...editingSlot, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editEndTime">{t("edit_dialog.end_time")}</Label>
                  <Input
                    id="editEndTime"
                    type="time"
                    value={editingSlot.endTime}
                    onChange={(e) => setEditingSlot({...editingSlot, endTime: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editMaxBookings">{t("edit_dialog.max_bookings")}</Label>
                <Input
                  id="editMaxBookings"
                  type="number"
                  value={editingSlot.maxBookings}
                  onChange={(e) => setEditingSlot({...editingSlot, maxBookings: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label htmlFor="editStatus">{t("edit_dialog.status")}</Label>
                <Select value={editingSlot.status} onValueChange={(value) => setEditingSlot({...editingSlot, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{t("status.available")}</SelectItem>
                    <SelectItem value="busy">{t("status.busy")}</SelectItem>
                    <SelectItem value="blocked">{t("status.blocked")}</SelectItem>
                    <SelectItem value="holiday">{t("status.holiday")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateSlot}>
                {t("edit_dialog.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}