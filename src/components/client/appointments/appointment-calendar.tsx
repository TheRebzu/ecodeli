"use client";

import React, { useState } from "react";
import { format, addDays, startOfWeek, isToday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

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
  appointments}: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });
  const days: CalendarDay[] = [];

  // Générer les 42 jours du calendrier (6 semaines)
  for (let i = 0; i < 42; i++) {
    const date = addDays(startDate, i);
    const dayAppointments = appointments.filter((apt) =>
      isSameDay(apt.scheduledDate, date),
    );

    days.push({ date,
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: isToday(date),
      appointments: dayAppointments });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendrier des rendez-vous
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Navigation du mois */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {/* En-têtes des jours */}
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Jours du calendrier */}
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => onDateSelect(day.date)}
                className={`
                  relative p-2 h-12 text-sm transition-colors rounded
                  ${!day.isCurrentMonth ? "text-muted-foreground/50" : ""}
                  ${day.isToday ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"}
                  ${isSameDay(day.date, selectedDate) && !day.isToday ? "bg-muted ring-2 ring-primary" : ""}
                `}
              >
                {format(day.date, "d")}
                {day.appointments.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Rendez-vous</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AppointmentCalendar;
