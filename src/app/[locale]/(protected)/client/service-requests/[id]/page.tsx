"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Euro,
  Users,
  Star,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
  Trash2,
  MessageSquare,
  User,
  Package
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ServiceRequestDetails {
  id: string
  title: string
  description: string
  status: string
  budget: number
  currency: string
  isUrgent: boolean
  createdAt: string
  updatedAt: string
  
  serviceDetails?: {
    serviceType: string
    numberOfPeople?: number
    duration?: number
    recurringService?: boolean
    recurringPattern?: string
    specialRequirements?: string
  }
  
  location: {
    address: string
    city: string
    scheduledAt: string | null
  }
  
  author: {
    id: string
    profile: {
      firstName?: string
      lastName?: string
      avatar?: string
      phone?: string
      email?: string
    }
  }
  
  applications: Array<{
    id: string
    provider: {
      id: string
      name: string
      avatar?: string
      phone?: string
      rating: number
    }
    price: number
    estimatedDuration: number
    message: string
    status: string
    createdAt: string
  }>
  
  bookings: Array<{
    id: string
    provider: {
      id: string
      name: string
      avatar?: string
      phone?: string
    }
    status: string
    scheduledDate: string | null
    totalPrice: number
    notes?: string
    createdAt: string
  }>
  
  stats: {
    applicationsCount: number
    bookingsCount: number
    reviewsCount: number
  }
}

export default function ServiceRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [serviceRequest, setServiceRequest] = useState<ServiceRequestDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchServiceRequestDetails()
    }
  }, [params.id])

  const fetchServiceRequestDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/service-requests/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Demande de service non trouvée')
      }

      const data = await response.json()
      setServiceRequest(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!serviceRequest || !confirm('Êtes-vous sûr de vouloir supprimer cette demande de service ?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/client/service-requests/${serviceRequest.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Demande de service supprimée avec succès')
        router.push('/client/service-requests')
      } else {
        throw new Error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon'
      case 'ACTIVE':
        return 'Active'
      case 'IN_PROGRESS':
        return 'En cours'
      case 'COMPLETED':
        return 'Terminée'
      case 'CANCELLED':
        return 'Annulée'
      default:
        return status
    }
  }

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'HOME_SERVICE':
        return 'Service à domicile'
      case 'CLEANING':
        return 'Ménage'
      case 'GARDENING':
        return 'Jardinage'
      case 'HANDYMAN':
        return 'Bricolage'
      case 'TUTORING':
        return 'Cours particuliers'
      case 'PET_CARE':
        return 'Garde d\'animaux'
      default:
        return serviceType
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    )
  }

  if (error || !serviceRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Erreur</h2>
          <p className="text-gray-600">{error || 'Demande de service non trouvée'}</p>
          <Button onClick={() => router.push('/client/service-requests')}>
            Retour aux demandes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/client/service-requests"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux demandes de services
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{serviceRequest.title}</h1>
              <p className="text-gray-600 mt-1">Demande #{serviceRequest.id.slice(-8)}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(serviceRequest.status)}>
                {getStatusLabel(serviceRequest.status)}
              </Badge>
              
              {serviceRequest.isUrgent && (
                <Badge className="bg-red-100 text-red-800">
                  Urgent
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Détails principaux */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations de la demande */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Détails de la demande
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{serviceRequest.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      Budget: <strong>{serviceRequest.budget}€</strong>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      {serviceRequest.location.scheduledAt 
                        ? new Date(serviceRequest.location.scheduledAt).toLocaleDateString()
                        : 'Date non définie'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{serviceRequest.location.address}</span>
                  </div>
                  
                  {serviceRequest.serviceDetails?.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        Durée: {serviceRequest.serviceDetails.duration} min
                      </span>
                    </div>
                  )}
                </div>

                {serviceRequest.serviceDetails && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Détails du service</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Type de service</span>
                          <p className="text-gray-900">
                            {getServiceTypeLabel(serviceRequest.serviceDetails.serviceType)}
                          </p>
                        </div>
                        
                        {serviceRequest.serviceDetails.numberOfPeople && (
                          <div>
                            <span className="text-sm text-gray-500">Nombre de personnes</span>
                            <p className="text-gray-900">{serviceRequest.serviceDetails.numberOfPeople} personnes</p>
                          </div>
                        )}
                        
                        {serviceRequest.serviceDetails.recurringService && (
                          <div>
                            <span className="text-sm text-gray-500">Service récurrent</span>
                            <p className="text-gray-900">
                              {serviceRequest.serviceDetails.recurringPattern || 'Oui'}
                            </p>
                          </div>
                        )}
                        
                        {serviceRequest.serviceDetails.specialRequirements && (
                          <div className="md:col-span-2">
                            <span className="text-sm text-gray-500">Exigences spéciales</span>
                            <p className="text-gray-900">{serviceRequest.serviceDetails.specialRequirements}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Candidatures reçues */}
            {serviceRequest.applications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Candidatures reçues ({serviceRequest.applications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceRequest.applications.map((application) => (
                      <div key={application.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={application.provider.avatar} />
                              <AvatarFallback>
                                {application.provider.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{application.provider.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span>{application.provider.rating.toFixed(1)}</span>
                                {application.provider.phone && (
                                  <>
                                    <Phone className="h-4 w-4" />
                                    <span>{application.provider.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{application.price}€</p>
                            <p className="text-sm text-gray-600">{application.estimatedDuration} min</p>
                          </div>
                        </div>
                        
                        {application.message && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm text-gray-700">{application.message}</p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Contacter
                          </Button>
                          <Button size="sm">
                            Accepter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Réservations */}
            {serviceRequest.bookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Réservations ({serviceRequest.bookings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceRequest.bookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={booking.provider.avatar} />
                              <AvatarFallback>
                                {booking.provider.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{booking.provider.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                {booking.scheduledDate && (
                                  <>
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                                  </>
                                )}
                                {booking.provider.phone && (
                                  <>
                                    <Phone className="h-4 w-4" />
                                    <span>{booking.provider.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{booking.totalPrice}€</p>
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusLabel(booking.status)}
                            </Badge>
                          </div>
                        </div>
                        
                        {booking.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm text-gray-700">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Candidatures</span>
                  <span className="font-semibold">{serviceRequest.stats.applicationsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Réservations</span>
                  <span className="font-semibold">{serviceRequest.stats.bookingsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avis</span>
                  <span className="font-semibold">{serviceRequest.stats.reviewsCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {serviceRequest.status === 'DRAFT' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/client/service-requests/${serviceRequest.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
                
                {['DRAFT', 'ACTIVE'].includes(serviceRequest.status) && (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Supprimer
                  </Button>
                )}
                
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contacter le support
                </Button>
              </CardContent>
            </Card>

            {/* Informations de création */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Créée le</span>
                  <span>{new Date(serviceRequest.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modifiée le</span>
                  <span>{new Date(serviceRequest.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 