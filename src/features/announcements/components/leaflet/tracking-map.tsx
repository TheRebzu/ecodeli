'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { Icon, LatLng, LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Icônes personnalisées
const createIcon = (color: string, emoji: string) => new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="15" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="16" y="20" text-anchor="middle" font-size="16" fill="white">${emoji}</text>
    </svg>
  `)}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

const pickupIcon = createIcon('#3B82F6', '📦')
const deliveryIcon = createIcon('#EF4444', '🏠')
const delivererIcon = createIcon('#10B981', '🚚')

interface TrackingMapProps {
  announcement: {
    id: string
    title: string
    pickupAddress: string
    deliveryAddress: string
    pickupCoordinates: { lat: number; lng: number }
    deliveryCoordinates: { lat: number; lng: number }
  }
  delivery?: {
    id: string
    status: string
    currentPosition?: { lat: number; lng: number }
    deliverer: {
      name: string
      phone?: string
      avatar?: string
    }
    progress: {
      percentage: number
      currentStep: string
      nextStep?: string
    }
  }
  route?: {
    polyline: [number, number][]
    distance: number
    duration: number
    bounds?: {
      north: number
      south: number
      east: number
      west: number
    }
  }
  realTime?: {
    isLive: boolean
    refreshInterval: number
    estimatedArrival?: string
  }
  onRefresh?: () => void
  className?: string
  height?: string
}

// Composant pour ajuster automatiquement la vue de la carte
const MapBounds: React.FC<{ bounds?: LatLngBounds; route?: [number, number][] }> = ({ 
  bounds, 
  route 
}) => {
  const map = useMap()

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] })
    } else if (route && route.length > 0) {
      const routeBounds = new LatLngBounds(route.map(point => new LatLng(point[0], point[1])))
      map.fitBounds(routeBounds, { padding: [20, 20] })
    }
  }, [map, bounds, route])

  return null
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  announcement,
  delivery,
  route,
  realTime,
  onRefresh,
  className = '',
  height = '500px'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshInterval = useRef<NodeJS.Timeout>()

  // Rafraîchissement automatique si en temps réel
  useEffect(() => {
    if (realTime?.isLive && onRefresh && realTime.refreshInterval > 0) {
      refreshInterval.current = setInterval(() => {
        onRefresh()
      }, realTime.refreshInterval)

      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current)
        }
      }
    }
  }, [realTime, onRefresh])

  // Rafraîchissement manuel
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return

    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Calculer le centre de la carte
  const getMapCenter = (): [number, number] => {
    if (delivery?.currentPosition) {
      return [delivery.currentPosition.lat, delivery.currentPosition.lng]
    }
    
    // Centre entre pickup et delivery
    return [
      (announcement.pickupCoordinates.lat + announcement.deliveryCoordinates.lat) / 2,
      (announcement.pickupCoordinates.lng + announcement.deliveryCoordinates.lng) / 2
    ]
  }

  // Calculer les bounds de la carte
  const getMapBounds = () => {
    if (route?.bounds) {
      return new LatLngBounds(
        [route.bounds.south, route.bounds.west],
        [route.bounds.north, route.bounds.east]
      )
    }

    const points = [
      new LatLng(announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng),
      new LatLng(announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng)
    ]

    if (delivery?.currentPosition) {
      points.push(new LatLng(delivery.currentPosition.lat, delivery.currentPosition.lng))
    }

    return new LatLngBounds(points)
  }

  // Couleur de la route selon le statut
  const getRouteColor = () => {
    if (!delivery) return '#6B7280' // Gris
    
    switch (delivery.status) {
      case 'PENDING':
      case 'ACCEPTED':
        return '#F59E0B' // Orange
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return '#3B82F6' // Bleu
      case 'OUT_FOR_DELIVERY':
        return '#10B981' // Vert
      case 'DELIVERED':
        return '#059669' // Vert foncé
      case 'CANCELLED':
        return '#EF4444' // Rouge
      default:
        return '#6B7280'
    }
  }

  return (
    <div className={`tracking-map ${className}`}>
      {/* En-tête avec informations de livraison */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
            <p className="text-sm text-gray-600">Suivi en temps réel</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <span className={`text-lg ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            Actualiser
          </button>
        </div>

        {/* Barre de progression */}
        {delivery && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{delivery.progress.currentStep}</span>
              <span className="text-gray-500">{delivery.progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${delivery.progress.percentage}%` }}
              />
            </div>
            {delivery.progress.nextStep && (
              <p className="text-xs text-gray-500 mt-1">
                Prochaine étape: {delivery.progress.nextStep}
              </p>
            )}
          </div>
        )}

        {/* Informations livreur */}
        {delivery?.deliverer && (
          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {delivery.deliverer.avatar ? (
                <img src={delivery.deliverer.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                delivery.deliverer.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{delivery.deliverer.name}</p>
              {delivery.deliverer.phone && (
                <p className="text-sm text-gray-600">{delivery.deliverer.phone}</p>
              )}
            </div>
            {realTime?.estimatedArrival && (
              <div className="text-right">
                <p className="text-xs text-gray-500">ETA</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(realTime.estimatedArrival).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Informations de distance */}
      {route && (
        <div className="mb-4 flex gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>📏</span>
            <span>{(route.distance / 1000).toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span>{Math.round(route.duration / 60)} min</span>
          </div>
          {realTime?.isLive && (
            <div className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Temps réel</span>
            </div>
          )}
        </div>
      )}

      {/* Carte Leaflet */}
      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height }}>
        <MapContainer
          center={getMapCenter()}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBounds bounds={getMapBounds()} route={route?.polyline} />

          {/* Route */}
          {route?.polyline && route.polyline.length > 0 && (
            <Polyline
              positions={route.polyline}
              color={getRouteColor()}
              weight={4}
              opacity={0.8}
              dashArray={delivery?.status === 'DELIVERED' ? '10, 10' : undefined}
            />
          )}

          {/* Marqueur point de récupération */}
          <Marker
            position={[announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng]}
            icon={pickupIcon}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-semibold mb-1">📦 Point de récupération</h4>
                <p className="text-sm text-gray-600">{announcement.pickupAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Marqueur point de livraison */}
          <Marker
            position={[announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng]}
            icon={deliveryIcon}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-semibold mb-1">🏠 Point de livraison</h4>
                <p className="text-sm text-gray-600">{announcement.deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Marqueur position actuelle du livreur */}
          {delivery?.currentPosition && (
            <Marker
              position={[delivery.currentPosition.lat, delivery.currentPosition.lng]}
              icon={delivererIcon}
            >
              <Popup>
                <div className="p-2">
                  <h4 className="font-semibold mb-1">🚚 {delivery.deliverer.name}</h4>
                  <p className="text-sm text-gray-600">Position actuelle</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Légende */}
      <div className="mt-3 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span>Récupération</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span>Livraison</span>
        </div>
        {delivery?.currentPosition && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Livreur</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: getRouteColor() }}></div>
          <span>Itinéraire</span>
        </div>
      </div>
    </div>
  )
}

export default TrackingMap