import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Création intervention de test...')

    // Récupérer l'utilisateur connecté
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Prestataire requis' }, { status: 401 })
    }

    // Récupérer le prestataire connecté
    const provider = await db.provider.findUnique({
      where: { userId: user.id }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Profil prestataire non trouvé' }, { status: 404 })
    }

    const client = await db.user.findFirst({
      where: { role: 'CLIENT' }
    })

    const serviceRequest = await db.announcement.findFirst({
      where: { type: 'HOME_SERVICE' }
    })

    if (!client || !serviceRequest) {
      return NextResponse.json({ 
        error: 'Données de test manquantes' 
      }, { status: 400 })
    }

    // Créer une intervention de test pour le prestataire connecté
    const intervention = await db.serviceIntervention.create({
      data: {
        providerId: provider.id, // Utiliser l'ID du prestataire connecté
        clientId: client.id,
        serviceRequestId: serviceRequest.id,
        title: 'Test Intervention - Ménage',
        description: 'Intervention de test pour vérifier l\'affichage',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        estimatedDuration: 120, // 2 heures
        status: 'SCHEDULED',
        notes: 'Intervention créée pour test'
      }
    })

    console.log('✅ Intervention de test créée:', intervention.id)

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        title: intervention.title,
        status: intervention.status,
        scheduledDate: intervention.scheduledDate,
        providerId: intervention.providerId
      }
    })

  } catch (error) {
    console.error('❌ Erreur création intervention:', error)
    return NextResponse.json({ 
      error: 'Erreur création intervention' 
    }, { status: 500 })
  }
} 