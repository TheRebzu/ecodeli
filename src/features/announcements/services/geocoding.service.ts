import { logger } from '@/lib/logger'

export interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
  city: string
  postalCode: string
  country: string
}

export interface RouteResult {
  distance: number // en kilomètres
  duration: number // en secondes
  polyline: Array<[number, number]> // Points pour afficher le trajet
}

export interface DistanceCalculationResult {
  distance: number // en kilomètres
  duration: number // en minutes
  route?: Array<[number, number]>
}

/**
 * Service de géocodage et calcul de routes pour EcoDeli
 * Utilise l'API Nominatim d'OpenStreetMap (gratuite) et OSRM pour le routing
 */
export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
  private static readonly OSRM_BASE_URL = 'https://router.project-osrm.org'
  private static readonly REQUEST_DELAY = 1100 // Respecter la limite de 1 req/sec de Nominatim

  private static lastRequestTime = 0

  /**
   * Géocode une adresse pour obtenir les coordonnées GPS
   */
  static async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      // Respecter la limite de débit de Nominatim
      await this.respectRateLimit()

      const encodedAddress = encodeURIComponent(address)
      const url = `${this.NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=1&q=${encodedAddress}`

      logger.info(`Géocodage de l'adresse: ${address}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EcoDeli/1.0 (contact@ecodeli.fr)'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data || data.length === 0) {
        logger.warn(`Aucun résultat pour l'adresse: ${address}`)
        return null
      }

      const result = data[0]
      const addressDetails = result.address

      const geocodingResult: GeocodingResult = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
        city: addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.municipality || 'Ville inconnue',
        postalCode: addressDetails.postcode || '',
        country: addressDetails.country_code?.toUpperCase() || 'FR'
      }

      logger.info(`Géocodage réussi: ${geocodingResult.city} (${geocodingResult.lat}, ${geocodingResult.lng})`)

      return geocodingResult

    } catch (error) {
      logger.error(`Erreur géocodage pour "${address}":`, error)
      return null
    }
  }

  /**
   * Reverse geocoding : obtenir l'adresse depuis des coordonnées
   */
  static async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
    try {
      await this.respectRateLimit()

      const url = `${this.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`

      logger.info(`Reverse géocodage: ${lat}, ${lng}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EcoDeli/1.0 (contact@ecodeli.fr)'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result || result.error) {
        logger.warn(`Aucun résultat pour les coordonnées: ${lat}, ${lng}`)
        return null
      }

      const addressDetails = result.address

      const geocodingResult: GeocodingResult = {
        lat,
        lng,
        formattedAddress: result.display_name,
        city: addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.municipality || 'Ville inconnue',
        postalCode: addressDetails.postcode || '',
        country: addressDetails.country_code?.toUpperCase() || 'FR'
      }

      return geocodingResult

    } catch (error) {
      logger.error(`Erreur reverse géocodage pour ${lat}, ${lng}:`, error)
      return null
    }
  }

  /**
   * Calcule la distance et la durée entre deux points avec route réelle
   */
  static async calculateRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<RouteResult | null> {
    try {
      const url = `${this.OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

      logger.info(`Calcul de route: (${startLat}, ${startLng}) → (${endLat}, ${endLng})`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.routes || data.routes.length === 0) {
        logger.warn(`Aucune route trouvée entre les points`)
        return null
      }

      const route = data.routes[0]
      const coordinates = route.geometry.coordinates

      // Convertir les coordonnées [lng, lat] en [lat, lng] pour Leaflet
      const polyline = coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number])

      const routeResult: RouteResult = {
        distance: route.distance / 1000, // Convertir en kilomètres
        duration: route.duration, // en secondes
        polyline
      }

      logger.info(`Route calculée: ${routeResult.distance.toFixed(2)}km, ${Math.round(routeResult.duration / 60)}min`)

      return routeResult

    } catch (error) {
      logger.error(`Erreur calcul de route:`, error)
      // Fallback sur le calcul de distance à vol d'oiseau
      const distance = this.calculateDistanceHaversine(startLat, startLng, endLat, endLng)
      return {
        distance,
        duration: distance * 60, // Estimation : 1km = 1 minute
        polyline: [[startLat, startLng], [endLat, endLng]]
      }
    }
  }

  /**
   * Calcule la distance à vol d'oiseau entre deux points (formule de Haversine)
   */
  static calculateDistanceHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Rayon de la Terre en kilomètres
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Suggestion d'adresses basée sur une saisie partielle
   */
  static async suggestAddresses(query: string, limit: number = 5): Promise<GeocodingResult[]> {
    try {
      if (query.length < 3) {
        return []
      }

      await this.respectRateLimit()

      const encodedQuery = encodeURIComponent(query)
      const url = `${this.NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=${limit}&q=${encodedQuery}&countrycodes=fr`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EcoDeli/1.0 (contact@ecodeli.fr)'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      const data = await response.json()

      const suggestions: GeocodingResult[] = data.map((result: any) => {
        const addressDetails = result.address
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name,
          city: addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.municipality || 'Ville inconnue',
          postalCode: addressDetails.postcode || '',
          country: addressDetails.country_code?.toUpperCase() || 'FR'
        }
      })

      return suggestions

    } catch (error) {
      logger.error(`Erreur suggestions d'adresses pour "${query}":`, error)
      return []
    }
  }

  /**
   * Valide qu'une adresse est en France et dans une zone de service
   */
  static async validateServiceArea(address: string): Promise<boolean> {
    try {
      const result = await this.geocodeAddress(address)
      
      if (!result) {
        return false
      }

      // Vérifier que c'est en France
      if (result.country !== 'FR') {
        return false
      }

      // Zones de service EcoDeli (selon le cahier des charges)
      const serviceCities = [
        'paris', 'marseille', 'lyon', 'lille', 'montpellier', 'rennes',
        'toulouse', 'nice', 'nantes', 'strasbourg', 'bordeaux'
      ]

      const cityLower = result.city.toLowerCase()
      const isInServiceArea = serviceCities.some(city => cityLower.includes(city))

      if (!isInServiceArea) {
        logger.warn(`Adresse hors zone de service: ${result.city}`)
      }

      return isInServiceArea

    } catch (error) {
      logger.error(`Erreur validation zone de service:`, error)
      return false
    }
  }

  /**
   * Calcule le tarif basé sur la distance réelle
   */
  static calculateDistanceBasedPrice(distance: number, basePrice: number = 5): number {
    // Tarification EcoDeli selon le cahier des charges
    // Prix de base : 5€
    // Prix par km : 1.50€ 
    // Prix minimum : 8€
    // Prix maximum : 200€

    const pricePerKm = 1.50
    const minPrice = 8
    const maxPrice = 200

    let totalPrice = basePrice + (distance * pricePerKm)
    
    // Appliquer les limites
    totalPrice = Math.max(totalPrice, minPrice)
    totalPrice = Math.min(totalPrice, maxPrice)

    return Math.round(totalPrice * 100) / 100 // Arrondir à 2 décimales
  }

  /**
   * Respecter la limite de débit de Nominatim (1 requête par seconde)
   */
  private static async respectRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const waitTime = this.REQUEST_DELAY - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Cache simple en mémoire pour éviter les requêtes répétées
   */
  private static geocodingCache = new Map<string, GeocodingResult>()
  private static cacheTimeout = 24 * 60 * 60 * 1000 // 24 heures

  static async geocodeAddressWithCache(address: string): Promise<GeocodingResult | null> {
    const cacheKey = address.toLowerCase().trim()
    
    // Vérifier le cache
    const cached = this.geocodingCache.get(cacheKey)
    if (cached) {
      logger.info(`Géocodage depuis le cache: ${address}`)
      return cached
    }

    // Géocoder et mettre en cache
    const result = await this.geocodeAddress(address)
    if (result) {
      this.geocodingCache.set(cacheKey, result)
      
      // Nettoyer le cache après expiration
      setTimeout(() => {
        this.geocodingCache.delete(cacheKey)
      }, this.cacheTimeout)
    }

    return result
  }

  /**
   * Efface le cache de géocodage
   */
  static clearCache(): void {
    this.geocodingCache.clear()
  }
}

// Export du service
export const geocodingService = GeocodingService
export default GeocodingService