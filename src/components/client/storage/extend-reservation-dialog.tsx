'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarClock, Info } from 'lucide-react';
import { ReservationWithBoxAndWarehouse } from '@/types/storage';
import { useBoxReservation } from '@/hooks/use-storage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export type ExtendReservationDialogProps = {
  reservation: ReservationWithBoxAndWarehouse;
  open: boolean;
  onClose: () => void;
};

export function ExtendReservationDialog({
  reservation,
  open,
  onClose,
}: ExtendReservationDialogProps) {
  const t = useTranslations('storage');
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(
    reservation.endDate ? addMonths(reservation.endDate, 1) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { extendReservation } = useBoxReservation();

  // Calcul du montant supplémentaire
  const calculateAdditionalCost = () => {
    if (!newEndDate || !reservation.endDate) return 0;

    // Calcul du nombre de jours supplémentaires
    const originalDays = Math.ceil(
      (reservation.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const newDays = Math.ceil(
      (newEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const additionalDays = newDays - originalDays;

    // Prix journalier (simplifié)
    const dailyRate = reservation.box.pricePerDay || 0;

    return additionalDays * dailyRate;
  };

  const handleSubmit = async () => {
    if (!newEndDate) return;

    setIsSubmitting(true);
    try {
      await extendReservation({
        reservationId: reservation.id,
        newEndDate,
      });
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'extension de la réservation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dates à désactiver (avant la date de fin actuelle)
  const disabledDates = {
    before: addDays(reservation.endDate, 1),
    after: addMonths(reservation.endDate, 3), // Limite max de 3 mois supplémentaires
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('extend.title')}</DialogTitle>
          <DialogDescription>{t('extend.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{t('extend.currentEndDate')}</div>
              <div className="text-sm text-muted-foreground">
                {format(reservation.endDate, 'PPP', { locale: fr })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">{t('extend.selectNewEndDate')}</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !newEndDate && 'text-muted-foreground'
                  )}
                >
                  {newEndDate ? (
                    format(newEndDate, 'PPP', { locale: fr })
                  ) : (
                    <span>{t('extend.selectDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newEndDate}
                  onSelect={setNewEndDate}
                  disabled={disabledDates}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {newEndDate && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t('extend.additionalCost')}</AlertTitle>
              <AlertDescription>
                {calculateAdditionalCost().toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('extend.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!newEndDate || isSubmitting}>
            {isSubmitting ? t('extend.processing') : t('extend.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
