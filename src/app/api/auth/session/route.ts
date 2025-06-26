import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Convertir les headers pour Better Auth
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      headers.set(key, value)
    })
    
    const session = await auth.api.getSession({
      headers,
    })
    
    // Log pour debug
    console.log('Session from Better Auth:', session)
    
    if (!session) {
      return NextResponse.json(null, { status: 200 })
    }
    
    // Better Auth retourne déjà session et user, on les retourne directement
    return NextResponse.json(session, { status: 200 })
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json(null, { status: 200 })
  }
}