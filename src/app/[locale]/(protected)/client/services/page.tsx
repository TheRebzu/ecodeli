"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Star, 
  Clock, 
  MapPin, 
  User, 
  Calendar as CalendarIcon,
  Phone,
  MessageCircle,
  Search,
  Filter,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useClientServices, BookingRequest } from "@/features/services/hooks/useClientServices"

const categoryLabels = {
  CLEANING: '🧹 Ménage',
  GARDENING: '🌱 Jardinage',
  HANDYMAN: '🔧 Bricolage',
  TUTORING: '📚 Cours',
  HEALTHCARE: '🏥 Santé',
  BEAUTY: '💄 Beauté',
  OTHER: '📋 Autres'
}

const statusLabels = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée'
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

export default function ClientServicesPage() {
  const { 
    services, 
    bookings, 
    isLoading, 
    error, 
    createBooking, 
    rateBooking, 
    cancelBooking,
    getAvailableSlots 
  } = useClientServices()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [bookingDialog, setBookingDialog] = useState(false)
  const [ratingDialog, setRatingDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Formulaire de réservation
  const [bookingForm, setBookingForm] = useState({
    duration: 60,
    address: '',
    phone: '',
    notes: '',
    scheduledTime: '09:00'
  })

  // Formulaires pour évaluation et annulation
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const t = useTranslations()

  // Charger les créneaux disponibles quand date et service changent
  const loadAvailableSlots = async () => {
    if (!selectedService || !bookingDate) return

    setLoadingSlots(true)
    try {
      const slots = await getAvailableSlots(
        selectedService.provider.id, 
        bookingDate.toISOString().split('T')[0]
      )
      setAvailableSlots(slots)
      // Réinitialiser l'heure sélectionnée si elle n'est plus disponible
      if (slots.length > 0 && !slots.includes(bookingForm.scheduledTime)) {
        setBookingForm(prev => ({ ...prev, scheduledTime: slots[0] }))
      }
    } catch (error) {
      console.error('Erreur chargement créneaux:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const submitBooking = async () => {
    if (!selectedService || !bookingDate) {
      alert('Veuillez sélectionner un service et une date')
      return
    }

    if (!bookingForm.address || !bookingForm.phone) {
      alert('Adresse et téléphone requis')
      return
    }

    const scheduledAt = new Date(bookingDate)
    const [hours, minutes] = bookingForm.scheduledTime.split(':')
    scheduledAt.setHours(parseInt(hours), parseInt(minutes))

    const bookingData: BookingRequest = {
      serviceId: selectedService.id,
      providerId: selectedService.provider.id,
      scheduledAt: scheduledAt.toISOString(),
      duration: bookingForm.duration,
      address: bookingForm.address,
      phone: bookingForm.phone,
      notes: bookingForm.notes
    }

    try {
      await createBooking(bookingData)
      alert('Réservation créée avec succès !')
      setBookingDialog(false)
      resetBookingForm()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de la réservation')
    }
  }

  const handleRateBooking = async () => {
    if (!selectedBooking) return

    try {
      await rateBooking(selectedBooking.id, rating, review)
      alert('Évaluation enregistrée avec succès !')
      setRatingDialog(false)
      setRating(5)
      setReview('')
      setSelectedBooking(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'évaluation')
    }
  }

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) return

    try {
      await cancelBooking(selectedBooking.id, cancelReason)
      alert('Réservation annulée avec succès')
      setCancelDialog(false)
      setCancelReason('')
      setSelectedBooking(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'annulation')
    }
  }

  const resetBookingForm = () => {
    setBookingForm({
      duration: 60,
      address: '',
      phone: '',
      notes: '',
      scheduledTime: '09:00'
    })
    setBookingDate(undefined)
    setSelectedService(null)
    setAvailableSlots([])
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    
    return matchesSearch && matchesCategory && service.isActive
  })

  const calculatePrice = () => {
    if (!selectedService) return 0
    return (selectedService.pricePerHour * bookingForm.duration / 60).toFixed(2)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <div className="text-red-600 mb-4">Erreur de chargement</div>
              <p className="text-red-800">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏠 Services à la Personne
          </h1>
          <p className="text-gray-600">
            Réservez des services avec nos prestataires vérifiés
          </p>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Services</h3>
                <p className="text-2xl font-bold text-gray-900">{services.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Réservations</h3>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Actives</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Terminées</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => b.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="search">Réserver ({filteredServices.length})</TabsTrigger>
            <TabsTrigger value="bookings">Mes Réservations ({bookings.length})</TabsTrigger>
          </TabsList>

          {/* Onglet Recherche */}
          <TabsContent value="search" className="space-y-6">
            {/* Filtres */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search">Rechercher</Label>
                    <Input
                      id="search"
                      placeholder="Nom du service..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes catégories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes catégories</SelectItem>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('all')
                    }}>
                      <Filter className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des services */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className="w-fit">
                        {categoryLabels[service.category as keyof typeof categoryLabels]}
                      </Badge>
                      <span className="font-bold text-green-600">
                        {service.pricePerHour}€/h
                      </span>
                    </div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {service.description}
                    </p>

                    {/* Info prestataire */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        {service.provider.name}
                        {service.provider.businessName && (
                          <span className="ml-1">({service.provider.businessName})</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {service.provider.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="w-4 h-4 mr-2 text-yellow-500 fill-current" />
                        {service.provider.rating.toFixed(1)} 
                        <span className="ml-1">({service.provider.completedBookings} prestations)</span>
                      </div>
                    </div>

                    <Dialog 
                      open={bookingDialog && selectedService?.id === service.id}
                      onOpenChange={(open) => {
                        setBookingDialog(open)
                        if (open) {
                          setSelectedService(service)
                          if (bookingDate) {
                            loadAvailableSlots()
                          }
                        } else {
                          resetBookingForm()
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          Réserver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Réserver - {service.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Date */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start">
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    {bookingDate ? format(bookingDate, 'PPP', { locale: fr }) : 'Choisir une date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Calendar
                                    mode="single"
                                    selected={bookingDate}
                                    onSelect={(date) => {
                                      setBookingDate(date)
                                      if (date && selectedService) {
                                        loadAvailableSlots()
                                      }
                                    }}
                                    disabled={(date) => date < new Date()}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <Label htmlFor="time">Heure</Label>
                              <Select 
                                value={bookingForm.scheduledTime} 
                                onValueChange={(value) => setBookingForm({...bookingForm, scheduledTime: value})}
                                disabled={loadingSlots || availableSlots.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingSlots ? "Chargement..." : "Choisir une heure"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSlots.length > 0 ? (
                                    availableSlots.map(slot => (
                                      <SelectItem key={slot} value={slot}>
                                        {slot}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="" disabled>
                                      {loadingSlots ? "Chargement des créneaux..." : "Aucun créneau disponible"}
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {bookingDate && selectedService && !loadingSlots && availableSlots.length === 0 && (
                                <p className="text-sm text-red-600 mt-1">
                                  Aucun créneau disponible pour cette date
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Durée */}
                          <div>
                            <Label htmlFor="duration">Durée (minutes)</Label>
                            <Select value={bookingForm.duration.toString()} onValueChange={(value) => 
                              setBookingForm({...bookingForm, duration: parseInt(value)})
                            }>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 heure</SelectItem>
                                <SelectItem value="90">1h30</SelectItem>
                                <SelectItem value="120">2 heures</SelectItem>
                                <SelectItem value="180">3 heures</SelectItem>
                                <SelectItem value="240">4 heures</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Adresse */}
                          <div>
                            <Label htmlFor="address">Adresse de prestation</Label>
                            <Input
                              id="address"
                              placeholder="Adresse complète..."
                              value={bookingForm.address}
                              onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                            />
                          </div>

                          {/* Téléphone */}
                          <div>
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input
                              id="phone"
                              placeholder="06 12 34 56 78"
                              value={bookingForm.phone}
                              onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <Label htmlFor="notes">Notes (optionnel)</Label>
                            <Textarea
                              id="notes"
                              placeholder="Précisions sur la prestation..."
                              value={bookingForm.notes}
                              onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                            />
                          </div>

                          {/* Prix */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Prix total</span>
                              <span className="text-2xl font-bold text-green-600">
                                {calculatePrice()}€
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {service.pricePerHour}€/h × {bookingForm.duration} min
                            </p>
                          </div>

                          <Button onClick={submitBooking} className="w-full">
                            Confirmer la réservation
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredServices.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun service trouvé</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Modifiez vos critères de recherche
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Réservations */}
          <TabsContent value="bookings" className="space-y-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{booking.service.name}</h3>
                      <p className="text-sm text-gray-500">
                        {categoryLabels[booking.service.category as keyof typeof categoryLabels]}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                        {statusLabels[booking.status as keyof typeof statusLabels]}
                      </Badge>
                      <span className="font-bold text-green-600">
                        {booking.totalPrice}€
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(new Date(booking.scheduledAt), 'PPP à HH:mm', { locale: fr })}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {booking.duration} minutes
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      {booking.provider.name}
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <MapPin className="w-4 h-4 mr-2" />
                    {booking.address}
                  </div>

                  {booking.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-600">{booking.notes}</p>
                    </div>
                  )}

                  {booking.rating && (
                    <div className="flex items-center space-x-2 mb-4">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm">Votre note: {booking.rating}/5</span>
                      {booking.review && (
                        <span className="text-sm text-gray-500">- {booking.review}</span>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {booking.status === 'PENDING' && (
                      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            Annuler
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    )}
                    
                    {booking.status === 'COMPLETED' && !booking.rating && (
                      <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Évaluer
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    )}
                    
                    <Button variant="outline" size="sm">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contacter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {bookings.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune réservation</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Réservez votre premier service
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogue d'évaluation */}
        <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Évaluer la prestation</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{selectedBooking.service.name}</h4>
                  <p className="text-sm text-gray-600">
                    Prestation du {format(new Date(selectedBooking.scheduledAt), 'PPP', { locale: fr })}
                  </p>
                </div>
                
                <div>
                  <Label>Note sur 5</Label>
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="review">Commentaire (optionnel)</Label>
                  <Textarea
                    id="review"
                    placeholder="Partagez votre expérience..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                  />
                </div>
                
                <Button onClick={handleRateBooking} className="w-full">
                  ⭐ Publier l'évaluation
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialogue d'annulation */}
        <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la réservation</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{selectedBooking.service.name}</h4>
                  <p className="text-sm text-gray-600">
                    Prestation prévue le {format(new Date(selectedBooking.scheduledAt), 'PPP à HH:mm', { locale: fr })}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="cancelReason">Raison de l'annulation</Label>
                  <Textarea
                    id="cancelReason"
                    placeholder="Expliquez pourquoi vous annulez cette réservation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Les frais d'annulation peuvent s'appliquer selon le délai de préavis.
                  </p>
                </div>
                
                <Button 
                  onClick={handleCancelBooking}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!cancelReason.trim()}
                >
                  ❌ Confirmer l'annulation
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 