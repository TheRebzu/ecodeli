'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, MapPin, Clock, Truck, RefreshCw, Users } from 'lucide-react'

const createRouteSchema = z.object({
  name: z.string().min(1, 'Le nom de la route est requis'),
  description: z.string().optional(),
  
  // Départ
  departureAddress: z.string().min(1, 'L\'adresse de départ est requise'),
  departureLatitude: z.number(),
  departureLongitude: z.number(),
  
  // Arrivée
  arrivalAddress: z.string().min(1, 'L\'adresse d\'arrivée est requise'),
  arrivalLatitude: z.number(),
  arrivalLongitude: z.number(),
  
  // Horaires
  departureTime: z.string().min(1, 'L\'heure de départ est requise'),
  arrivalTime: z.string().min(1, 'L\'heure d\'arrivée est requise'),
  
  // Récurrence
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  recurringDays: z.array(z.number()).optional(),
  
  // Capacité et véhicule
  maxCapacity: z.number().min(1, 'La capacité doit être d\'au moins 1').max(20, 'La capacité ne peut pas dépasser 20'),
  vehicleType: z.string().min(1, 'Le type de véhicule est requis'),
  pricePerKm: z.number().min(0).optional(),
  
  isActive: z.boolean().default(true)
})

type CreateRouteForm = z.infer<typeof createRouteSchema>

const vehicleTypes = [
  { value: 'CAR', label: '🚗 Voiture' },
  { value: 'VAN', label: '🚐 Camionnette' },
  { value: 'TRUCK', label: '🚚 Camion' },
  { value: 'BIKE', label: '🚲 Vélo' },
  { value: 'MOTORBIKE', label: '🏍️ Moto' }
]

const recurringPatterns = [
  { value: 'DAILY', label: 'Quotidien' },
  { value: 'WEEKLY', label: 'Hebdomadaire' },
  { value: 'MONTHLY', label: 'Mensuel' }
]

const daysOfWeek = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' }
]

interface CreateRouteFormProps {
  onSuccess: () => void
}

export function CreateRouteForm({ onSuccess }: CreateRouteFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<CreateRouteForm>({
    resolver: zodResolver(createRouteSchema),
    defaultValues: {
      name: '',
      description: '',
      departureAddress: '',
      departureLatitude: 48.8566, // Paris par défaut
      departureLongitude: 2.3522,
      arrivalAddress: '',
      arrivalLatitude: 48.8566,
      arrivalLongitude: 2.3522,
      departureTime: '',
      arrivalTime: '',
      isRecurring: false,
      recurringPattern: 'WEEKLY',
      recurringDays: [1, 2, 3, 4, 5], // Lun-Ven par défaut
      maxCapacity: 5,
      vehicleType: 'CAR',
      pricePerKm: 0.5,
      isActive: true
    }
  })

  const onSubmit = async (data: CreateRouteForm) => {
    try {
      setLoading(true)

      // Construire l'objet de données avec les bonnes structures pour l'API
      const routeData = {
        name: data.name,
        description: data.description,
        startAddress: data.departureAddress,
        startLatitude: data.departureLatitude,
        startLongitude: data.departureLongitude,
        endAddress: data.arrivalAddress,
        endLatitude: data.arrivalLatitude,
        endLongitude: data.arrivalLongitude,
        startDate: new Date(`1970-01-01T${data.departureTime}:00`).toISOString(),
        endDate: new Date(`1970-01-01T${data.arrivalTime}:00`).toISOString(),
        isRecurring: data.isRecurring,
        recurringPattern: data.isRecurring ? data.recurringPattern : undefined,
        maxPackages: data.maxCapacity,
        vehicleType: data.vehicleType,
        isActive: data.isActive,
        autoAccept: false,
        maxDetour: 5.0,
        acceptedTypes: []
      }

      const response = await fetch('/api/deliverer/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création')
      }

      const result = await response.json()

      toast({
        title: '✅ Route créée',
        description: 'Votre route a été créée avec succès',
      })

      onSuccess()

    } catch (error) {
      console.error('Erreur création route:', error)
      toast({
        title: '❌ Erreur',
        description: error instanceof Error ? error.message : 'Une erreur s\'est produite',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const isRecurring = form.watch('isRecurring')
  const selectedDays = form.watch('recurringDays') || []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la route *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Domicile → Travail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnelle)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description de votre trajet habituel..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de véhicule *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un véhicule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité maximale *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        placeholder="5"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Nombre maximum de colis/livraisons
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pricePerKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix par kilomètre (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.50"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Prix que vous souhaitez par kilomètre parcouru
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Trajet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Trajet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-medium text-blue-600">📍 Point de départ</h4>
                <FormField
                  control={form.control}
                  name="departureAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse de départ *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Rue de la Paix, Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-green-600">🎯 Point d'arrivée</h4>
                <FormField
                  control={form.control}
                  name="arrivalAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse d'arrivée *</FormLabel>
                      <FormControl>
                        <Input placeholder="456 Avenue des Champs, Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departureTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de départ *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="arrivalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure d'arrivée *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Récurrence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Récurrence
            </CardTitle>
            <CardDescription>
              Définissez si ce trajet se répète régulièrement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Trajet récurrent
                    </FormLabel>
                    <FormDescription>
                      Ce trajet se répète selon un planning régulier
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {isRecurring && (
              <div className="space-y-4 border-l-4 border-blue-200 pl-4">
                <FormField
                  control={form.control}
                  name="recurringPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fréquence de répétition</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une fréquence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recurringPatterns.map((pattern) => (
                            <SelectItem key={pattern.value} value={pattern.value}>
                              {pattern.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurringDays"
                  render={() => (
                    <FormItem>
                      <FormLabel>Jours de la semaine</FormLabel>
                      <div className="grid grid-cols-4 gap-2">
                        {daysOfWeek.map((day) => (
                          <FormField
                            key={day.value}
                            control={form.control}
                            name="recurringDays"
                            render={({ field }) => (
                              <FormItem
                                key={day.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      const currentDays = field.value || []
                                      if (checked) {
                                        field.onChange([...currentDays, day.value])
                                      } else {
                                        field.onChange(currentDays.filter((d) => d !== day.value))
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormDescription>
                        Sélectionnez les jours où vous effectuez ce trajet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activation */}
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Activer cette route immédiatement
                    </FormLabel>
                    <FormDescription>
                      Vous recevrez des notifications pour les annonces correspondantes
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Réinitialiser
          </Button>
          <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Créer la route
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}