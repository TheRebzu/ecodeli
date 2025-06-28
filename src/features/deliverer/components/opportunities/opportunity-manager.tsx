'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, 
  Clock, 
  Euro, 
  User,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Star,
  Package,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useDeliveryOpportunities, useDelivererRoutes } from '../../hooks/useDelivererData'
import { OpportunityDetailsDialog } from './OpportunityDetailsDialog'
import { useTranslations } from 'next-intl'
import type { DeliveryOpportunity } from '../../types'

export function OpportunityManager() {
  const { 
    opportunities, 
    pagination, 
    loading, 
    error, 
    fetchOpportunities, 
    acceptOpportunity 
  } = useDeliveryOpportunities()
  
  const { routes, fetchRoutes } = useDelivererRoutes()
  
  const [filters, setFilters] = useState({
    type: '',
    maxDistance: '',
    minEarnings: '',
    search: ''
  })
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<DeliveryOpportunity | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  
  const t = useTranslations('deliverer.opportunities')

  useEffect(() => {
    loadOpportunities()
    fetchRoutes()
  }, [filters])

  const loadOpportunities = () => {
    const params: any = {
      page: 1,
      limit: 20
    }

    if (filters.type) params.type = filters.type
    if (filters.maxDistance) params.maxDistance = parseInt(filters.maxDistance)
    if (filters.minEarnings) params.minEarnings = parseFloat(filters.minEarnings)

    fetchOpportunities(params)
  }

  const handleRefresh = () => {
    loadOpportunities()
  }

  const handleAcceptOpportunity = async (opportunityId: string, routeId?: string) => {
    setAccepting(opportunityId)
    try {
      await acceptOpportunity(opportunityId, routeId)
      loadOpportunities() // Refresh pour supprimer l'opportunité acceptée
    } catch (error) {
      console.error('Error accepting opportunity:', error)
    } finally {
      setAccepting(null)
    }
  }

  const openDetailsDialog = (opportunity: DeliveryOpportunity) => {
    setSelectedOpportunity(opportunity)
    setDetailsDialogOpen(true)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PACKAGE_DELIVERY': return 'bg-blue-100 text-blue-800'
      case 'PERSON_TRANSPORT': return 'bg-green-100 text-green-800'
      case 'AIRPORT_TRANSFER': return 'bg-purple-100 text-purple-800'
      case 'SHOPPING': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredOpportunities = opportunities.filter(opportunity => {
    if (filters.search && !opportunity.announcement.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.available')}</p>
                <p className="text-xl font-bold">{opportunities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.avg_earnings')}</p>
                <p className="text-xl font-bold">
                  {opportunities.length > 0 
                    ? (opportunities.reduce((sum, opp) => sum + opp.estimatedEarnings, 0) / opportunities.length).toFixed(0)
                    : '0'
                  }€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.avg_distance')}</p>
                <p className="text-xl font-bold">
                  {opportunities.length > 0 
                    ? (opportunities.reduce((sum, opp) => sum + opp.distance, 0) / opportunities.length).toFixed(0)
                    : '0'
                  }km
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.high_compatibility')}</p>
                <p className="text-xl font-bold">
                  {opportunities.filter(opp => opp.compatibilityScore >= 80).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            {t('filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder={t('filters.search')}
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({...filters, type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('filters.all_types')}</SelectItem>
                <SelectItem value="PACKAGE_DELIVERY">{t('types.package_delivery')}</SelectItem>
                <SelectItem value="PERSON_TRANSPORT">{t('types.person_transport')}</SelectItem>
                <SelectItem value="AIRPORT_TRANSFER">{t('types.airport_transfer')}</SelectItem>
                <SelectItem value="SHOPPING">{t('types.shopping')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder={t('filters.max_distance')}
              value={filters.maxDistance}
              onChange={(e) => setFilters({...filters, maxDistance: e.target.value})}
            />

            <Input
              type="number"
              step="0.01"
              placeholder={t('filters.min_earnings')}
              value={filters.minEarnings}
              onChange={(e) => setFilters({...filters, minEarnings: e.target.value})}
            />

            <Button 
              variant="outline" 
              onClick={() => setFilters({ type: '', maxDistance: '', minEarnings: '', search: '' })}
            >
              {t('filters.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Liste des opportunités */}
      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('no_opportunities')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* En-tête */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{opportunity.announcement.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(opportunity.announcement.type)}>
                          {t(`types.${opportunity.announcement.type.toLowerCase()}`)}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className={`font-semibold ${getCompatibilityColor(opportunity.compatibilityScore)}`}>
                            {opportunity.compatibilityScore}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm">{opportunity.announcement.description}</p>

                    {/* Informations principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t('pickup')}:</span>
                          <span>{opportunity.announcement.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t('delivery')}:</span>
                          <span>{opportunity.announcement.deliveryAddress}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t('scheduled')}:</span>
                          <span>{new Date(opportunity.announcement.scheduledAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t('client')}:</span>
                          <span>
                            {opportunity.client.profile.firstName} {opportunity.client.profile.lastName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Métriques */}
                    <div className="flex items-center space-x-6 pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {opportunity.estimatedEarnings.toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600">{opportunity.distance.toFixed(1)}km</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-600">
                          {t('compatibility')}: {opportunity.compatibilityScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetailsDialog(opportunity)}
                    >
                      {t('actions.view_details')}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleAcceptOpportunity(opportunity.id)}
                      disabled={accepting === opportunity.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {accepting === opportunity.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {t('actions.accepting')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('actions.accept')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de détails */}
      {selectedOpportunity && (
        <OpportunityDetailsDialog
          isOpen={detailsDialogOpen}
          onClose={() => {
            setDetailsDialogOpen(false)
            setSelectedOpportunity(null)
          }}
          opportunity={selectedOpportunity}
          routes={routes}
          onAccept={(routeId) => {
            handleAcceptOpportunity(selectedOpportunity.id, routeId)
            setDetailsDialogOpen(false)
            setSelectedOpportunity(null)
          }}
        />
      )}
    </div>
  )
} 