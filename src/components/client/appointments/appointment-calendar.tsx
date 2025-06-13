"use client";

import React, { useState } from "react";
import { format, addDays, startOfWeek, isToday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Icons
import { ChevronLeft, ChevronRight } from "lucide-react";

// Types
interface Appointment {
  id: string;
  scheduledDate: Date;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

interface AppointmentCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointments: Appointment[];
}

export function AppointmentCalendar({
  selectedDate,
  onDateSelect,
  appointments,
}: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });
  const days: CalendarDay[] = [];

  // Générer les 42 jours du calendrier (6 semaines)
  for (let i = 0; i < 42; i++) {
    const date = addDays(startDate, i);
    const dayAppointments = appointments.filter((apt) =>
      isSameDay(apt.scheduledDate, date),
    );

    days.push({
      date,
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: isToday(date),
      appointments: dayAppointments,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth((prev) => addDays(prev, -30))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth((prev) => addDays(prev, 30))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <div
              key={i}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => onDateSelect(day.date)}
              className={`
                p-2 text-sm rounded-md hover:bg-muted relative
                ${!day.isCurrentMonth ? "text-muted-foreground opacity-50" : ""}
                ${day.isToday ? "bg-primary text-primary-foreground" : ""}
                ${isSameDay(day.date, selectedDate) ? "ring-2 ring-primary" : ""}
              `}
            >
              {day.date.getDate()}
              {day.appointments.length > 0 && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
