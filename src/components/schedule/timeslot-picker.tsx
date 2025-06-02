'use client';

import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeslotPickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: 'start' | 'end' | 'duration';
  minTime?: string;
  maxTime?: string;
  step?: number; // en minutes
  showQuickSelect?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Sélecteur de créneaux horaires avancé
 * Supporte les modes rapides et la saisie manuelle
 */
export function TimeslotPicker({
  value,
  onChange,
  placeholder = 'Sélectionnez une heure',
  mode = 'start',
  minTime,
  maxTime,
  step = 15,
  showQuickSelect = true,
  disabled = false,
  className,
}: TimeslotPickerProps) {
  const t = useTranslations('services.timeslot');
  const [isOpen, setIsOpen] = useState(false);
  const [customTime, setCustomTime] = useState('');

  // Générer les créneaux horaires
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startHour = minTime ? parseInt(minTime.split(':')[0]) : 6;
    const startMinute = minTime ? parseInt(minTime.split(':')[1]) : 0;
    const endHour = maxTime ? parseInt(maxTime.split(':')[0]) : 22;
    const endMinute = maxTime ? parseInt(maxTime.split(':')[1]) : 0;

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    for (let minutes = startTotalMinutes; minutes <= endTotalMinutes; minutes += step) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }

    return slots;
  }, [minTime, maxTime, step]);

  // Créneaux rapides prédéfinis
  const quickSlots = useMemo(() => {
    const common = {
      start: ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'],
      end: ['12:00', '13:00', '17:00', '18:00', '19:00', '20:00'],
      duration: ['08:00', '09:00', '12:00', '17:00', '18:00'],
    };

    return common[mode] || common.start;
  }, [mode]);

  // Filtrer les créneaux rapides selon les contraintes
  const filteredQuickSlots = useMemo(() => {
    return quickSlots.filter(slot => {
      if (minTime && slot < minTime) return false;
      if (maxTime && slot > maxTime) return false;
      return true;
    });
  }, [quickSlots, minTime, maxTime]);

  // Valider une heure personnalisée
  const validateCustomTime = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) return false;

    if (minTime && time < minTime) return false;
    if (maxTime && time > maxTime) return false;

    return true;
  };

  // Gestionnaire de sélection
  const handleSelect = (selectedTime: string) => {
    onChange(selectedTime);
    setIsOpen(false);
  };

  // Gestionnaire de saisie personnalisée
  const handleCustomTimeSubmit = () => {
    if (validateCustomTime(customTime)) {
      handleSelect(customTime);
      setCustomTime('');
    }
  };

  // Gestionnaire de changement de l'input personnalisé
  const handleCustomTimeChange = (time: string) => {
    setCustomTime(time);
    if (validateCustomTime(time)) {
      onChange(time);
    }
  };

  // Obtenir le label pour le mode
  const getModeLabel = () => {
    switch (mode) {
      case 'start':
        return t('start');
      case 'end':
        return t('end');
      case 'duration':
        return t('duration');
      default:
        return t('time');
    }
  };

  // Obtenir l'icône pour le mode
  const getModeColor = () => {
    switch (mode) {
      case 'start':
        return 'text-green-600';
      case 'end':
        return 'text-red-600';
      case 'duration':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Sélecteur principal */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Clock className={cn('h-4 w-4', getModeColor())} />
              {value ? (
                <span>{value}</span>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* En-tête */}
            <div className="flex items-center gap-2">
              <Clock className={cn('h-4 w-4', getModeColor())} />
              <span className="font-medium">{getModeLabel()}</span>
            </div>

            {/* Saisie manuelle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('customTime')}</label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => handleCustomTimeChange(e.target.value)}
                  placeholder="HH:MM"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleCustomTimeSubmit}
                  disabled={!validateCustomTime(customTime)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Créneaux rapides */}
            {showQuickSelect && filteredQuickSlots.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('quickSelect')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {filteredQuickSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={value === slot ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSelect(slot)}
                      className="text-xs"
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste complète des créneaux */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('allSlots')}</label>
              <ScrollArea className="h-32 border rounded-md">
                <div className="p-2 space-y-1">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={value === slot ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleSelect(slot)}
                      className="w-full justify-start text-sm h-8"
                    >
                      <Clock className="h-3 w-3 mr-2" />
                      {slot}
                      {value === slot && <Check className="h-3 w-3 ml-auto" />}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Contraintes affichées */}
            {(minTime || maxTime) && (
              <div className="text-xs text-muted-foreground space-y-1">
                {minTime && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="px-1 py-0 text-xs">
                      Min: {minTime}
                    </Badge>
                  </div>
                )}
                {maxTime && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="px-1 py-0 text-xs">
                      Max: {maxTime}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Affichage des contraintes en mode compact */}
      {(minTime || maxTime) && (
        <div className="flex gap-1 text-xs">
          {minTime && (
            <Badge variant="secondary" className="px-1 py-0">
              ≥ {minTime}
            </Badge>
          )}
          {maxTime && (
            <Badge variant="secondary" className="px-1 py-0">
              ≤ {maxTime}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
