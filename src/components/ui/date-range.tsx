"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange as DateRangeType } from "react-day-picker";

import { cn } from "@/lib/utils/common";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger} from "@/components/ui/popover";

interface DateRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  dateRange?: DateRangeType;
  onDateRangeChange?: (range: DateRangeType | undefined) => void;
  className?: string;
  align?: "start" | "end" | "center";
  calendarClassName?: string;
}

export function DateRange({
  dateRange,
  onDateRangeChange,
  className,
  align = "start",
  calendarClassName,
  ...props
}: DateRangeProps) {
  const [date, setDate] = React.useState<DateRangeType | undefined>(
    dateRange || {
      from: new Date(new Date().setDate(1)), // Premier jour du mois en cours
      to: new Date()},
  );

  const handleDateRangeChange = (range: DateRangeType | undefined) => {
    setDate(range);
    if (onDateRangeChange) {
      onDateRangeChange(range);
    }
  };

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM yyyy", { locale })} -{" "}
                  {format(date.to, "dd MMM yyyy", { locale })}
                </>
              ) : (
                format(date.from, "dd MMM yyyy", { locale })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
            locale={fr}
            className={calendarClassName}
          />
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDateRangeChange(undefined)}
            >
              Réinitialiser
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const today = new Date();
                handleDateRangeChange({ from: addDays(today, -30),
                  to: today });
              }}
            >
              30 derniers jours
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
