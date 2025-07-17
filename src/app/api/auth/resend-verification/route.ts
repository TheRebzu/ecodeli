import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }
    if (user.isActive) {
      return NextResponse.json({ error: 'Compte déjà actif' }, { status: 400 })
    }
    // Simuler l'envoi d'email de vérification
    console.log(`[MOCK] Envoi email de vérification à ${email}`)
    // TODO: Intégrer un vrai service d'email si besoin
    return NextResponse.json({ message: 'Email de vérification envoyé' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 