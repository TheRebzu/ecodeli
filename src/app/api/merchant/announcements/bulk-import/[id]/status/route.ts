import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: importId } = await context.params

    // Dans une vraie implémentation, on récupérerait le statut depuis la DB
    // Pour cette démo, on simule différents statuts selon l'âge de l'import
    
    const timestamp = parseInt(importId.split('_')[1]) || Date.now()
    const ageInSeconds = (Date.now() - timestamp) / 1000

    let status, processedRows, totalRows, successfulRows, errorRows

    if (ageInSeconds < 10) {
      // Import récent - en cours
      status = 'PROCESSING'
      totalRows = 100
      processedRows = Math.min(Math.floor(ageInSeconds * 10), 100)
      successfulRows = Math.floor(processedRows * 0.95)
      errorRows = processedRows - successfulRows
    } else if (ageInSeconds < 15) {
      // Import terminé avec succès
      status = 'COMPLETED'
      totalRows = 100
      processedRows = 100
      successfulRows = 95
      errorRows = 5
    } else {
      // Import très ancien - considéré comme échoué pour la démo
      status = 'FAILED'
      totalRows = 100
      processedRows = 30
      successfulRows = 0
      errorRows = 30
    }

    return NextResponse.json({
      success: true,
      importId,
      status,
      totalRows,
      processedRows,
      successfulRows,
      errorRows,
      progress: Math.round((processedRows / totalRows) * 100),
      estimatedTimeRemaining: status === 'PROCESSING' ? Math.max(0, 15 - ageInSeconds) : 0
    })

  } catch (error) {
    console.error('❌ Erreur récupération statut import:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération du statut',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
} 