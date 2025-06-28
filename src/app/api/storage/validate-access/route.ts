import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { StorageBoxService } from '@/features/storage/services/storage-box.service'

const validateAccessSchema = z.object({
  accessCode: z.string().min(1),
  boxId: z.string().cuid(),
  deviceId: z.string().optional()
})

/**
 * POST - Valider un code d'accès QR pour ouvrir un box
 * Cette API est utilisée par les dispositifs IoT des box
 */
export async function POST(request: NextRequest) {
  try {
    // Vérification de l'API key pour les dispositifs IoT
    const apiKey = request.headers.get('X-API-Key')
    
    if (!apiKey || apiKey !== process.env.STORAGE_DEVICE_API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = validateAccessSchema.parse(body)

    const validation = await StorageBoxService.validateAccessCode(
      validatedData.accessCode,
      validatedData.boxId
    )

    if (validation.valid) {
      return NextResponse.json({
        success: true,
        access: 'granted',
        message: validation.message,
        rental: {
          id: validation.rental?.id,
          clientName: validation.rental?.client.user.profile?.firstName + ' ' + validation.rental?.client.user.profile?.lastName,
          startDate: validation.rental?.startDate,
          endDate: validation.rental?.endDate
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        access: 'denied',
        message: validation.message
      }, { status: 403 })
    }

  } catch (error) {
    console.error('Error validating access code:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid data format',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        access: 'denied',
        message: 'System error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtenir les informations d'un box (pour les dispositifs)
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    
    if (!apiKey || apiKey !== process.env.STORAGE_DEVICE_API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boxId = searchParams.get('boxId')

    if (!boxId) {
      return NextResponse.json(
        { error: 'Box ID required' },
        { status: 400 }
      )
    }

    // Obtenir les informations du box et les statistiques
    const stats = await StorageBoxService.getStorageStats()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalBoxes: stats.totalBoxes,
        occupancyRate: stats.occupancyRate
      }
    })

  } catch (error) {
    console.error('Error getting box info:', error)
    return NextResponse.json(
      { error: 'System error' },
      { status: 500 }
    )
  }
}