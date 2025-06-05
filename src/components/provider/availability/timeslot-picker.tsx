'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeslotPickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: 'start' | 'end';
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Composant pour sélectionner un créneau horaire
 */
export function TimeslotPicker({
  value,
  onChange,
  placeholder = 'Sélectionner une heure',
  mode = 'start',
  minTime,
  maxTime,
  disabled = false,
  className,
}: TimeslotPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Générer les créneaux horaires disponibles
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const startHour = 8; // 8h00
    const endHour = 20; // 20h00
    const interval = 30; // 30 minutes
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Filtrer selon minTime et maxTime si définis
        if (minTime && timeString <= minTime) continue;
        if (maxTime && timeString >= maxTime) continue;
        
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return placeholder;
    const [hour, minute] = timeString.split(':');
    return `${hour}:${minute}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            'w-full justify-between text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            {formatDisplayTime(value || '')}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto">
          <div className="p-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {mode === 'start' ? 'Début' : 'Fin'}
            </div>
            
            <div className="grid gap-1">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  variant={value === time ? 'default' : 'ghost'}
                  className="justify-start text-sm h-8"
                  onClick={() => handleTimeSelect(time)}
                >
                  {formatDisplayTime(time)}
                </Button>
              ))}
            </div>
            
            {timeSlots.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aucun créneau disponible
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 