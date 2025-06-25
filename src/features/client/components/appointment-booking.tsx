"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, MapPin, Star, User, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const bookingSchema = z.object({
  serviceId: z.string().min(1, 'Service requis'),
  scheduledDate: z.string().min(1, 'Date requise'),
  scheduledTime: z.string().min(1, 'Heure requise'),
  address: z.object({
    address: z.string().min(5, 'Adresse requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    lat: z.number().optional(),
    lng: z.number().optional()
  }),
  notes: z.string().optional()
})

type BookingFormData = z.infer<typeof bookingSchema>

interface Provider {
  id: string
  name: string
  avatar?: string
  businessName?: string
  rating: number
  totalReviews: number
  specialties: string[]
  services: Service[]
  isVerified: boolean
}

interface Service {
  id: string
  name: string
  description: string
  duration: number
  basePrice: number
  type: string
}

interface TimeSlot {
  date: string
  time: string
  available: boolean
}

export function AppointmentBooking({ providerId }: { providerId: string }) {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Service, 2: Date/Heure, 3: Détails, 4: Confirmation

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema)
  })

  const watchedValues = watch()

  // Charger les informations du prestataire
  useEffect(() => {
    loadProviderData()
  }, [providerId])

  // Charger les créneaux disponibles quand un service est sélectionné
  useEffect(() => {
    if (selectedService) {
      loadAvailableSlots()
    }
  }, [selectedService, selectedDate])

  const loadProviderData = async () => {
    try {
      const response = await fetch(`/api/provider/${providerId}/public`)
      if (response.ok) {
        const data = await response.json()
        setProvider(data.provider)
      }
    } catch (error) {
      console.error('Erreur chargement prestataire:', error)
    }
  }

  const loadAvailableSlots = async () => {
    if (!selectedService) return

    setIsLoading(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(
        `/api/provider/${providerId}/availability?date=${dateStr}&serviceId=${selectedService.id}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error('Erreur chargement créneaux:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: BookingFormData) => {
    try {
      const response = await fetch('/api/client/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        setStep(4) // Aller à la confirmation
      } else {
        // Gérer les erreurs
        alert(result.error || 'Erreur lors de la réservation')
      }
    } catch (error) {
      console.error('Erreur réservation:', error)
      alert('Erreur lors de la réservation')
    }
  }

  const selectService = (service: Service) => {
    setSelectedService(service)
    setValue('serviceId', service.id)
    setStep(2)
  }

  const selectDateTime = (date: string, time: string) => {
    setValue('scheduledDate', date)
    setValue('scheduledTime', time)
    setStep(3)
  }

  const nextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7))
  }

  const prevWeek = () => {
    setSelectedDate(addDays(selectedDate, -7))
  }

  if (!provider) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête avec infos prestataire */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={provider.avatar} />
              <AvatarFallback>
                {provider.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                {provider.isVerified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Vérifié
                  </Badge>
                )}
              </div>
              
              {provider.businessName && (
                <p className="text-muted-foreground">{provider.businessName}</p>
              )}
              
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{provider.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({provider.totalReviews} avis)</span>
                </div>
                
                <div className="flex space-x-1">
                  {provider.specialties.slice(0, 3).map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Étapes de réservation */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${stepNum <= step 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {stepNum}
            </div>
            {stepNum < 4 && (
              <div className={`
                w-16 h-0.5
                ${stepNum < step ? 'bg-primary' : 'bg-muted'}
              `} />
            )}
          </div>
        ))}
      </div>

      {/* Étape 1: Sélection du service */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choisissez votre service</CardTitle>
            <CardDescription>
              Sélectionnez le service dont vous avez besoin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {provider.services.map((service) => (
                <Card 
                  key={service.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => selectService(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {service.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{service.duration} min</span>
                          </div>
                          <Badge variant="outline">{service.type}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{service.basePrice}€</p>
                        <p className="text-sm text-muted-foreground">à partir de</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 2: Sélection date et heure */}
      {step === 2 && selectedService && (
        <Card>
          <CardHeader>
            <CardTitle>Choisissez votre créneau</CardTitle>
            <CardDescription>
              Service: {selectedService.name} - {selectedService.duration} min
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Navigation semaine */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={prevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                  Semaine précédente
                </Button>
                <h3 className="font-medium">
                  {format(selectedDate, 'MMMM yyyy', { locale: fr })}
                </h3>
                <Button variant="outline" onClick={nextWeek}>
                  Semaine suivante
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendrier des créneaux */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(selectedDate, i)
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const daySlots = availableSlots.filter(slot => slot.date === dateStr)
                  
                  return (
                    <div key={i} className="space-y-2">
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {format(date, 'EEE', { locale: fr })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(date, 'dd')}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        {daySlots.map((slot) => (
                          <Button
                            key={`${slot.date}-${slot.time}`}
                            variant={slot.available ? "outline" : "ghost"}
                            size="sm"
                            className="w-full text-xs"
                            disabled={!slot.available}
                            onClick={() => selectDateTime(slot.date, slot.time)}
                          >
                            {slot.time}
                          </Button>
                        ))}
                        
                        {daySlots.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Indisponible
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 3: Détails de la réservation */}
      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Détails de votre rendez-vous</CardTitle>
              <CardDescription>
                Complétez les informations pour finaliser votre réservation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Récapitulatif */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Récapitulatif</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Service:</strong> {selectedService?.name}</p>
                  <p><strong>Date:</strong> {watchedValues.scheduledDate && format(parseISO(watchedValues.scheduledDate), 'EEEE dd MMMM yyyy', { locale: fr })}</p>
                  <p><strong>Heure:</strong> {watchedValues.scheduledTime}</p>
                  <p><strong>Durée:</strong> {selectedService?.duration} minutes</p>
                  <p><strong>Prix:</strong> {selectedService?.basePrice}€</p>
                </div>
              </div>

              {/* Adresse d'intervention */}
              <div className="space-y-4">
                <h4 className="font-medium">Adresse d'intervention</h4>
                
                <div>
                  <Label htmlFor="address">Adresse *</Label>
                  <Input
                    {...register("address.address")}
                    placeholder="123 Rue de la République"
                  />
                  {errors.address?.address && (
                    <p className="text-sm text-red-500 mt-1">{errors.address.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ville *</Label>
                    <Input
                      {...register("address.city")}
                      placeholder="Paris"
                    />
                    {errors.address?.city && (
                      <p className="text-sm text-red-500 mt-1">{errors.address.city.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="postalCode">Code postal *</Label>
                    <Input
                      {...register("address.postalCode")}
                      placeholder="75001"
                    />
                    {errors.address?.postalCode && (
                      <p className="text-sm text-red-500 mt-1">{errors.address.postalCode.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  {...register("notes")}
                  placeholder="Informations complémentaires, instructions d'accès..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(2)}
                >
                  Retour
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Réservation...' : 'Confirmer la réservation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Étape 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Rendez-vous confirmé !</h2>
            <p className="text-muted-foreground mb-6">
              Votre demande de rendez-vous a été envoyée au prestataire. 
              Vous recevrez une confirmation par email et notification.
            </p>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <a href="/client/appointments">Voir mes rendez-vous</a>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <a href="/client/services">Découvrir d'autres services</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}