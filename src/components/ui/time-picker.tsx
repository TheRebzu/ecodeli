'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/common';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const timeOptions: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return timeOptions;
};

export function TimePicker({
  value,
  onChange,
  className,
  disabled,
  placeholder = 'Select time',
}: TimePickerProps) {
  const timeOptions = React.useMemo(() => generateTimeOptions(), []);

  const formatDisplayTime = (timeString: string | undefined) => {
    if (!timeString) return placeholder;

    try {
      // Parse the time string to get hours and minutes
      const [hours, minutes] = timeString.split(':').map(Number);

      // Create a date object for today with the specified time
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      // Format the time using date-fns
      return format(date, 'p'); // 'p' formats as localized time (e.g., "10:00 AM")
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayTime(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ScrollArea className="h-72">
          <div className="p-1">
            {timeOptions.map(time => (
              <Button
                key={time}
                variant={time === value ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  onChange?.(time);
                }}
              >
                {formatDisplayTime(time)}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default TimePicker;
