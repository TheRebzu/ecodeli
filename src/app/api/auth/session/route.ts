import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // Log pour debug
    console.log('Session from NextAuth:', session)
    
    if (!session) {
      return NextResponse.json(null, { status: 200 })
    }
    
    // NextAuth retourne la session avec user
    return NextResponse.json(session, { status: 200 })
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json(null, { status: 200 })
  }
}