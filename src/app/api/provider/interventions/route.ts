import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['PROVIDER']).catch(() => null)
    
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID required' }, { status: 400 })
    }

    // Récupérer toutes les interventions du prestataire
    const interventions = await prisma.booking.findMany({
      where: {
        providerId: providerId
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        service: true,
        review: true
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    })

    // Transformer les données pour correspondre à l'interface attendue
    const formattedInterventions = interventions.map(booking => ({
      id: booking.id,
      title: booking.service?.name || 'Intervention',
      description: booking.notes || '',
      status: booking.status.toLowerCase(),
      type: booking.service?.category || 'Service',
      scheduledDate: booking.scheduledDate,
      startTime: booking.timeSlot || '09:00',
      endTime: booking.endTime || '10:00',
      client: {
        id: booking.client.id,
        name: `${booking.client.profile?.firstName || ''} ${booking.client.profile?.lastName || ''}`.trim() || booking.client.email,
        email: booking.client.email,
        phone: booking.client.profile?.phone
      },
      location: {
        address: booking.address || '',
        city: booking.city || '',
        zipCode: booking.zipCode || ''
      },
      price: Number(booking.price) || 0,
      duration: booking.duration || 60,
      notes: booking.notes,
      completionReport: booking.completionReport,
      rating: booking.review?.rating,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }))

    return NextResponse.json({ 
      interventions: formattedInterventions,
      total: formattedInterventions.length
    })

  } catch (error) {
    console.error('Error fetching interventions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}