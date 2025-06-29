"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Package, 
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";
import { toast } from "sonner";

interface PlanningManagerProps {
  delivererId: string;
}

interface PlanningEvent {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  date: string;
  location?: string;
  client?: string;
  status: string;
  priority: string;
  description?: string;
}

interface DaySchedule {
  date: string;
  events: PlanningEvent[];
  isToday: boolean;
  availableSlots: number;
}

export default function PlanningManager({ delivererId }: PlanningManagerProps) {
  const t = useTranslations("deliverer.planning");
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchPlanning = async (weekStart: Date) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deliverer/planning?week=${weekStart.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        setSchedule(data.schedule || []);
      }
    } catch (error) {
      console.error("Error fetching planning:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (date: string, available: boolean) => {
    try {
      const response = await fetch("/api/deliverer/planning/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, available }),
      });

      if (response.ok) {
        toast.success(t("success.availability_updated"));
        fetchPlanning(getWeekStart(currentWeek));
      } else {
        toast.error(t("error.update_failed"));
      }
    } catch (error) {
      console.error("Error updating availability:", error);
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
    fetchPlanning(getWeekStart(newWeek));
  };

  useEffect(() => {
    fetchPlanning(getWeekStart(currentWeek));
  }, [delivererId]);

  const getEventStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: "bg-green-100 text-green-800", label: t("status.confirmed") },
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      in_progress: { color: "bg-blue-100 text-blue-800", label: t("status.in_progress") },
      completed: { color: "bg-gray-100 text-gray-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">{t("priority.high")}</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">{t("priority.medium")}</Badge>;
      case "low":
        return <Badge className="bg-gray-100 text-gray-800">{t("priority.low")}</Badge>;
      default:
        return null;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "delivery":
        return <Package className="w-4 h-4" />;
      case "pickup":
        return <MapPin className="w-4 h-4" />;
      case "appointment":
        return <Clock className="w-4 h-4" />;
      default:
        return <CalendarDays className="w-4 h-4" />;
    }
  };

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
              <span>{t("weekly_planning")}</span>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {daySchedule?.events.length ? (
                    daySchedule.events.map((event) => (
                      <div
                        key={event.id}
                        className="p-2 bg-gray-50 rounded-lg border-l-4 border-l-blue-500 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSelectedDate(event.date)}
                      >
                        <div className="flex items-start space-x-2">
                          {getEventTypeIcon(event.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{event.title}</p>
                            <p className="text-xs text-gray-500">
                              {event.startTime} - {event.endTime}
                            </p>
                            {event.client && (
                              <p className="text-xs text-gray-600 truncate">
                                <User className="w-3 h-3 inline mr-1" />
                                {event.client}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-xs text-gray-600 truncate">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {event.location}
                              </p>
                            )}
                            <div className="flex items-center space-x-1 mt-1">
                              {getEventStatusBadge(event.status)}
                              {getPriorityBadge(event.priority)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400">{t("no_events")}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 text-xs"
                        onClick={() => updateAvailability(day.toISOString().split('T')[0], true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t("set_available")}
                      </Button>
                    </div>
                  )}
                  
                  {daySchedule?.availableSlots && daySchedule.availableSlots > 0 && (
                    <div className="text-center pt-2 border-t">
                      <p className="text-xs text-green-600">
                        {daySchedule.availableSlots} {t("available_slots")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.total_deliveries")}</p>
                <p className="text-xl font-bold">
                  {schedule.reduce((total, day) => 
                    total + day.events.filter(e => e.type === 'delivery').length, 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.available_slots")}</p>
                <p className="text-xl font-bold">
                  {schedule.reduce((total, day) => total + (day.availableSlots || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t("stats.busy_days")}</p>
                <p className="text-xl font-bold">
                  {schedule.filter(day => day.events.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 