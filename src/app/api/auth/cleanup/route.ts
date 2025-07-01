import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Nettoyer toutes les sessions
    const deletedSessions = await db.session.deleteMany()
    
    // Nettoyer les tokens de vérification expirés
    const deletedTokens = await db.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    })

    // Récupérer quelques utilisateurs clients pour info
    const clients = await db.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      },
      take: 3
    })

    return NextResponse.json({
      success: true,
      message: 'Sessions nettoyées',
      deleted: {
        sessions: deletedSessions.count,
        tokens: deletedTokens.count
      },
      sampleClients: clients
    })
  } catch (error) {
    console.error('Erreur cleanup:', error)
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage' },
      { status: 500 }
    )
  }
}