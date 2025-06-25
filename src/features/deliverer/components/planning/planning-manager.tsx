'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus,
  Package,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  Trash2,
  Edit
} from 'lucide-react'
import { useDelivererPlanning } from '../../hooks/useDelivererData'
import { AvailabilityDialog } from './AvailabilityDialog'
import { useTranslations } from 'next-intl'
import type { DelivererAvailability, DelivererDelivery, DelivererRoute } from '../../types'

export function PlanningManager() {
  const { 
    availabilities, 
    scheduledDeliveries, 
    plannedRoutes, 
    loading, 
    error, 
    fetchPlanning, 
    setAvailability, 
    removeAvailability 
  } = useDelivererPlanning()
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState<DelivererAvailability | null>(null)
  const [selectedTab, setSelectedTab] = useState('calendar')
  
  const t = useTranslations('deliverer.planning')

  useEffect(() => {
    loadPlanning()
  }, [selectedDate])

  const loadPlanning = () => {
    const startDate = new Date(selectedDate)
    startDate.setDate(1) // Début du mois
    
    const endDate = new Date(selectedDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0) // Fin du mois
    
    fetchPlanning({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })
  }

  const handleAddAvailability = () => {
    setEditingAvailability(null)
    setAvailabilityDialogOpen(true)
  }

  const handleEditAvailability = (availability: DelivererAvailability) => {
    setEditingAvailability(availability)
    setAvailabilityDialogOpen(true)
  }

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (confirm(t('delete_availability_confirm'))) {
      try {
        await removeAvailability(availabilityId)
        loadPlanning()
      } catch (error) {
        console.error('Error deleting availability:', error)
      }
    }
  }

  const getDateAvailabilities = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availabilities.filter(av => av.date === dateStr)
  }

  const getDateDeliveries = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return scheduledDeliveries.filter(delivery => 
      delivery.scheduledAt.startsWith(dateStr)
    )
  }

  const getDateRoutes = (date: Date) => {
    // Pour simplifier, on considère que les routes récurrentes peuvent s'appliquer
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    return plannedRoutes.filter(route => 
      route.isRecurring && route.recurringDays?.includes(dayOfWeek)
    )
  }

  const hasActivity = (date: Date) => {
    return getDateAvailabilities(date).length > 0 || 
           getDateDeliveries(date).length > 0 || 
           getDateRoutes(date).length > 0
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
        
        <Button onClick={handleAddAvailability}>
          <Plus className="w-4 h-4 mr-2" />
          {t('add_availability')}
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.availabilities')}</p>
                <p className="text-xl font-bold">{availabilities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.scheduled_deliveries')}</p>
                <p className="text-xl font-bold">{scheduledDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.planned_routes')}</p>
                <p className="text-xl font-bold">{plannedRoutes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">{t('stats.busy_days')}</p>
                <p className="text-xl font-bold">
                  {Array.from({length: 30}, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() + i)
                    return hasActivity(date) ? 1 : 0
                  }).reduce((sum, val) => sum + val, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">{t('tabs.calendar')}</TabsTrigger>
          <TabsTrigger value="availabilities">{t('tabs.availabilities')}</TabsTrigger>
          <TabsTrigger value="deliveries">{t('tabs.deliveries')}</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendrier */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{t('calendar.title')}</CardTitle>
                <CardDescription>{t('calendar.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    hasActivity: (date) => hasActivity(date)
                  }}
                  modifiersStyles={{
                    hasActivity: { 
                      backgroundColor: 'rgb(59 130 246)', 
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Détails du jour sélectionné */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedDate.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardTitle>
                <CardDescription>{t('day_details.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Disponibilités du jour */}
                {getDateAvailabilities(selectedDate).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">
                      {t('day_details.availabilities')}
                    </h4>
                    <div className="space-y-2">
                      {getDateAvailabilities(selectedDate).map((availability) => (
                        <div key={availability.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span>{formatTime(availability.startTime)} - {formatTime(availability.endTime)}</span>
                            <Badge variant="secondary">
                              {availability.maxCapacity} {t('capacity')}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditAvailability(availability)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteAvailability(availability.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Livraisons programmées */}
                {getDateDeliveries(selectedDate).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">
                      {t('day_details.scheduled_deliveries')}
                    </h4>
                    <div className="space-y-2">
                      {getDateDeliveries(selectedDate).map((delivery) => (
                        <div key={delivery.id} className="p-3 bg-blue-50 rounded">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">{delivery.announcement.title}</h5>
                            <Badge className="bg-blue-100 text-blue-800">
                              {new Date(delivery.scheduledAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {delivery.pickupAddress} → {delivery.deliveryAddress}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Routes planifiées */}
                {getDateRoutes(selectedDate).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-purple-700 mb-2">
                      {t('day_details.planned_routes')}
                    </h4>
                    <div className="space-y-2">
                      {getDateRoutes(selectedDate).map((route) => (
                        <div key={route.id} className="p-3 bg-purple-50 rounded">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">{route.name}</h5>
                            <Badge className="bg-purple-100 text-purple-800">
                              {formatTime(route.startTime)} - {formatTime(route.endTime)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {route.startLocation} → {route.endLocation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aucune activité */}
                {!hasActivity(selectedDate) && (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">{t('day_details.no_activity')}</p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={handleAddAvailability}
                    >
                      {t('day_details.add_availability')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="availabilities" className="space-y-4">
          {/* Liste des disponibilités */}
          <Card>
            <CardHeader>
              <CardTitle>{t('availabilities.title')}</CardTitle>
              <CardDescription>{t('availabilities.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {availabilities.length > 0 ? (
                <div className="space-y-3">
                  {availabilities.map((availability) => (
                    <div key={availability.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">
                            {new Date(availability.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatTime(availability.startTime)} - {formatTime(availability.endTime)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="secondary">
                            {availability.maxCapacity} {t('capacity')}
                          </Badge>
                          {availability.isRecurring && (
                            <Badge variant="outline">
                              {t('recurring')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditAvailability(availability)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteAvailability(availability.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('availabilities.no_availabilities')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          {/* Livraisons programmées */}
          <Card>
            <CardHeader>
              <CardTitle>{t('scheduled_deliveries.title')}</CardTitle>
              <CardDescription>{t('scheduled_deliveries.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledDeliveries.length > 0 ? (
                <div className="space-y-3">
                  {scheduledDeliveries.map((delivery) => (
                    <div key={delivery.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{delivery.announcement.title}</h4>
                        <Badge>
                          {new Date(delivery.scheduledAt).toLocaleDateString('fr-FR')} - 
                          {new Date(delivery.scheduledAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>{t('pickup')}: {delivery.pickupAddress}</p>
                        <p>{t('delivery')}: {delivery.deliveryAddress}</p>
                        <p>{t('earnings')}: {delivery.delivererEarnings.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('scheduled_deliveries.no_deliveries')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de disponibilité */}
      <AvailabilityDialog
        isOpen={availabilityDialogOpen}
        onClose={() => {
          setAvailabilityDialogOpen(false)
          setEditingAvailability(null)
        }}
        availability={editingAvailability}
        selectedDate={selectedDate}
        onSuccess={() => {
          loadPlanning()
          setAvailabilityDialogOpen(false)
          setEditingAvailability(null)
        }}
      />
    </div>
  )
} 