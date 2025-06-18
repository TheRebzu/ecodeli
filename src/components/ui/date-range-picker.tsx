"use client";

import React from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultDateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  className?: string;
  align?: "start" | "end" | "center";
  calendarClassName?: string;
}

const predefinedRanges = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
  { value: "this-month", label: "Ce mois" },
  { value: "last-month", label: "Mois dernier" },
  { value: "this-year", label: "Cette année" }
];

export function DateRangePicker({
  defaultDateRange,
  onDateRangeChange,
  className,
  align = "end",
  calendarClassName,
  ...props
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    defaultDateRange || {
      from: addDays(new Date(), -30), // 30 derniers jours par défaut
      to: new Date()
    },
  );
  const [selectedRange, setSelectedRange] = React.useState<string>("30");

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDate(range);
    if (onDateRangeChange) {
      onDateRangeChange(range);
    }
  };

  const handlePredefinedRangeChange = (value: string) => {
    setSelectedRange(value);

    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (value) {
      case "7":
        from = addDays(today, -7);
        break;
      case "30":
        from = addDays(today, -30);
        break;
      case "90":
        from = addDays(today, -90);
        break;
      case "this-month":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "last-month":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this-year":
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        from = addDays(today, -30);
    }

    const newRange = { from, to };
    handleDateRangeChange(newRange);
  };

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left w-[260px] font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM yyyy", { locale: fr })} -{" "}
                  {format(date.to, "dd MMM yyyy", { locale: fr })}
                </>
              ) : (
                format(date.from, "dd MMM yyyy", { locale: fr })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="p-3 border-b">
            <Select
              value={selectedRange}
              onValueChange={handlePredefinedRangeChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {predefinedRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="flex items-center justify-between border-t p-3">
            <p className="text-sm text-muted-foreground">
              {date?.from && (
                <>
                  <strong>Du:</strong>{" "}
                  {format(date.from, "dd/MM/yyyy", { locale: fr })}
                </>
              )}
              {date?.to && (
                <>
                  {" - "}
                  <strong>au:</strong>{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: fr })}
                </>
              )}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DatePickerWithRangeProps {
  date?: DateRange;
  onDateChange?: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerWithRange({ 
  date,
  onDateChange,
  placeholder = "Sélectionner une période",
  className
}: DatePickerWithRangeProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date);
  const [isOpen, setIsOpen] = React.useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const displayText = () => {
    const activeDate = date || internalDate;
    if (activeDate?.from && activeDate?.to) {
      return `${formatDate(activeDate.from)} - ${formatDate(activeDate.to)}`;
    }
    if (activeDate?.from) {
      return formatDate(activeDate.from);
    }
    return placeholder;
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setInternalDate(range);
    if (range && onDateChange) {
      onDateChange(range);
    }
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText()}
          <ChevronDown className="ml-auto h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={(date || internalDate)?.from}
          selected={date || internalDate}
          onSelect={handleDateChange}
          numberOfMonths={2}
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePickerWithRange;
