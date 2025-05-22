'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslations } from 'next-intl';

export interface DatePickerProps {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
}

/**
 * Composant DatePicker personnalisé
 * Permet de sélectionner une date avec un calendrier
 */
export function DatePicker({
  className,
  selected,
  onSelect,
  placeholder,
  disabled,
}: DatePickerProps) {
  const t = useTranslations('datePickerLocale');
  const [date, setDate] = React.useState<Date | undefined>(selected);

  // Mettre à jour l'état local si la prop selected change
  React.useEffect(() => {
    setDate(selected);
  }, [selected]);

  // Gérer la sélection de date
  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (onSelect) {
      onSelect(newDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'P', { locale: fr }) : placeholder || t('selectDate')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={fr}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
