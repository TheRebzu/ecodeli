import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const serviceType = searchParams.get('serviceType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const filters: any = { clientId: clientId || user.id }
    
    if (status) {
      filters.status = status
    }
    
    if (dateFrom || dateTo) {
      filters.scheduledDate = {}
      if (dateFrom) filters.scheduledDate.gte = new Date(dateFrom)
      if (dateTo) filters.scheduledDate.lte = new Date(dateTo)
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where: filters,
        include: {
          provider: {
            select: {
              id: true,
              businessName: true,
              averageRating: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          review: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.booking.count({ where: filters })
    ])

    // Transformer les données pour correspondre à l'interface frontend
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      providerId: booking.provider.id,
      providerName: booking.provider.user.profile 
        ? `${booking.provider.user.profile.firstName || ''} ${booking.provider.user.profile.lastName || ''}`.trim()
        : booking.provider.user.name || 'Prestataire',
      serviceId: booking.service?.id || '',
      serviceName: booking.service?.name || 'Service',
      date: booking.scheduledDate.toISOString().split('T')[0],
      startTime: booking.scheduledTime,
      endTime: `${parseInt(booking.scheduledTime.split(':')[0]) + Math.floor(booking.duration / 60)}:${booking.scheduledTime.split(':')[1]}`,
      status: booking.status.toLowerCase(),
      location: typeof booking.address === 'object' && booking.address && 'address' in booking.address
        ? `${booking.address.address}, ${booking.address.city}` 
        : booking.address?.toString() || 'Non spécifié',
      price: booking.totalPrice,
      notes: booking.notes,
      specialRequests: '',
      rating: booking.review?.rating,
      review: booking.review?.comment,
      createdAt: booking.createdAt.toISOString()
    }))

    return NextResponse.json({
      bookings: transformedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching client bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientId,
      providerId,
      serviceId,
      startDate,
      endDate,
      timeSlot,
      location,
      homeService,
      notes,
      specialRequests,
      durationDays,
      timeSlotHours,
      totalPrice: providedTotalPrice,
      priceBreakdown
    } = body

    // Vérifier que le prestataire et le service existent
    const [provider, service] = await Promise.all([
      db.provider.findUnique({
        where: { id: providerId },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }),
      db.service.findUnique({
        where: { id: serviceId }
      })
    ])

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Vérifier que le client existe
    const finalUserId = clientId || user.id
    let clientToUse = await db.client.findUnique({
      where: { userId: finalUserId }
    })

    if (!clientToUse) {
      // Si le profil client n'existe pas, le créer automatiquement
      clientToUse = await db.client.create({
        data: {
          userId: finalUserId,
          subscriptionPlan: 'FREE'
        }
      })
      console.log('✅ Profil client créé automatiquement:', clientToUse.id)
    } else {
      console.log('✅ Profil client trouvé:', clientToUse.id)
    }
    
    // Extraire l'heure de début du timeSlot
    const [startTime, endTime] = timeSlot.split('-')
    const calculatedDurationDays = durationDays || 1
    const slotHours = timeSlotHours || 1
    
    // Utiliser le prix calculé côté frontend ou recalculer
    let finalTotalPrice = providedTotalPrice;
    if (!finalTotalPrice) {
      // Recalcul de sécurité côté serveur
      switch (service.priceUnit) {
        case 'HOUR':
          finalTotalPrice = service.basePrice * slotHours * calculatedDurationDays;
          break;
        case 'DAY':
          finalTotalPrice = service.basePrice * calculatedDurationDays;
          break;
        case 'FLAT':
          finalTotalPrice = service.basePrice * (calculatedDurationDays > 1 ? calculatedDurationDays : 1);
          break;
        default:
          finalTotalPrice = service.basePrice * calculatedDurationDays;
      }
    }

    // Créer la réservation
    const booking = await db.booking.create({
      data: {
        clientId: clientToUse.id,
        providerId,
        serviceId,
        status: 'PENDING',
        scheduledDate: new Date(startDate),
        scheduledTime: startTime,
        duration: service.duration || (slotHours * 60), // Convertir heures en minutes
        address: { address: location, city: '', postalCode: '', lat: 0, lng: 0 },
        totalPrice: finalTotalPrice,
        notes: [
          notes,
          `Période : du ${startDate} au ${endDate} (${calculatedDurationDays} jour${calculatedDurationDays > 1 ? 's' : ''})`,
          `Créneau : ${timeSlot} (${slotHours}h par jour)`,
          priceBreakdown ? `Détail prix : ${priceBreakdown}` : ''
        ].filter(Boolean).join('\n\n')
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            averageRating: true,
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // NOUVEAU : Envoyer les notifications ET emails promises
    try {
      // Récupérer les emails du client et du prestataire
      const [clientUser, providerUser] = await Promise.all([
        db.user.findUnique({
          where: { id: finalUserId },
          select: { email: true, name: true }
        }),
        db.user.findUnique({
          where: { id: provider.user.id },
          select: { email: true, name: true }
        })
      ])

      if (!clientUser?.email || !providerUser?.email) {
        throw new Error('Emails manquants pour l\'envoi des notifications')
      }

      // Utiliser la nouvelle fonction complète avec emails
      await NotificationService.notifyBookingCreated({
        bookingId: booking.id,
        clientId: finalUserId,
        clientName: user.name || 'Client',
        clientEmail: clientUser.email,
        providerId: provider.user.id,
        providerName: provider.user.profile 
          ? `${provider.user.profile.firstName || ''} ${provider.user.profile.lastName || ''}`.trim()
          : provider.user.name || 'Prestataire',
        providerEmail: providerUser.email,
        serviceName: service.name,
        scheduledDate: new Date(startDate).toLocaleDateString('fr-FR'),
        scheduledTime: startTime,
        location: location,
        totalPrice: finalTotalPrice,
        notes: [
          notes,
          `Période : du ${startDate} au ${endDate} (${calculatedDurationDays} jour${calculatedDurationDays > 1 ? 's' : ''})`,
          `Créneau : ${timeSlot} (${slotHours}h par jour)`,
          priceBreakdown ? `Détail prix : ${priceBreakdown}` : ''
        ].filter(Boolean).join('\n\n')
      })

      console.log('✅ Notifications ET emails envoyés pour la réservation:', booking.id)
    } catch (notificationError) {
      console.error('❌ Erreur envoi notifications/emails:', notificationError)
      // Ne pas faire échouer la réservation pour une erreur de notification
    }

    // Transformer les données pour la réponse
    const transformedBooking = {
      id: booking.id,
      providerId: booking.provider.id,
      providerName: booking.provider.user.profile 
        ? `${booking.provider.user.profile.firstName || ''} ${booking.provider.user.profile.lastName || ''}`.trim()
        : booking.provider.user.name || 'Prestataire',
      serviceId: booking.service.id,
      serviceName: booking.service.name,
      startDate: startDate,
      endDate: endDate,
      durationDays: calculatedDurationDays,
      date: booking.scheduledDate.toISOString().split('T')[0],
      startTime: booking.scheduledTime,
      endTime: endTime,
      status: booking.status.toLowerCase(),
      location: location,
      price: booking.totalPrice,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString()
    }

    return NextResponse.json(transformedBooking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}