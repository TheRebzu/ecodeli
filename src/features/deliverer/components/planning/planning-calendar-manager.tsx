"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, MapPin, Plus, Edit, Trash2, Route, Car } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { useTranslations } from "next-intl";

interface PlanningCalendarManagerProps {
  delivererId: string;
}

interface ScheduleEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "available" | "route" | "delivery" | "break";
  title: string;
  description?: string;
  location?: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  estimatedEarnings?: number;
  routeId?: string;
  deliveryId?: string;
}

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  zones: string[];
  vehicleType: string;
  maxDeliveries: number;
}

export default function PlanningCalendarManager({ delivererId }: PlanningCalendarManagerProps) {
  const t = useTranslations("deliverer.planning");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  
  const [newEntry, setNewEntry] = useState<Partial<ScheduleEntry>>({
    type: "available",
    title: "",
    description: "",
    startTime: "09:00",
    endTime: "17:00",
    location: ""
  });

  const [availabilityForm, setAvailabilityForm] = useState<AvailabilitySlot>({
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    zones: [],
    vehicleType: "car",
    maxDeliveries: 5
  });

  useEffect(() => {
    fetchScheduleData();
  }, [delivererId, selectedDate]);

  const fetchScheduleData = async () => {
    if (!selectedDate) return;

    try {
      const startWeek = startOfWeek(selectedDate);
      const endWeek = endOfWeek(selectedDate);
      
      const response = await fetch(
        `/api/deliverer/planning?delivererId=${delivererId}&startDate=${format(startWeek, "yyyy-MM-dd")}&endDate=${format(endWeek, "yyyy-MM-dd")}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setScheduleEntries(data.entries || []);
        setWeeklySchedule(data.entries || []);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedDate || !newEntry.title || !newEntry.startTime || !newEntry.endTime) return;

    try {
      const entryData = {
        ...newEntry,
        delivererId,
        date: format(selectedDate, "yyyy-MM-dd"),
        status: "scheduled"
      };

      const response = await fetch("/api/deliverer/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData)
      });

      if (response.ok) {
        await fetchScheduleData();
        setShowAddDialog(false);
        setNewEntry({
          type: "available",
          title: "",
          description: "",
          startTime: "09:00",
          endTime: "17:00",
          location: ""
        });
      }
    } catch (error) {
      console.error("Error adding schedule entry:", error);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const response = await fetch(`/api/deliverer/planning/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEntry)
      });

      if (response.ok) {
        await fetchScheduleData();
        setEditingEntry(null);
      }
    } catch (error) {
      console.error("Error updating schedule entry:", error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/deliverer/planning/${entryId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await fetchScheduleData();
      }
    } catch (error) {
      console.error("Error deleting schedule entry:", error);
    }
  };

  const handleSetWeeklyAvailability = async () => {
    try {
      const response = await fetch("/api/deliverer/planning/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivererId,
          ...availabilityForm
        })
      });

      if (response.ok) {
        await fetchScheduleData();
      }
    } catch (error) {
      console.error("Error setting availability:", error);
    }
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return scheduleEntries.filter(entry => entry.date === dateStr);
  };

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case "route":
        return <Route className="h-4 w-4" />;
      case "delivery":
        return <Car className="h-4 w-4" />;
      case "break":
        return <Clock className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getEntryTypeBadge = (type: string) => {
    const typeConfig = {
      available: { color: "bg-green-100 text-green-800", label: t("types.available") },
      route: { color: "bg-blue-100 text-blue-800", label: t("types.route") },
      delivery: { color: "bg-orange-100 text-orange-800", label: t("types.delivery") },
      break: { color: "bg-gray-100 text-gray-800", label: t("types.break") }
    };

    const config = typeConfig[type as keyof typeof typeConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: "bg-blue-100 text-blue-800", label: t("status.scheduled") },
      active: { color: "bg-green-100 text-green-800", label: t("status.active") },
      completed: { color: "bg-gray-100 text-gray-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const generateWeeklyTimeSlots = () => {
    const startWeek = startOfWeek(selectedDate || new Date());
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startWeek, i));
    
    return weekDays.map(day => ({
      date: day,
      entries: getEntriesForDate(day)
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
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("actions.add_entry")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("add_dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">{t("add_dialog.type")}</Label>
                    <Select value={newEntry.type} onValueChange={(value) => setNewEntry({...newEntry, type: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">{t("types.available")}</SelectItem>
                        <SelectItem value="break">{t("types.break")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">{t("add_dialog.title_field")}</Label>
                    <Input
                      id="title"
                      value={newEntry.title}
                      onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">{t("add_dialog.start_time")}</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newEntry.startTime}
                        onChange={(e) => setNewEntry({...newEntry, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">{t("add_dialog.end_time")}</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newEntry.endTime}
                        onChange={(e) => setNewEntry({...newEntry, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">{t("add_dialog.location")}</Label>
                    <Input
                      id="location"
                      value={newEntry.location}
                      onChange={(e) => setNewEntry({...newEntry, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t("add_dialog.description")}</Label>
                    <Textarea
                      id="description"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddEntry}>
                    {t("add_dialog.confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  {t("actions.set_availability")}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="availStartTime">{t("availability_dialog.start_time")}</Label>
                      <Input
                        id="availStartTime"
                        type="time"
                        value={availabilityForm.startTime}
                        onChange={(e) => setAvailabilityForm({...availabilityForm, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="availEndTime">{t("availability_dialog.end_time")}</Label>
                      <Input
                        id="availEndTime"
                        type="time"
                        value={availabilityForm.endTime}
                        onChange={(e) => setAvailabilityForm({...availabilityForm, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vehicleType">{t("availability_dialog.vehicle_type")}</Label>
                    <Select value={availabilityForm.vehicleType} onValueChange={(value) => setAvailabilityForm({...availabilityForm, vehicleType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bike">{t("vehicle_types.bike")}</SelectItem>
                        <SelectItem value="car">{t("vehicle_types.car")}</SelectItem>
                        <SelectItem value="van">{t("vehicle_types.van")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="maxDeliveries">{t("availability_dialog.max_deliveries")}</Label>
                    <Input
                      id="maxDeliveries"
                      type="number"
                      min="1"
                      max="20"
                      value={availabilityForm.maxDeliveries}
                      onChange={(e) => setAvailabilityForm({...availabilityForm, maxDeliveries: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSetWeeklyAvailability}>
                    {t("availability_dialog.confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

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

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : t("calendar.select_date")}
              </CardTitle>
              <CardDescription>
                {selectedDate && getEntriesForDate(selectedDate).length > 0 
                  ? t("calendar.entries_count", { count: getEntriesForDate(selectedDate).length })
                  : t("calendar.no_entries")
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDate && getEntriesForDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getEntriesForDate(selectedDate).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getEntryTypeIcon(entry.type)}
                        <div>
                          <h4 className="font-semibold">{entry.title}</h4>
                          <p className="text-sm text-gray-600">
                            {entry.startTime} - {entry.endTime}
                            {entry.location && ` • ${entry.location}`}
                          </p>
                          {entry.description && (
                            <p className="text-sm text-gray-500">{entry.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getEntryTypeBadge(entry.type)}
                        {getStatusBadge(entry.status)}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
                  <p className="text-gray-600">{t("empty.description")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("weekly_view.title")}</CardTitle>
              <CardDescription>{t("weekly_view.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {generateWeeklyTimeSlots().map(({ date, entries }) => (
                  <div key={date.toISOString()} className="border rounded-lg p-2">
                    <div className="text-center mb-2">
                      <div className="text-xs font-medium">{format(date, "EEE")}</div>
                      <div className="text-sm">{format(date, "d")}</div>
                    </div>
                    <div className="space-y-1">
                      {entries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="text-xs p-1 rounded bg-blue-100 text-blue-800">
                          {entry.startTime} {entry.title}
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{entries.length - 3} {t("weekly_view.more")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("edit_dialog.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTitle">{t("edit_dialog.title_field")}</Label>
                <Input
                  id="editTitle"
                  value={editingEntry.title}
                  onChange={(e) => setEditingEntry({...editingEntry, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartTime">{t("edit_dialog.start_time")}</Label>
                  <Input
                    id="editStartTime"
                    type="time"
                    value={editingEntry.startTime}
                    onChange={(e) => setEditingEntry({...editingEntry, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="editEndTime">{t("edit_dialog.end_time")}</Label>
                  <Input
                    id="editEndTime"
                    type="time"
                    value={editingEntry.endTime}
                    onChange={(e) => setEditingEntry({...editingEntry, endTime: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editStatus">{t("edit_dialog.status")}</Label>
                <Select value={editingEntry.status} onValueChange={(value) => setEditingEntry({...editingEntry, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{t("status.scheduled")}</SelectItem>
                    <SelectItem value="active">{t("status.active")}</SelectItem>
                    <SelectItem value="completed">{t("status.completed")}</SelectItem>
                    <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateEntry}>
                {t("edit_dialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}