import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Création utilisateur test via API...')

    // Données utilisateur test
    const userData = {
      email: 'client-complete@test.com',
      password: 'Test123!',
      name: 'Client Test',
      role: 'CLIENT',
      isActive: true,
      validationStatus: 'VALIDATED'
    }

    // Utiliser Better-Auth pour créer l'utilisateur
    const result = await auth.api.signUpEmail({
      body: userData
    })

    if (result.error) {
      console.error('❌ Erreur création:', result.error)
      return NextResponse.json({ 
        error: result.error.message || 'Erreur création utilisateur' 
      }, { status: 400 })
    }

    console.log('✅ Utilisateur créé:', userData.email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Utilisateur créé avec succès',
      user: result.data?.user
    })

  } catch (error) {
    console.error('❌ Erreur fatale:', error)
    return NextResponse.json({ 
      error: 'Erreur serveur interne' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Endpoint pour créer un utilisateur test',
    usage: 'POST /api/create-test-user'
  })
}