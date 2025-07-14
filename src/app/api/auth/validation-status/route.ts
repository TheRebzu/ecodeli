import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Vérifier les permissions
    if (session.user.role !== 'ADMIN' && session.user.id !== userId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    let validationStatus = 'PENDING'

    // Vérifier le statut selon le rôle
    if (session.user.role === 'PROVIDER') {
      const provider = await prisma.provider.findFirst({
        where: { userId },
        select: { validationStatus: true, businessName: true, siret: true }
      })

      if (provider) {
        // Si le provider a un businessName et SIRET, considérer comme validé
        if (provider.businessName && provider.siret && provider.validationStatus === 'VALIDATED') {
          validationStatus = 'APPROVED'
        } else if (provider.validationStatus === 'VALIDATED') {
          validationStatus = 'APPROVED'
        } else {
          validationStatus = provider.validationStatus || 'PENDING'
        }
      }
    } else if (session.user.role === 'DELIVERER') {
      const deliverer = await prisma.deliverer.findFirst({
        where: { userId },
        select: { validationStatus: true }
      })

      if (deliverer) {
        validationStatus = deliverer.validationStatus || 'PENDING'
      }
    } else {
      // Pour les autres rôles, utiliser le statut de la session
      validationStatus = session.user.validationStatus || 'APPROVED'
    }

    return NextResponse.json({
      userId,
      role: session.user.role,
      validationStatus,
      isActive: session.user.isActive
    })

  } catch (error) {
    console.error('Erreur vérification statut validation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    )
  }
} 