'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square
} from 'lucide-react'
import { toast } from 'sonner'

interface Intervention {
  id: string
  providerId: string
  clientId: string
  serviceRequestId: string
  title: string
  description: string
  scheduledDate: string
  estimatedDuration: number
  actualDuration?: number
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  rating?: number
  review?: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    profile: {
      firstName: string
      lastName: string
      phone?: string
      address?: string
      city?: string
    }
  }
  serviceRequest: {
    id: string
    title: string
    description: string
    basePrice: number
    status: string
    pickupAddress: string
    deliveryAddress: string
  }
  payment?: {
    id: string
    amount: number
    currency: string
    status: string
  }
}

interface InterventionsResponse {
  interventions: Intervention[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ProviderInterventionsPage() {
  const t = useTranslations('ProviderInterventions')
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInterventions()
  }, [])

  const fetchInterventions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/provider/interventions')
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des interventions')
      }

      const data: InterventionsResponse = await response.json()
      setInterventions(data.interventions)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des interventions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="secondary"><Calendar className="w-3 h-3 mr-1" /> Planifiée</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-blue-500"><Play className="w-3 h-3 mr-1" /> En cours</Badge>
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Terminée</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Annulée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` : `${mins}min`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des interventions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes interventions</h1>
        <p className="text-muted-foreground">
          Gérez vos interventions acceptées et planifiées
        </p>
      </div>

      {interventions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune intervention</h3>
              <p className="text-muted-foreground">
                Vous n'avez pas encore d'interventions planifiées.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {interventions.map((intervention) => (
            <Card key={intervention.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={intervention.client.profile.phone} />
                      <AvatarFallback>
                        {intervention.client.profile.firstName?.[0]}{intervention.client.profile.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">{intervention.title}</h3>
                        {getStatusBadge(intervention.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {intervention.client.profile.firstName} {intervention.client.profile.lastName}
                        </div>
                        {intervention.client.profile.city && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {intervention.client.profile.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatPrice(intervention.payment?.amount || 0)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(intervention.estimatedDuration)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{intervention.description}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date planifiée</p>
                    <p className="text-sm">{formatDate(intervention.scheduledDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Durée estimée</p>
                    <p className="text-sm">{formatDuration(intervention.estimatedDuration)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Statut paiement</p>
                    <div className="flex items-center">
                      <CreditCard className="w-3 h-3 mr-1" />
                      <span className="text-sm">
                        {intervention.payment?.status === 'COMPLETED' ? 'Payé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                </div>

                {intervention.client.profile.address && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Adresse d'intervention</p>
                      <p className="text-sm">{intervention.client.profile.address}</p>
                    </div>
                  </>
                )}

                {intervention.status === 'SCHEDULED' && (
                  <div className="flex space-x-2 pt-4">
                    <Button className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      Commencer
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Pause className="w-4 h-4 mr-2" />
                      Reporter
                    </Button>
                  </div>
                )}

                {intervention.status === 'IN_PROGRESS' && (
                  <div className="flex space-x-2 pt-4">
                    <Button className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Terminer
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Square className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}