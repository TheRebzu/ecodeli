'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from "@/components/ui/use-toast"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Star, 
  Euro, 
  Phone, 
  Mail, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format, addDays, isSameDay, isAfter, isBefore } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProviderAppointmentProps {
  providerId?: string
  serviceId?: string
}

/**
 * Composant de prise de rendez-vous avec les prestataires pour les clients
 * Implémentation selon la Mission 1 - Gestion complète des rendez-vous
 */
export default function ProviderAppointment({ providerId, serviceId }: ProviderAppointmentProps) {
  const t = useTranslations('client.appointments')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>(providerId || '')
  const [selectedService, setSelectedService] = useState<string>(serviceId || '')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [isBooking, setIsBooking] = useState(false)

  // Récupération des données via tRPC
  const { data: providers, isLoading: providersLoading } = api.client.getAvailableProviders.useQuery({
    serviceId: selectedService || undefined,
    location: locationFilter !== 'all' ? locationFilter : undefined,
    search: searchQuery || undefined
  })

  const { data: services, isLoading: servicesLoading } = api.client.getProviderServices.useQuery()

  const { data: providerDetails } = api.client.getProviderDetails.useQuery(
    { providerId: selectedProvider },
    { enabled: !!selectedProvider }
  )

  const { data: availability } = api.client.getProviderAvailability.useQuery(
    { 
      providerId: selectedProvider,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
    },
    { enabled: !!selectedProvider && !!selectedDate }
  )

  const { data: serviceDetails } = api.client.getServiceDetails.useQuery(
    { serviceId: selectedService },
    { enabled: !!selectedService }
  )

  // Mutations pour les actions
  const bookAppointmentMutation = api.client.bookAppointment.useMutation({
    onSuccess: (data) => {
      toast({
        title: t('appointmentBooked'),
        description: t('appointmentBookedSuccess'),
      })
      setIsBooking(false)
      setSelectedTimeSlot('')
      setAppointmentNotes('')
      
      // Rediriger vers la page de confirmation ou les rendez-vous
      if (data.appointmentId) {
        window.location.href = `/client/appointments/${data.appointmentId}`
      }
    },
    onError: (error) => {
      toast({
        title: t('bookingError'),
        description: error.message,
        variant: 'destructive',
      })
      setIsBooking(false)
    }
  })

  // Gestion des actions
  const handleBookAppointment = () => {
    if (!selectedProvider || !selectedService || !selectedDate || !selectedTimeSlot) {
      toast({
        title: t('missingInformation'),
        description: t('missingInformationDescription'),
        variant: 'destructive',
      })
      return
    }

    setIsBooking(true)
    bookAppointmentMutation.mutate({
      providerId: selectedProvider,
      serviceId: selectedService,
      date: format(selectedDate, 'yyyy-MM-dd'),
      timeSlot: selectedTimeSlot,
      notes: appointmentNotes
    })
  }

  // Fonction pour formater le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price / 100)
  }

  // Fonction pour obtenir les créneaux disponibles
  const getAvailableTimeSlots = () => {
    if (!availability) return []
    
    return availability.timeSlots?.filter(slot => slot.available) || []
  }

  // Fonction pour vérifier si une date est disponible
  const isDateAvailable = (date: Date) => {
    if (!selectedProvider) return false
    if (isBefore(date, new Date())) return false
    
    // Ici vous pouvez ajouter la logique pour vérifier la disponibilité
    // Pour l'instant, on considère que les 30 prochains jours sont disponibles
    return isBefore(date, addDays(new Date(), 30))
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('bookAppointment')}</h1>
        <p className="text-muted-foreground">{t('bookAppointmentDescription')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sélection du service et du prestataire */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sélection du service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('selectService')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service">{t('service')}</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectServicePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{service.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {formatPrice(service.basePrice)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {serviceDetails && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">{serviceDetails.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{serviceDetails.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{serviceDetails.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        <span>{t('from')} {formatPrice(serviceDetails.basePrice)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filtres et recherche de prestataires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                {t('findProvider')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <Label htmlFor="search">{t('search')}</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder={t('searchProviderPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">{t('location')}</Label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allLocations')}</SelectItem>
                        <SelectItem value="paris">{t('paris')}</SelectItem>
                        <SelectItem value="lyon">{t('lyon')}</SelectItem>
                        <SelectItem value="marseille">{t('marseille')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="price">{t('priceRange')}</Label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allPrices')}</SelectItem>
                        <SelectItem value="low">{t('under50')}</SelectItem>
                        <SelectItem value="medium">{t('50to100')}</SelectItem>
                        <SelectItem value="high">{t('over100')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des prestataires */}
          <Card>
            <CardHeader>
              <CardTitle>{t('availableProviders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {providersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : providers && providers.length > 0 ? (
                <div className="space-y-4">
                  {providers.map((provider: any) => (
                    <div
                      key={provider.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProvider === provider.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={provider.avatar} />
                          <AvatarFallback>
                            {provider.name?.charAt(0) || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{provider.name}</h4>
                            {provider.isVerified && (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('verified')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{provider.bio}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{provider.rating || 'N/A'}</span>
                              <span className="text-muted-foreground">
                                ({provider.reviewsCount || 0} {t('reviews')})
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{provider.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Euro className="h-4 w-4 text-muted-foreground" />
                              <span>{formatPrice(provider.hourlyRate)}/h</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noProvidersFound')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sélection de la date et de l'heure */}
        <div className="space-y-6">
          {/* Informations du prestataire sélectionné */}
          {providerDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('selectedProvider')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={providerDetails.avatar} />
                      <AvatarFallback>
                        {providerDetails.name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{providerDetails.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{providerDetails.rating || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{providerDetails.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{providerDetails.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{providerDetails.address}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sélection de la date */}
          {selectedProvider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {t('selectDate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => !isDateAvailable(date)}
                  className="rounded-md border"
                  locale={fr}
                />
              </CardContent>
            </Card>
          )}

          {/* Sélection de l'heure */}
          {selectedDate && selectedProvider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('selectTime')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getAvailableTimeSlots().length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {getAvailableTimeSlots().map((slot: any) => (
                        <Button
                          key={slot.time}
                          variant={selectedTimeSlot === slot.time ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          className="text-sm"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('noAvailableSlots')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes et confirmation */}
          {selectedTimeSlot && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t('appointmentDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">{t('notes')} ({t('optional')})</Label>
                    <Textarea
                      id="notes"
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder={t('notesPlaceholder')}
                      rows={3}
                    />
                  </div>

                  {/* Récapitulatif */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-medium">{t('appointmentSummary')}</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>{t('service')}:</strong> {serviceDetails?.name}</p>
                      <p><strong>{t('provider')}:</strong> {providerDetails?.name}</p>
                      <p><strong>{t('date')}:</strong> {selectedDate && format(selectedDate, 'dd MMMM yyyy', { locale: fr })}</p>
                      <p><strong>{t('time')}:</strong> {selectedTimeSlot}</p>
                      <p><strong>{t('duration')}:</strong> {serviceDetails?.duration} min</p>
                      <p><strong>{t('price')}:</strong> {serviceDetails && formatPrice(serviceDetails.basePrice)}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleBookAppointment}
                    disabled={isBooking || bookAppointmentMutation.isPending}
                    className="w-full"
                  >
                    {isBooking ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        {t('booking')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('confirmBooking')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
