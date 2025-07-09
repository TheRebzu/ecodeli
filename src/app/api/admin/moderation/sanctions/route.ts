import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // TODO: Implement actual sanctions data fetching
    // For now, return mock data
    const mockData = {
      sanctions: [
        {
          id: '1',
          userId: 'user123',
          userName: 'Jean Dupont',
          userEmail: 'jean.dupont@email.com',
          type: 'SUSPENSION',
          reason: 'Contenu inapproprié',
          description: 'Annonces avec contenu non conforme',
          status: 'ACTIVE',
          issuedBy: 'admin@ecodeli.com',
          issuedAt: '2024-01-10T10:30:00Z',
          expiresAt: '2024-02-10T10:30:00Z'
        },
        {
          id: '2',
          userId: 'user456',
          userName: 'Marie Martin',
          userEmail: 'marie.martin@email.com',
          type: 'WARNING',
          reason: 'Comportement suspect',
          description: 'Multiples signalements d\'utilisateurs',
          status: 'ACTIVE',
          issuedBy: 'admin@ecodeli.com',
          issuedAt: '2024-01-12T14:20:00Z'
        },
        {
          id: '3',
          userId: 'user789',
          userName: 'Pierre Durand',
          userEmail: 'pierre.durand@email.com',
          type: 'BAN',
          reason: 'Violation grave',
          description: 'Fraude avérée',
          status: 'ACTIVE',
          issuedBy: 'admin@ecodeli.com',
          issuedAt: '2024-01-05T09:15:00Z'
        }
      ],
      stats: {
        active: 8,
        expired: 12,
        revoked: 3
      },
      total: 3,
      page,
      limit
    }

    return NextResponse.json(mockData)
  } catch (error) {
    console.error('Error fetching sanctions data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, type, reason, description, duration } = body

    if (!userId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // TODO: Implement actual sanction creation
    console.log('Creating sanction:', { 
      userId, 
      type, 
      reason, 
      description, 
      duration,
      issuedBy: user.id 
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Sanction created successfully',
      sanctionId: 'sanction_' + Date.now()
    })
  } catch (error) {
    console.error('Error creating sanction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 