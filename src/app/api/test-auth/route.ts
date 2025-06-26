import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    
    if (!user) {
      return NextResponse.json({ 
        error: 'No user from session',
        session: null 
      })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        validationStatus: user.validationStatus,
        hasProfile: !!user.Profile,
        hasClient: !!user.Client,
        roleCheck: {
          isClient: user.role === 'CLIENT',
          roleValue: user.role,
          roleType: typeof user.role
        }
      },
      debug: {
        userKeys: Object.keys(user),
        clientData: user.Client
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error in test auth',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 