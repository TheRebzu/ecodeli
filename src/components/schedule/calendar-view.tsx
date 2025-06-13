"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: string;
}

interface CalendarViewProps {
  events?: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({
  events = [],
  selectedDate = new Date(),
  onDateSelect,
  onEventClick,
}: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendrier</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
}
