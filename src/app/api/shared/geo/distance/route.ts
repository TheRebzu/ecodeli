import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const distanceRequestSchema = z.object({
  origins: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().optional()
  })).min(1).max(25),
  destinations: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().optional()
  })).min(1).max(25),
  mode: z.enum(['driving', 'walking', 'bicycling', 'transit']).optional().default('driving'),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
  language: z.enum(['fr', 'en']).optional().default('fr'),
  avoidTolls: z.boolean().optional().default(false),
  avoidHighways: z.boolean().optional().default(false)
})

const routeOptimizationSchema = z.object({
  depot: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional()
  }),
  waypoints: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    priority: z.number().min(1).max(5).optional().default(3),
    timeWindow: z.object({
      start: z.string(),
      end: z.string()
    }).optional()
  })).min(1).max(20),
  vehicleCapacity: z.number().optional(),
  maxDistance: z.number().optional(),
  optimize: z.enum(['distance', 'time', 'fuel']).optional().default('distance')
})

interface DistanceResult {
  origin: {
    latitude: number
    longitude: number
    name?: string
  }
  destination: {
    latitude: number
    longitude: number
    name?: string
  }
  distance: {
    text: string
    value: number // en m�tres
  }
  duration: {
    text: string
    value: number // en secondes
  }
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_WAYPOINTS_EXCEEDED' | 'INVALID_REQUEST'
}

interface OptimizedRoute {
  orderedWaypoints: Array<{
    originalIndex: number
    waypoint: any
    arrivalTime?: string
    departureTime?: string
  }>
  totalDistance: number
  totalDuration: number
  estimatedFuel: number
  summary: {
    totalStops: number
    efficencyScore: number
    costSaving: number
  }
}

class DistanceService {
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

  async calculateDistanceMatrix(
    origins: Array<{latitude: number, longitude: number, name?: string}>,
    destinations: Array<{latitude: number, longitude: number, name?: string}>,
    mode: string = 'driving',
    units: string = 'metric',
    language: string = 'fr',
    avoidTolls: boolean = false,
    avoidHighways: boolean = false
  ): Promise<DistanceResult[]> {
    try {
      if (this.GOOGLE_MAPS_API_KEY) {
        return await this.calculateWithGoogle(origins, destinations, mode, units, language, avoidTolls, avoidHighways)
      } else {
        return await this.calculateWithHaversine(origins, destinations)
      }
    } catch (error) {
      console.error('Distance calculation error:', error)
      throw new Error('Erreur lors du calcul de distance')
    }
  }

  async optimizeRoute(
    depot: {latitude: number, longitude: number, name?: string},
    waypoints: Array<any>,
    options: any = {}
  ): Promise<OptimizedRoute> {
    try {
      if (this.GOOGLE_MAPS_API_KEY && waypoints.length <= 8) {
        return await this.optimizeWithGoogle(depot, waypoints, options)
      } else {
        return await this.optimizeWithHeuristic(depot, waypoints, options)
      }
    } catch (error) {
      console.error('Route optimization error:', error)
      throw new Error('Erreur lors de l\'optimisation de route')
    }
  }

