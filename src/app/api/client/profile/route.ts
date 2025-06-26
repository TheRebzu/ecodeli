import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil client complet
    const clientProfile = await db.client.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
        subscription: true,
        documents: {
          orderBy: { createdAt: 'desc' }
        },
        addresses: {
          orderBy: { isDefault: 'desc' }
        },
        paymentMethods: {
          orderBy: { isDefault: 'desc' }
        },
        announcements: {
          select: {
            id: true,
            price: true,
            status: true
          }
        },
        bookings: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            rating: true
          }
        },
        deliveries: {
          where: {
            status: 'DELIVERED'
          },
          select: { id: true }
        }
      }
    })

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Calculer les statistiques
    const completedOrders = clientProfile.bookings.filter(b => b.status === 'COMPLETED')
    const totalSpent = completedOrders.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
    const averageRating = completedOrders.filter(b => b.rating).length > 0 
      ? completedOrders.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / completedOrders.filter(b => b.rating).length
      : 0
    const cancelledOrders = clientProfile.bookings.filter(b => b.status === 'CANCELLED').length

    // Construire le profil transformé
    const profile = {
      id: clientProfile.id,
      userId: clientProfile.userId,
      user: {
        name: clientProfile.user.name,
        email: clientProfile.user.email,
        phone: clientProfile.user.phone,
        image: clientProfile.user.image,
        address: clientProfile.user.address,
        city: clientProfile.user.city,
        postalCode: clientProfile.user.postalCode,
        country: clientProfile.user.country,
        dateOfBirth: clientProfile.user.dateOfBirth?.toISOString()
      },
      subscriptionPlan: clientProfile.subscription?.plan || 'FREE',
      preferences: {
        notifications: {
          email: clientProfile.emailNotifications !== false,
          sms: clientProfile.smsNotifications === true,
          push: clientProfile.pushNotifications !== false,
          marketing: clientProfile.marketingNotifications === true
        },
        language: clientProfile.language || 'fr',
        timezone: clientProfile.timezone || 'Europe/Paris',
        defaultPaymentMethod: clientProfile.defaultPaymentMethodId
      },
      documents: clientProfile.documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        status: doc.status,
        uploadedAt: doc.createdAt.toISOString(),
        url: doc.url
      })),
      stats: {
        totalOrders: clientProfile.bookings.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageRating: Math.round(averageRating * 10) / 10,
        completedDeliveries: clientProfile.deliveries.length,
        cancelledOrders
      },
      paymentMethods: clientProfile.paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        isDefault: pm.isDefault,
        lastFour: pm.lastFour,
        expiryDate: pm.expiryDate,
        brand: pm.brand
      })),
      addresses: clientProfile.addresses.map(addr => ({
        id: addr.id,
        label: addr.label,
        street: addr.street,
        city: addr.city,
        postalCode: addr.postalCode,
        country: addr.country,
        isDefault: addr.isDefault
      }))
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching client profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    // Mettre à jour les informations utilisateur
    const userUpdates: any = {}
    if (updates.name) userUpdates.name = updates.name
    if (updates.email) userUpdates.email = updates.email
    if (updates.phone) userUpdates.phone = updates.phone
    if (updates.address) userUpdates.address = updates.address
    if (updates.city) userUpdates.city = updates.city
    if (updates.postalCode) userUpdates.postalCode = updates.postalCode
    if (updates.country) userUpdates.country = updates.country
    if (updates.dateOfBirth) userUpdates.dateOfBirth = new Date(updates.dateOfBirth)

    // Mettre à jour les préférences client
    const clientUpdates: any = {}
    if (updates.preferences?.notifications) {
      clientUpdates.emailNotifications = updates.preferences.notifications.email
      clientUpdates.smsNotifications = updates.preferences.notifications.sms
      clientUpdates.pushNotifications = updates.preferences.notifications.push
      clientUpdates.marketingNotifications = updates.preferences.notifications.marketing
    }
    if (updates.preferences?.language) clientUpdates.language = updates.preferences.language
    if (updates.preferences?.timezone) clientUpdates.timezone = updates.preferences.timezone

    // Transaction pour mettre à jour user et client
    await db.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: session.user.id },
          data: userUpdates
        })
      }

      // Mettre à jour le profil client
      if (Object.keys(clientUpdates).length > 0) {
        await tx.client.update({
          where: { userId: session.user.id },
          data: clientUpdates
        })
      }
    })

    // Récupérer le profil mis à jour
    const response = await GET(request)
    return response

  } catch (error) {
    console.error('Error updating client profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}