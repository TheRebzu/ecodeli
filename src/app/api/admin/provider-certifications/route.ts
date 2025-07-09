import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const providerId = searchParams.get('providerId')

    const whereConditions: any = {}
    
    if (status) {
      whereConditions.status = status
    }
    
    if (providerId) {
      whereConditions.providerId = providerId
    }

    const certifications = await prisma.certification.findMany({
      where: whereConditions,
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ certifications })
  } catch (error) {
    console.error('Error fetching provider certifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { certificationId, status, notes } = body

    if (!certificationId || !status) {
      return NextResponse.json(
        { error: 'Certification ID and status are required' },
        { status: 400 }
      )
    }

    const certification = await prisma.certification.update({
      where: { id: certificationId },
      data: {
        status,
        validatedBy: currentUser.id,
        validatedAt: new Date(),
        notes: notes || null
      },
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Send notification to provider
    if (certification.provider?.user?.email) {
      // TODO: Send email notification
      console.log(`Notification sent to ${certification.provider.user.email} about certification ${status}`)
    }

    return NextResponse.json({ 
      message: 'Certification updated successfully',
      certification 
    })
  } catch (error) {
    console.error('Error updating certification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 