  private async calculateWithGoogle(
    origins: Array<{latitude: number, longitude: number, name?: string}>,
    destinations: Array<{latitude: number, longitude: number, name?: string}>,
    mode: string,
    units: string,
    language: string,
    avoidTolls: boolean,
    avoidHighways: boolean
  ): Promise<DistanceResult[]> {
    const originCoords = origins.map(o => `${o.latitude},${o.longitude}`).join('|')
    const destCoords = destinations.map(d => `${d.latitude},${d.longitude}`).join('|')

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.append('origins', originCoords)
    url.searchParams.append('destinations', destCoords)
    url.searchParams.append('mode', mode)
    url.searchParams.append('units', units)
    url.searchParams.append('language', language)
    url.searchParams.append('key', this.GOOGLE_MAPS_API_KEY!)
    
    if (avoidTolls) url.searchParams.append('avoid', 'tolls')
    if (avoidHighways) url.searchParams.append('avoid', 'highways')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Distance Matrix API error: ${data.status}`)
    }

    const results: DistanceResult[] = []
    
    for (let i = 0; i < origins.length; i++) {
      for (let j = 0; j < destinations.length; j++) {
        const element = data.rows[i].elements[j]
        
        results.push({
          origin: origins[i],
          destination: destinations[j],
          distance: element.distance || { text: 'N/A', value: 0 },
          duration: element.duration || { text: 'N/A', value: 0 },
          status: element.status || 'NOT_FOUND'
        })
      }
    }

    return results
  }

  private async calculateWithHaversine(
    origins: Array<{latitude: number, longitude: number, name?: string}>,
    destinations: Array<{latitude: number, longitude: number, name?: string}>
  ): Promise<DistanceResult[]> {
    const results: DistanceResult[] = []

    for (const origin of origins) {
      for (const destination of destinations) {
        const distance = this.haversineDistance(
          origin.latitude, origin.longitude,
          destination.latitude, destination.longitude
        )

        // Estimation dur�e bas�e sur vitesse moyenne 50 km/h
        const duration = (distance / 1000) * 60 * 60 / 50

        results.push({
          origin,
          destination,
          distance: {
            text: `${(distance / 1000).toFixed(1)} km`,
            value: Math.round(distance)
          },
          duration: {
            text: `${Math.round(duration / 60)} min`,
            value: Math.round(duration)
          },
          status: 'OK'
        })
      }
    }

    return results
  }

  private async optimizeWithGoogle(
    depot: any,
    waypoints: Array<any>,
    options: any
  ): Promise<OptimizedRoute> {
    const waypointsCoords = waypoints.map(w => `${w.latitude},${w.longitude}`).join('|')
    
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
    url.searchParams.append('origin', `${depot.latitude},${depot.longitude}`)
    url.searchParams.append('destination', `${depot.latitude},${depot.longitude}`)
    url.searchParams.append('waypoints', `optimize:true|${waypointsCoords}`)
    url.searchParams.append('mode', 'driving')
    url.searchParams.append('key', this.GOOGLE_MAPS_API_KEY!)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Directions API error: ${data.status}`)
    }

    const route = data.routes[0]
    const waypointOrder = route.waypoint_order

    const orderedWaypoints = waypointOrder.map((index: number, i: number) => ({
      originalIndex: index,
      waypoint: waypoints[index],
      arrivalTime: this.estimateArrivalTime(route.legs, i),
      departureTime: this.estimateDepartureTime(route.legs, i)
    }))

    const totalDistance = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0)
    const totalDuration = route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0)

    return {
      orderedWaypoints,
      totalDistance,
      totalDuration,
      estimatedFuel: this.calculateFuelConsumption(totalDistance),
      summary: {
        totalStops: waypoints.length,
        efficencyScore: this.calculateEfficiencyScore(waypoints.length, totalDistance),
        costSaving: this.calculateCostSaving(waypoints.length, totalDistance)
      }
    }
  }

  private async optimizeWithHeuristic(
    depot: any,
    waypoints: Array<any>,
    options: any
  ): Promise<OptimizedRoute> {
    // Algorithme du plus proche voisin simple
    const unvisited = [...waypoints]
    const orderedWaypoints: Array<any> = []
    let currentPosition = depot

    while (unvisited.length > 0) {
      let nearestIndex = 0
      let nearestDistance = Number.MAX_VALUE

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.haversineDistance(
          currentPosition.latitude, currentPosition.longitude,
          unvisited[i].latitude, unvisited[i].longitude
        )

        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = i
        }
      }

      const nearestWaypoint = unvisited.splice(nearestIndex, 1)[0]
      orderedWaypoints.push({
        originalIndex: waypoints.indexOf(nearestWaypoint),
        waypoint: nearestWaypoint
      })
      
      currentPosition = nearestWaypoint
    }

    // Calculer distance totale
    let totalDistance = 0
    let currentPos = depot

    for (const stop of orderedWaypoints) {
      totalDistance += this.haversineDistance(
        currentPos.latitude, currentPos.longitude,
        stop.waypoint.latitude, stop.waypoint.longitude
      )
      currentPos = stop.waypoint
    }

    // Retour au d�p�t
    totalDistance += this.haversineDistance(
      currentPos.latitude, currentPos.longitude,
      depot.latitude, depot.longitude
    )

    const totalDuration = (totalDistance / 1000) * 60 * 60 / 50 // 50 km/h moyenne

    return {
      orderedWaypoints,
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.round(totalDuration),
      estimatedFuel: this.calculateFuelConsumption(totalDistance),
      summary: {
        totalStops: waypoints.length,
        efficencyScore: this.calculateEfficiencyScore(waypoints.length, totalDistance),
        costSaving: this.calculateCostSaving(waypoints.length, totalDistance)
      }
    }
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000 // Rayon de la Terre en m�tres
    const �1 = lat1 * Math.PI/180
    const �2 = lat2 * Math.PI/180
    const �� = (lat2-lat1) * Math.PI/180
    const �� = (lon2-lon1) * Math.PI/180

    const a = Math.sin(��/2) * Math.sin(��/2) +
              Math.cos(�1) * Math.cos(�2) *
              Math.sin(��/2) * Math.sin(��/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  private estimateArrivalTime(legs: any[], index: number): string {
    // Simulation - dans une vraie impl�mentation, utiliser les donn�es Google
    const now = new Date()
    now.setMinutes(now.getMinutes() + index * 30)
    return now.toISOString()
  }

  private estimateDepartureTime(legs: any[], index: number): string {
    const now = new Date()
    now.setMinutes(now.getMinutes() + index * 30 + 15) // 15 min d'arr�t
    return now.toISOString()
  }

  private calculateFuelConsumption(distance: number): number {
    // 7L/100km en moyenne
    return (distance / 1000) * 0.07
  }

  private calculateEfficiencyScore(stops: number, distance: number): number {
    // Score bas� sur distance/arr�t
    const avgDistancePerStop = distance / stops
    return Math.min(100, Math.max(0, 100 - (avgDistancePerStop - 5000) / 100))
  }

  private calculateCostSaving(stops: number, distance: number): number {
    // Estimation �conomies vs trajets individuels
    const individualDistance = stops * 15000 // 15km par trajet moyen
    const saving = Math.max(0, individualDistance - distance)
    return (saving / 1000) * 0.50 // 0.50�/km �conomis�
  }
}

