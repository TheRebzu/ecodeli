'use client'

import { useEffect, useState } from 'react'
import { LeafletMap, MapMarker, MapRoute } from './leaflet-map'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

interface DeliveryZone {
  id: string
  name: string
  center: {
    latitude: number
    longitude: number
  }
  radius: number
  color: string
  stats: {
    activeDeliveries: number
    completedToday: number
    averageDeliveryTime: number
    successRate: number
  }
}

interface LiveDelivery {
  id: string
  delivererName: string
  status: string
  currentLocation: {
    latitude: number
    longitude: number
  }
  pickupLocation: {
    latitude: number
    longitude: number
    address: string
  }
  deliveryLocation: {
    latitude: number
    longitude: number
    address: string
  }
  estimatedDeliveryTime?: string
  routePolyline?: [number, number][]
}

interface DeliveryZonesMapProps {
  refreshInterval?: number
  showZoneStats?: boolean
  showLiveDeliveries?: boolean
}

export function DeliveryZonesMap({
  refreshInterval = 30000,
  showZoneStats = true,
  showLiveDeliveries = true
}: DeliveryZonesMapProps) {
  const { get } = useApi()
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [liveDeliveries, setLiveDeliveries] = useState<LiveDelivery[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchZonesData = async () => {
    try {
      const response = await get('/api/admin/delivery-zones')
      if (response.data) {
        setZones(response.data.zones || [])
      }
    } catch (err) {
      setError('Impossible de charger les zones de livraison')
      console.error('Zones error:', err)
    }
  }

  const fetchLiveDeliveries = async () => {
    if (!showLiveDeliveries) return
    
    try {
      const response = await get('/api/admin/deliveries/live')
      if (response.data) {
        setLiveDeliveries(response.data.deliveries || [])
      }
    } catch (err) {
      console.error('Live deliveries error:', err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([
        fetchZonesData(),
        fetchLiveDeliveries()
      ])
      setLoading(false)
    }

    fetchData()

    // Set up refresh interval
    const interval = setInterval(() => {
      fetchLiveDeliveries()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, showLiveDeliveries])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare markers for deliveries
  const deliveryMarkers: MapMarker[] = liveDeliveries.map(delivery => ({
    id: delivery.id,
    position: [delivery.currentLocation.latitude, delivery.currentLocation.longitude],
    type: 'deliverer',
    label: delivery.delivererName,
    popup: `
      <div>
        <strong>${delivery.delivererName}</strong><br/>
        Statut: ${formatDeliveryStatus(delivery.status)}<br/>
        ${delivery.estimatedDeliveryTime 
          ? `ETA: ${new Date(delivery.estimatedDeliveryTime).toLocaleTimeString('fr-FR')}`
          : ''
        }
      </div>
    `
  }))

  // Add pickup and delivery points
  liveDeliveries.forEach(delivery => {
    deliveryMarkers.push(
      {
        id: `${delivery.id}-pickup`,
        position: [delivery.pickupLocation.latitude, delivery.pickupLocation.longitude],
        type: 'pickup',
        label: 'Enlèvement',
        popup: `
          <div>
            <strong>Point d'enlèvement</strong><br/>
            ${delivery.pickupLocation.address}
          </div>
        `
      },
      {
        id: `${delivery.id}-delivery`,
        position: [delivery.deliveryLocation.latitude, delivery.deliveryLocation.longitude],
        type: 'delivery',
        label: 'Livraison',
        popup: `
          <div>
            <strong>Point de livraison</strong><br/>
            ${delivery.deliveryLocation.address}
          </div>
        `
      }
    )
  })

  // Add zone center markers
  const zoneMarkers: MapMarker[] = zones.map(zone => ({
    id: `zone-${zone.id}`,
    position: [zone.center.latitude, zone.center.longitude],
    type: 'warehouse',
    label: zone.name,
    popup: `
      <div>
        <strong>${zone.name}</strong><br/>
        Livraisons actives: ${zone.stats.activeDeliveries}<br/>
        Taux de réussite: ${zone.stats.successRate}%
      </div>
    `
  }))

  const allMarkers = [...deliveryMarkers, ...zoneMarkers]

  // Prepare routes for active deliveries
  const routes: MapRoute[] = liveDeliveries
    .filter(delivery => delivery.routePolyline)
    .map(delivery => ({
      id: `route-${delivery.id}`,
      points: delivery.routePolyline!,
      color: getDeliveryStatusColor(delivery.status),
      weight: 3,
      opacity: 0.7
    }))

  const selectedZoneData = selectedZone ? zones.find(z => z.id === selectedZone) : null

  return (
    <div className="space-y-4">
      {/* Zone Statistics */}
      {showZoneStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {zones.map((zone) => (
            <Card 
              key={zone.id}
              className={`cursor-pointer transition-colors ${
                selectedZone === zone.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{zone.name}</h4>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Actives:</span>
                    <Badge variant="secondary">{zone.stats.activeDeliveries}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Aujourd'hui:</span>
                    <span>{zone.stats.completedToday}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Taux réussite:</span>
                    <div className="flex items-center gap-1">
                      <span>{zone.stats.successRate}%</span>
                      {zone.stats.successRate >= 90 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoring des livraisons en temps réel
            </div>
            <Badge variant="outline">
              {liveDeliveries.length} livraison{liveDeliveries.length !== 1 ? 's' : ''} active{liveDeliveries.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LeafletMap
            center={
              selectedZoneData 
                ? [selectedZoneData.center.latitude, selectedZoneData.center.longitude]
                : [48.8566, 2.3522]
            }
            zoom={selectedZoneData ? 14 : 11}
            height="600px"
            markers={allMarkers}
            routes={routes}
            enableGeolocation={false}
          />
        </CardContent>
      </Card>

      {/* Live Deliveries List */}
      {showLiveDeliveries && liveDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Livraisons en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{delivery.delivererName}</span>
                      <Badge variant={getDeliveryStatusVariant(delivery.status)}>
                        {formatDeliveryStatus(delivery.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {delivery.pickupLocation.address} → {delivery.deliveryLocation.address}
                    </p>
                    {delivery.estimatedDeliveryTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ETA: {new Date(delivery.estimatedDeliveryTime).toLocaleTimeString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    Suivre
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatDeliveryStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'En attente',
    ACCEPTED: 'Acceptée',
    PICKING_UP: 'Enlèvement',
    IN_TRANSIT: 'En transit',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée',
    FAILED: 'Échec'
  }
  return statusMap[status] || status
}

function getDeliveryStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: '#6B7280',
    ACCEPTED: '#3B82F6',
    PICKING_UP: '#F59E0B',
    IN_TRANSIT: '#8B5CF6',
    DELIVERED: '#10B981',
    CANCELLED: '#EF4444',
    FAILED: '#DC2626'
  }
  return colors[status] || '#6B7280'
}

function getDeliveryStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'DELIVERED':
      return 'default'
    case 'CANCELLED':
    case 'FAILED':
      return 'destructive'
    case 'IN_TRANSIT':
    case 'PICKING_UP':
      return 'secondary'
    default:
      return 'outline'
  }
}