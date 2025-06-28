'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MapPin, Clock, Package, Euro, AlertCircle, CheckCircle, Star } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { MatchScore, DelivererOpportunity } from '@/features/deliveries/services/matching.service'

interface Opportunity extends MatchScore {
  announcement: {
    id: string
    title: string
    description: string
    pickupAddress: string
    deliveryAddress: string
    price: number
    scheduledAt: string
    author: {
      profile: {
        firstName?: string
        lastName?: string
      }
    }
  }
  expiresAt?: string
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
}

export function DelivererOpportunitiesPage() {
  const t = useTranslations('pages.deliverer.opportunities')
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [matches, setMatches] = useState<Opportunity[]>([])
  const [opportunities, setOpportunities] = useState<DelivererOpportunity[]>([])
  const [activeTab, setActiveTab] = useState('matches')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Charger les matches disponibles via le nouveau service de matching
      const matchesResponse = await fetch('/api/deliverer/opportunities?type=matches')
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json()
        setMatches(matchesData)
      }

      // Charger les opportunités en cours via le système de notifications
      const opportunitiesResponse = await fetch('/api/deliverer/opportunities?type=notifications')
      if (opportunitiesResponse.ok) {
        const opportunitiesData = await opportunitiesResponse.json()
        setOpportunities(opportunitiesData)
      }

    } catch (error) {
      console.error('Erreur chargement données:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les opportunités',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOpportunity = async (announcementId: string) => {
    try {
      setAccepting(announcementId)
      
      const response = await fetch('/api/deliverer/accept-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès !',
          description: result.message,
          variant: 'default'
        })
        await loadData() // Recharger les données
      } else {
        toast({
          title: 'Erreur',
          description: result.message,
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Erreur acceptation:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter cette opportunité',
        variant: 'destructive'
      })
    } finally {
      setAccepting(null)
    }
  }

  const getCompatibilityColor = (compatibility: string) => {
    switch (compatibility) {
      case 'HIGH': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompatibilityLabel = (compatibility: string) => {
    switch (compatibility) {
      case 'HIGH': return 'Excellente'
      case 'MEDIUM': return 'Bonne'
      case 'LOW': return 'Acceptable'
      default: return compatibility
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des opportunités...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Opportunités de livraison</h1>
        <p className="text-muted-foreground">
          Découvrez les annonces qui correspondent à votre profil et acceptez celles qui vous intéressent.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matches" className="relative">
            Correspondances disponibles
            {matches.length > 0 && (
              <Badge className="ml-2 bg-blue-500">{matches.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="relative">
            Mes opportunités
            {opportunities.length > 0 && (
              <Badge className="ml-2 bg-green-500">{opportunities.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          {matches.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucune correspondance disponible pour le moment. Vérifiez que votre profil est à jour et que vous avez des documents approuvés.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <Card key={match.announcementId} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{match.announcement.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {match.announcement.description}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getCompatibilityColor(match.compatibility)}>
                          {getCompatibilityLabel(match.compatibility)} ({match.totalScore}/100)
                        </Badge>
                        <div className="text-lg font-bold text-green-600">
                          {formatPrice(match.announcement.price)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Informations de livraison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Enlèvement:</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {match.announcement.pickupAddress}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Livraison:</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {match.announcement.deliveryAddress}
                        </p>
                      </div>
                    </div>

                    {/* Informations temporelles */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>Programmé pour: {formatDate(match.announcement.scheduledAt)}</span>
                      </div>
                      {match.estimatedTime && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-purple-500" />
                          <span>Temps estimé: {match.estimatedTime} min</span>
                        </div>
                      )}
                    </div>

                    {/* Raisons du matching */}
                    {match.reasons && match.reasons.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Pourquoi cette opportunité vous correspond:</p>
                        <div className="flex flex-wrap gap-2">
                          {match.reasons.map((reason, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scores détaillés */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-lg">{match.locationScore}/100</div>
                        <div className="text-muted-foreground">Géographie</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-lg">{match.timeScore}/100</div>
                        <div className="text-muted-foreground">Timing</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-lg">{match.capacityScore}/100</div>
                        <div className="text-muted-foreground">Capacité</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-lg">{match.priceScore}/100</div>
                        <div className="text-muted-foreground">Prix</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Client: {match.announcement.author.profile.firstName} {match.announcement.author.profile.lastName}
                      </div>
                      
                      <Button
                        onClick={() => handleAcceptOpportunity(match.announcementId)}
                        disabled={accepting === match.announcementId}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {accepting === match.announcementId ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Acceptation...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accepter cette livraison
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          {opportunities.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vous n'avez pas d'opportunités en cours. Consultez l'onglet "Correspondances disponibles" pour découvrir de nouvelles opportunités.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {opportunity.announcement?.title || 'Opportunité de livraison'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Score de compatibilité: {opportunity.score}/100
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={
                          opportunity.status === 'PENDING' ? 'default' :
                          opportunity.status === 'ACCEPTED' ? 'secondary' :
                          opportunity.status === 'EXPIRED' ? 'destructive' : 'outline'
                        }>
                          {opportunity.status === 'PENDING' ? 'En attente' :
                           opportunity.status === 'ACCEPTED' ? 'Acceptée' :
                           opportunity.status === 'EXPIRED' ? 'Expirée' : 
                           opportunity.status}
                        </Badge>
                        {opportunity.expiresAt && (
                          <div className="text-sm text-muted-foreground">
                            Expire le {formatDate(opportunity.expiresAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {opportunity.announcement && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span>{opportunity.announcement.pickupAddress}</span>
                          <span>→</span>
                          <span>{opportunity.announcement.deliveryAddress}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span>{formatDate(opportunity.announcement.scheduledAt)}</span>
                          </div>
                          
                          <div className="text-lg font-bold text-green-600">
                            {formatPrice(opportunity.announcement.price)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}