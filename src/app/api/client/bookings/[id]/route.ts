import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;

    console.log('🔍 Recherche booking avec:')
    console.log('- Booking ID:', id)
    console.log('- User ID (session):', session.user.id)
    console.log('- User role:', session.user.role)

    // Vérifier si l'utilisateur a bien un profil Client
    const userClient = await db.client.findFirst({
      where: { userId: session.user.id },
      select: { id: true, userId: true }
    })
    console.log('- User has Client profile:', userClient ? `Yes (${userClient.id})` : 'No')

    const booking = await db.booking.findFirst({
      where: {
        id: id,
        client: {
          userId: session.user.id
        }
      },
      include: {
        client: {
          select: {
            id: true,
            userId: true
          }
        },
        provider: {
          select: {
            id: true,
            averageRating: true,
            businessName: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile: {
                  select: {
                    phone: true
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
            description: true,
            basePrice: true
          }
        }
      }
    })

    if (!booking) {
      // Vérifier si la booking existe sans filtre clientId
      const anyBooking = await db.booking.findUnique({
        where: { id },
        select: { 
          id: true, 
          clientId: true, 
          status: true,
          client: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      })
      
      console.log('❌ Booking non trouvée avec clientId. Vérification:')
      if (anyBooking) {
        console.log('- Booking existe avec clientId:', anyBooking.clientId)
        console.log('- Client user ID:', anyBooking.client?.userId)
        console.log('- Client user email:', anyBooking.client?.user.email)
        console.log('- Session user ID:', session.user.id)
        console.log('- Direct clientId match?', anyBooking.clientId === session.user.id)
        console.log('- Via client.userId match?', anyBooking.client?.userId === session.user.id)
        console.log('- User has Client ID:', userClient?.id)
        console.log('- Booking clientId:', anyBooking.clientId)
        console.log('- Should use clientId:', userClient?.id)
      } else {
        console.log('- Booking n\'existe pas du tout avec ID:', id)
      }
      
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Transformer les donn�es pour correspondre � l'interface frontend
    const transformedBooking = {
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.scheduledDate.toISOString(),
      totalPrice: booking.totalPrice,
      service: {
        name: booking.service?.name || 'Service',
        description: booking.service?.description || '',
        duration: booking.duration,
        price: booking.service?.basePrice || booking.totalPrice,
        provider: {
          user: {
            profile: {
              firstName: booking.provider.user.name?.split(' ')[0] || booking.provider.businessName || 'Provider',
              lastName: booking.provider.user.name?.split(' ')[1] || ''
            }
          }
        }
      },
      providerId: booking.provider.id,
      providerName: booking.provider.user.name || booking.provider.businessName || 'Provider',
      providerEmail: booking.provider.user.email,
      providerPhone: booking.provider.user.profile?.phone,
      providerRating: booking.provider.averageRating || 0,
      providerAvatar: booking.provider.user.image,
      address: booking.address,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString()
    }

    return NextResponse.json(transformedBooking)
  } catch (error) {
    console.error('Error fetching booking details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;
    const body = await request.json()
    
    // V�rifier que la r�servation appartient au client
    const existingBooking = await db.booking.findFirst({
      where: {
        id: id,
        client: {
          userId: session.user.id
        }
      }
    })

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // V�rifier que la r�servation peut �tre modifi�e
    if (existingBooking.status !== 'PENDING' && existingBooking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking cannot be modified' }, { status: 400 })
    }

    // Mettre � jour la r�servation
    const updatedBooking = await db.booking.update({
      where: { id: id },
      data: {
        ...body,
        updatedAt: new Date()
      },
      include: {
        client: {
          select: {
            id: true,
            userId: true
          }
        },
        provider: {
          select: {
            id: true,
            averageRating: true,
            businessName: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile: {
                  select: {
                    phone: true
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
            description: true,
            basePrice: true
          }
        }
      }
    })

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}