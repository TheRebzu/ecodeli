import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['PROVIDER']).catch(() => null)
    
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const { id: interventionId } = await params

    const intervention = await prisma.booking.findUnique({
      where: { id: interventionId },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        service: true,
        review: true
      }
    })

    if (!intervention) {
      return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })
    }

    // V�rifier que l'intervention appartient au prestataire
    if (intervention.providerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formattedIntervention = {
      id: intervention.id,
      title: intervention.service?.name || 'Intervention',
      description: intervention.notes || '',
      status: intervention.status.toLowerCase(),
      type: intervention.service?.category || 'Service',
      scheduledDate: intervention.scheduledDate,
      startTime: intervention.timeSlot || '09:00',
      endTime: intervention.endTime || '10:00',
      client: {
        id: intervention.client.id,
        name: `${intervention.client.profile?.firstName || ''} ${intervention.client.profile?.lastName || ''}`.trim() || intervention.client.email,
        email: intervention.client.email,
        phone: intervention.client.profile?.phone
      },
      location: {
        address: intervention.address || '',
        city: intervention.city || '',
        zipCode: intervention.zipCode || ''
      },
      price: Number(intervention.price) || 0,
      duration: intervention.duration || 60,
      notes: intervention.notes,
      completionReport: intervention.completionReport,
      rating: intervention.review?.rating,
      createdAt: intervention.createdAt,
      updatedAt: intervention.updatedAt
    }

    return NextResponse.json({ intervention: formattedIntervention })

  } catch (error) {
    console.error('Error fetching intervention:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['PROVIDER']).catch(() => null)
    
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const { id: interventionId } = await params
    const { status, completionReport } = await request.json()

    // V�rifier que l'intervention existe et appartient au prestataire
    const existingIntervention = await prisma.booking.findUnique({
      where: { id: interventionId }
    })

    if (!existingIntervention) {
      return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })
    }

    if (existingIntervention.providerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mettre � jour l'intervention
    const updatedIntervention = await prisma.booking.update({
      where: { id: interventionId },
      data: {
        status: status.toUpperCase(),
        completionReport: completionReport || existingIntervention.completionReport,
        updatedAt: new Date()
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        service: true,
        review: true
      }
    })

    // Si l'intervention est termin�e, cr�er une notification pour le client
    if (status === 'completed') {
      await prisma.notification.create({
        data: {
          userId: updatedIntervention.clientId,
          type: 'BOOKING_COMPLETED',
          title: 'Intervention termin�e',
          message: `Votre intervention "${updatedIntervention.service?.name || 'Service'}" a �t� termin�e avec succ�s.`,
          metadata: {
            bookingId: interventionId,
            providerId: user.id
          }
        }
      })
    }

    const formattedIntervention = {
      id: updatedIntervention.id,
      title: updatedIntervention.service?.name || 'Intervention',
      description: updatedIntervention.notes || '',
      status: updatedIntervention.status.toLowerCase(),
      type: updatedIntervention.service?.category || 'Service',
      scheduledDate: updatedIntervention.scheduledDate,
      startTime: updatedIntervention.timeSlot || '09:00',
      endTime: updatedIntervention.endTime || '10:00',
      client: {
        id: updatedIntervention.client.id,
        name: `${updatedIntervention.client.profile?.firstName || ''} ${updatedIntervention.client.profile?.lastName || ''}`.trim() || updatedIntervention.client.email,
        email: updatedIntervention.client.email,
        phone: updatedIntervention.client.profile?.phone
      },
      location: {
        address: updatedIntervention.address || '',
        city: updatedIntervention.city || '',
        zipCode: updatedIntervention.zipCode || ''
      },
      price: Number(updatedIntervention.price) || 0,
      duration: updatedIntervention.duration || 60,
      notes: updatedIntervention.notes,
      completionReport: updatedIntervention.completionReport,
      rating: updatedIntervention.review?.rating,
      createdAt: updatedIntervention.createdAt,
      updatedAt: updatedIntervention.updatedAt
    }

    return NextResponse.json({ intervention: formattedIntervention })

  } catch (error) {
    console.error('Error updating intervention:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}