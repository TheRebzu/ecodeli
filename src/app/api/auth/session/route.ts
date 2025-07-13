import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user: session.user })

  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json({ user: null })
  }
} 