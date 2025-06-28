import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const geocodingRequestSchema = z.object({
  address: z.string().min(5, 'Adresse trop courte'),
  country: z.string().length(2).optional().default('FR'),
  format: z.enum(['json', 'geojson']).optional().default('json')
})

const reverseGeocodingRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  language: z.enum(['fr', 'en']).optional().default('fr')
})

const batchGeocodingRequestSchema = z.object({
  addresses: z.array(z.string()).min(1).max(100),
  country: z.string().length(2).optional().default('FR')
})

interface GeocodingResult {
  address: string
  latitude: number
  longitude: number
  confidence: number
  components: {
    streetNumber?: string
    streetName?: string
    city?: string
    postalCode?: string
    department?: string
    region?: string
    country?: string
  }
  boundingBox?: {
    northEast: { lat: number; lng: number }
    southWest: { lat: number; lng: number }
  }
}

class GeocodingService {
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

  async geocodeAddress(address: string, country: string = 'FR'): Promise<GeocodingResult[]> {
    try {
      if (this.GOOGLE_MAPS_API_KEY) {
        return await this.geocodeWithGoogle(address, country)
      } else {
        return await this.geocodeWithNominatim(address, country)
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      throw new Error('Erreur lors du g�ocodage')
    }
  }

  async reverseGeocode(latitude: number, longitude: number, language: string = 'fr'): Promise<GeocodingResult> {
    try {
      if (this.GOOGLE_MAPS_API_KEY) {
        return await this.reverseGeocodeWithGoogle(latitude, longitude, language)
      } else {
        return await this.reverseGeocodeWithNominatim(latitude, longitude, language)
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      throw new Error('Erreur lors du g�ocodage invers�')
    }
  }

  private async geocodeWithGoogle(address: string, country: string): Promise<GeocodingResult[]> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.append('address', address)
    url.searchParams.append('region', country.toLowerCase())
    url.searchParams.append('key', this.GOOGLE_MAPS_API_KEY!)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Geocoding API error: ${data.status}`)
    }

    return data.results.map((result: any) => ({
      address: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      confidence: this.calculateGoogleConfidence(result),
      components: this.parseGoogleComponents(result.address_components),
      boundingBox: result.geometry.bounds ? {
        northEast: {
          lat: result.geometry.bounds.northeast.lat,
          lng: result.geometry.bounds.northeast.lng
        },
        southWest: {
          lat: result.geometry.bounds.southwest.lat,
          lng: result.geometry.bounds.southwest.lng
        }
      } : undefined
    }))
  }

  private async geocodeWithNominatim(address: string, country: string): Promise<GeocodingResult[]> {
    const url = new URL(`${this.NOMINATIM_BASE_URL}/search`)
    url.searchParams.append('q', address)
    url.searchParams.append('format', 'json')
    url.searchParams.append('addressdetails', '1')
    url.searchParams.append('limit', '5')
    url.searchParams.append('countrycodes', country.toLowerCase())

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'EcoDeli-App/1.0 (contact@ecodeli.com)'
      }
    })

    const data = await response.json()

    return data.map((result: any) => ({
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      confidence: parseFloat(result.importance) || 0.5,
      components: this.parseNominatimComponents(result.address),
      boundingBox: result.boundingbox ? {
        northEast: {
          lat: parseFloat(result.boundingbox[1]),
          lng: parseFloat(result.boundingbox[3])
        },
        southWest: {
          lat: parseFloat(result.boundingbox[0]),
          lng: parseFloat(result.boundingbox[2])
        }
      } : undefined
    }))
  }

  private async reverseGeocodeWithGoogle(lat: number, lng: number, language: string): Promise<GeocodingResult> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.append('latlng', `${lat},${lng}`)
    url.searchParams.append('language', language)
    url.searchParams.append('key', this.GOOGLE_MAPS_API_KEY!)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error(`Google Reverse Geocoding API error: ${data.status}`)
    }

    const result = data.results[0]
    return {
      address: result.formatted_address,
      latitude: lat,
      longitude: lng,
      confidence: this.calculateGoogleConfidence(result),
      components: this.parseGoogleComponents(result.address_components)
    }
  }

  private async reverseGeocodeWithNominatim(lat: number, lng: number, language: string): Promise<GeocodingResult> {
    const url = new URL(`${this.NOMINATIM_BASE_URL}/reverse`)
    url.searchParams.append('lat', lat.toString())
    url.searchParams.append('lon', lng.toString())
    url.searchParams.append('format', 'json')
    url.searchParams.append('addressdetails', '1')
    url.searchParams.append('accept-language', language)

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'EcoDeli-App/1.0 (contact@ecodeli.com)'
      }
    })

    const data = await response.json()

    if (!data.display_name) {
      throw new Error('Aucune adresse trouv�e pour ces coordonn�es')
    }

    return {
      address: data.display_name,
      latitude: lat,
      longitude: lng,
      confidence: parseFloat(data.importance) || 0.5,
      components: this.parseNominatimComponents(data.address)
    }
  }

  private calculateGoogleConfidence(result: any): number {
    const typeConfidence = {
      'street_address': 0.9,
      'route': 0.8,
      'intersection': 0.7,
      'political': 0.6,
      'locality': 0.5,
      'sublocality': 0.4,
      'approximate': 0.3
    }

    for (const type of result.types) {
      if (typeConfidence[type as keyof typeof typeConfidence]) {
        return typeConfidence[type as keyof typeof typeConfidence]
      }
    }

    return 0.5
  }

  private parseGoogleComponents(components: any[]): GeocodingResult['components'] {
    const parsed: GeocodingResult['components'] = {}

    for (const component of components) {
      const types = component.types

      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name
      } else if (types.includes('route')) {
        parsed.streetName = component.long_name
      } else if (types.includes('locality')) {
        parsed.city = component.long_name
      } else if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name
      } else if (types.includes('administrative_area_level_2')) {
        parsed.department = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        parsed.region = component.long_name
      } else if (types.includes('country')) {
        parsed.country = component.short_name
      }
    }

    return parsed
  }

  private parseNominatimComponents(address: any): GeocodingResult['components'] {
    return {
      streetNumber: address.house_number,
      streetName: address.road,
      city: address.city || address.town || address.village,
      postalCode: address.postcode,
      department: address.county,
      region: address.state,
      country: address.country_code?.toUpperCase()
    }
  }
}

const geocodingService = new GeocodingService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'geocode': {
        const validated = geocodingRequestSchema.parse(body)
        const results = await geocodingService.geocodeAddress(validated.address, validated.country)
        
        return NextResponse.json({
          success: true,
          data: results,
          count: results.length
        })
      }

      case 'reverse': {
        const validated = reverseGeocodingRequestSchema.parse(body)
        const result = await geocodingService.reverseGeocode(
          validated.latitude, 
          validated.longitude, 
          validated.language
        )
        
        return NextResponse.json({
          success: true,
          data: result
        })
      }

      case 'batch': {
        const validated = batchGeocodingRequestSchema.parse(body)
        const results = await Promise.all(
          validated.addresses.map(async (address) => {
            try {
              const geocoded = await geocodingService.geocodeAddress(address, validated.country)
              return {
                address,
                success: true,
                results: geocoded
              }
            } catch (error) {
              return {
                address,
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue'
              }
            }
          })
        )

        const successCount = results.filter(r => r.success).length
        
        return NextResponse.json({
          success: true,
          data: results,
          summary: {
            total: validated.addresses.length,
            successful: successCount,
            failed: validated.addresses.length - successCount
          }
        })
      }

      default:
        return NextResponse.json(
          { error: 'Action non support�e. Actions disponibles: geocode, reverse, batch' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Geocoding API error:', error)
    
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
    service: 'EcoDeli Geocoding API',
    version: '1.0',
    endpoints: {
      'POST /': {
        description: 'Service de g�ocodage principal',
        actions: {
          geocode: {
            description: 'Convertir une adresse en coordonn�es',
            parameters: ['address', 'country?', 'format?']
          },
          reverse: {
            description: 'Convertir des coordonn�es en adresse',
            parameters: ['latitude', 'longitude', 'language?']
          },
          batch: {
            description: 'G�ocoder plusieurs adresses en une fois',
            parameters: ['addresses[]', 'country?']
          }
        }
      },
      'GET /distance': 'Calcul de distances entre points',
      'GET /zones': 'Gestion des zones g�ographiques'
    },
    providers: ['Google Maps API', 'OpenStreetMap Nominatim'],
    rateLimit: 'Respecter les limites des APIs tierces'
  })
}