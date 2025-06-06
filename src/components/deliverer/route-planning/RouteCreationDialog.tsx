'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, MapPinIcon, TruckIcon, ClockIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const routeSchema = z.object({
  name: z.string().min(3, 'Nom requis (min 3 caractères)'),
  description: z.string().optional(),
  startAddress: z.string().min(5, 'Adresse de départ requise'),
  endAddress: z.string().min(5, 'Adresse d\'arrivée requise'),
  departureDate: z.date({ required_error: 'Date de départ requise' }),
  departureTime: z.string().min(5, 'Heure de départ requise'),
  arrivalTime: z.string().min(5, 'Heure d\'arrivée requise'),
  availableWeight: z.number().min(1, 'Capacité poids requise'),
  availableVolume: z.number().min(0.1, 'Capacité volume requise'),
  isRecurring: z.boolean(),
  recurringDays: z.array(z.string()).optional()
});

type RouteFormData = z.infer<typeof routeSchema>;

interface RouteCreationDialogProps {
  onRouteCreated?: (route: any) => void;
  isCreating?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' }
];

export function RouteCreationDialog({ onRouteCreated, isCreating = false }: RouteCreationDialogProps) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: '',
      description: '',
      startAddress: '',
      endAddress: '',
      departureTime: '09:00',
      arrivalTime: '17:00',
      availableWeight: 25,
      availableVolume: 2,
      isRecurring: false,
      recurringDays: []
    }
  });

  const isRecurring = form.watch('isRecurring');

  const onSubmit = form.handleSubmit(async (data: RouteFormData) => {
    try {
      // Combiner date et heure
      const departureDateTime = new Date(data.departureDate);
      const [depHour, depMin] = data.departureTime.split(':');
      departureDateTime.setHours(parseInt(depHour), parseInt(depMin));

      const arrivalDateTime = new Date(data.departureDate);
      const [arrHour, arrMin] = data.arrivalTime.split(':');
      arrivalDateTime.setHours(parseInt(arrHour), parseInt(arrMin));

      const routeData = {
        ...data,
        departureTime: departureDateTime,
        arrivalTime: arrivalDateTime
      };

      // TODO: Intégrer avec le service route planning
      console.log('Creating route:', routeData);
      
      // Simuler la création
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onRouteCreated?.(routeData);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <MapPinIcon className="w-4 h-4 mr-2" />
          Créer un trajet
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TruckIcon className="w-5 h-5 mr-2 text-green-600" />
            Nouveau trajet planifié
          </DialogTitle>
          <DialogDescription>
            Déclarez votre trajet à l'avance et recevez automatiquement des propositions 
            de livraisons compatibles avec votre itinéraire.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informations générales</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nom du trajet *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Paris-Lyon hebdomadaire"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description (optionnelle)</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre trajet, vos disponibilités..."
                  {...form.register('description')}
                />
              </div>
            </div>
          </div>

          {/* Itinéraire */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Itinéraire</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="startAddress">Adresse de départ *</Label>
                <Input
                  id="startAddress"
                  placeholder="Adresse complète de départ"
                  {...form.register('startAddress')}
                />
                {form.formState.errors.startAddress && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.startAddress.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endAddress">Adresse d'arrivée *</Label>
                <Input
                  id="endAddress"
                  placeholder="Adresse complète d'arrivée"
                  {...form.register('endAddress')}
                />
                {form.formState.errors.endAddress && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.endAddress.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Planning */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Planning
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date de départ *</Label>
                <Controller
                  name="departureDate"
                  control={form.control}
                  render={({ field }) => (
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setDatePickerOpen(false);
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.departureDate && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.departureDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="departureTime">Heure de départ *</Label>
                <Input
                  id="departureTime"
                  type="time"
                  {...form.register('departureTime')}
                />
              </div>

              <div>
                <Label htmlFor="arrivalTime">Heure d'arrivée *</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  {...form.register('arrivalTime')}
                />
              </div>
            </div>

            {/* Récurrence */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Controller
                  name="isRecurring"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="isRecurring"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isRecurring">Trajet récurrent</Label>
              </div>

              {isRecurring && (
                <div>
                  <Label>Jours de la semaine</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Controller
                          name="recurringDays"
                          control={form.control}
                          render={({ field }) => (
                            <Checkbox
                              id={day.value}
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked) => {
                                const currentDays = field.value || [];
                                if (checked) {
                                  field.onChange([...currentDays, day.value]);
                                } else {
                                  field.onChange(currentDays.filter(d => d !== day.value));
                                }
                              }}
                            />
                          )}
                        />
                        <Label htmlFor={day.value} className="text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Capacité */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Capacité disponible</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availableWeight">Poids disponible (kg) *</Label>
                <Input
                  id="availableWeight"
                  type="number"
                  min="1"
                  step="0.5"
                  {...form.register('availableWeight', { valueAsNumber: true })}
                />
                {form.formState.errors.availableWeight && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.availableWeight.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="availableVolume">Volume disponible (m³) *</Label>
                <Input
                  id="availableVolume"
                  type="number"
                  min="0.1"
                  step="0.1"
                  {...form.register('availableVolume', { valueAsNumber: true })}
                />
                {form.formState.errors.availableVolume && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.availableVolume.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreating ? 'Création...' : 'Créer le trajet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}