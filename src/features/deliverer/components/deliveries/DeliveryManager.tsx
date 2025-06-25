'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Package, 
  MapPin, 
  Clock, 
  Euro, 
  User,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Truck,
  AlertCircle,
  Eye
} from 'lucide-react'
import { useDelivererDeliveries } from '../../hooks/useDelivererData'
import { DeliveryValidationDialog } from './DeliveryValidationDialog'
import { DeliveryDetailsDialog } from './DeliveryDetailsDialog'
import { useTranslations } from 'next-intl'
import type { DelivererDelivery } from '../../types'

export function DeliveryManager() {
  const { 
    deliveries, 
    stats, 
    pagination, 
    loading, 
    error, 
    fetchDeliveries, 
    updateDeliveryStatus 
  } = useDelivererDeliveries()
  
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [selectedTab, setSelectedTab] = useState('all')
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<DelivererDelivery | null>(null)
  
  const t = useTranslations('deliverer.deliveries')

  useEffect(() => {
    loadDeliveries()
  }, [filters, selectedTab])

  const loadDeliveries = () => {
    const params: any = {
      page: 1,
      limit: 20
    }

    if (filters.status) params.status = filters.status
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    // Filtrer par onglet
    if (selectedTab !== 'all') {
      params.status = selectedTab.toUpperCase()
    }

    fetchDeliveries(params)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800'
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle className="w-4 h-4" />
      case 'IN_TRANSIT': return <Truck className="w-4 h-4" />
      case 'DELIVERED': return <Package className="w-4 h-4" />
      case 'CANCELLED': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handleStatusUpdate = async (deliveryId: string, newStatus: string) => {
    try {
      await updateDeliveryStatus(deliveryId, newStatus)
      loadDeliveries() // Refresh
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const openValidationDialog = (delivery: DelivererDelivery) => {
    setSelectedDelivery(delivery)
    setValidationDialogOpen(true)
  }

  const openDetailsDialog = (delivery: DelivererDelivery) => {
    setSelectedDelivery(delivery)
    setDetailsDialogOpen(true)
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ACCEPTED': return 'IN_TRANSIT'
      case 'IN_TRANSIT': return 'DELIVERED'
      default: return null
    }
  }

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ACCEPTED': return t('actions.start_delivery')
      case 'IN_TRANSIT': return t('actions.complete_delivery')
      default: return null
    }
  }

  const filteredDeliveries = deliveries.filter(delivery => {
    if (filters.search && !delivery.announcement.title.toLowerCase().includes(filters.search.toLowerCase())) {
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
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.total')}</p>
                <p className="text-xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.completed')}</p>
                <p className="text-xl font-bold">{stats?.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.in_progress')}</p>
                <p className="text-xl font-bold">{stats?.inProgress || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.earnings')}</p>
                <p className="text-xl font-bold">{stats?.totalEarnings?.toFixed(2) || '0.00'}€</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              value={filters.status}
              onValueChange={(value) => setFilters({...filters, status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('filters.all_status')}</SelectItem>
                <SelectItem value="ACCEPTED">{t('status.accepted')}</SelectItem>
                <SelectItem value="IN_TRANSIT">{t('status.in_transit')}</SelectItem>
                <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
                <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              placeholder={t('filters.start_date')}
            />

            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              placeholder={t('filters.end_date')}
            />
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

      {/* Onglets */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
          <TabsTrigger value="accepted">{t('tabs.accepted')}</TabsTrigger>
          <TabsTrigger value="in_transit">{t('tabs.in_transit')}</TabsTrigger>
          <TabsTrigger value="delivered">{t('tabs.delivered')}</TabsTrigger>
          <TabsTrigger value="cancelled">{t('tabs.cancelled')}</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab}>
          {/* Liste des livraisons */}
          <div className="space-y-4">
            {filteredDeliveries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('no_deliveries')}</p>
                </CardContent>
              </Card>
            ) : (
              filteredDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* En-tête */}
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{delivery.announcement.title}</h3>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(delivery.status)}
                            <Badge className={getStatusColor(delivery.status)}>
                              {t(`status.${delivery.status.toLowerCase()}`)}
                            </Badge>
                          </div>
                        </div>

                        {/* Informations principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{t('pickup')}:</span>
                              <span>{delivery.pickupAddress}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{t('delivery')}:</span>
                              <span>{delivery.deliveryAddress}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{t('scheduled')}:</span>
                              <span>{new Date(delivery.scheduledAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Euro className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{t('earnings')}:</span>
                              <span className="font-semibold text-green-600">
                                {delivery.delivererEarnings.toFixed(2)}€
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Code de validation si nécessaire */}
                        {delivery.status === 'IN_TRANSIT' && delivery.validationCode && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {t('validation_code')}: <strong>{delivery.validationCode}</strong>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailsDialog(delivery)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {t('actions.view')}
                        </Button>

                        {/* Actions selon le statut */}
                        {getNextStatus(delivery.status) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const nextStatus = getNextStatus(delivery.status)
                              if (nextStatus === 'DELIVERED') {
                                openValidationDialog(delivery)
                              } else if (nextStatus) {
                                handleStatusUpdate(delivery.id, nextStatus)
                              }
                            }}
                          >
                            {getNextStatusLabel(delivery.status)}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedDelivery && (
        <>
          <DeliveryValidationDialog
            isOpen={validationDialogOpen}
            onClose={() => {
              setValidationDialogOpen(false)
              setSelectedDelivery(null)
            }}
            delivery={selectedDelivery}
            onSuccess={() => {
              loadDeliveries()
              setValidationDialogOpen(false)
              setSelectedDelivery(null)
            }}
          />

          <DeliveryDetailsDialog
            isOpen={detailsDialogOpen}
            onClose={() => {
              setDetailsDialogOpen(false)
              setSelectedDelivery(null)
            }}
            delivery={selectedDelivery}
          />
        </>
      )}
    </div>
  )
} 