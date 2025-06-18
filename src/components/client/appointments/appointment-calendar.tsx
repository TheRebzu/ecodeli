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
        <p>Composant calendrier - À implémenter</p>
      </CardContent>
    </Card>
  );
}

export default AppointmentCalendar;