const distanceService = new DistanceService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'matrix': {
        const validated = distanceRequestSchema.parse(body)
        const results = await distanceService.calculateDistanceMatrix(
          validated.origins,
          validated.destinations,
          validated.mode,
          validated.units,
          validated.language,
          validated.avoidTolls,
          validated.avoidHighways
        )
        
        return NextResponse.json({
          success: true,
          data: results,
          count: results.length
        })
      }

      case 'optimize': {
        const validated = routeOptimizationSchema.parse(body)
        const optimizedRoute = await distanceService.optimizeRoute(
          validated.depot,
          validated.waypoints,
          {
            vehicleCapacity: validated.vehicleCapacity,
            maxDistance: validated.maxDistance,
            optimize: validated.optimize
          }
        )
        
        return NextResponse.json({
          success: true,
          data: optimizedRoute
        })
      }

      default:
        return NextResponse.json(
          { error: 'Action non support�e. Actions disponibles: matrix, optimize' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Distance API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Donn�es invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'EcoDeli Distance API',
    version: '1.0',
    actions: {
      matrix: {
        description: 'Calculer les distances entre plusieurs origines et destinations',
        parameters: ['origins[]', 'destinations[]', 'mode?', 'units?', 'language?', 'avoidTolls?', 'avoidHighways?']
      },
      optimize: {
        description: 'Optimiser un itin�raire avec multiple arr�ts',
        parameters: ['depot', 'waypoints[]', 'vehicleCapacity?', 'maxDistance?', 'optimize?']
      }
    },
    modes: ['driving', 'walking', 'bicycling', 'transit'],
    units: ['metric', 'imperial'],
    providers: ['Google Maps API', 'Haversine (fallback)'],
    limits: {
      origins: 25,
      destinations: 25,
      waypoints: 20
    }
  })
}