import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const validateDocumentsSchema = z.object({
  userId: z.string().cuid('ID utilisateur invalide'),
  documentType: z.enum(['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION', 'CONTRACT']),
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional() // Raison en cas de rejet
})

/**
 * POST /api/auth/validate-documents
 * Validation des documents par l'admin (workflow critique EcoDeli)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADMIN')

    const body = await request.json()
    const { userId, documentType, status, reason } = validateDocumentsSchema.parse(body)

    // Récupérer l'utilisateur et son profil
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        deliverer: true,
        provider: true,
        merchant: true,
        documents: {
          where: { type: documentType }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Mettre à jour le document
    const document = user.documents[0]
    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      )
    }

    await db.document.update({
      where: { id: document.id },
      data: {
        status,
        validatedBy: user.id,
        validatedAt: new Date(),
        ...(reason && { rejectionReason: reason })
      }
    })

    // Logique de validation selon le rôle et type de document
    let userUpdateData = {}
    let profileUpdateData = {}
    let profileTable = null

    switch (user.role) {
      case 'DELIVERER':
        if (documentType === 'IDENTITY' || documentType === 'DRIVING_LICENSE' || documentType === 'INSURANCE') {
          // Vérifier si tous les documents obligatoires sont approuvés
          const allDocuments = await db.document.findMany({
            where: {
              profileId: user.delivererProfile?.id,
              type: { in: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE'] }
            }
          })

          const allApproved = allDocuments.every(doc => doc.status === 'APPROVED')
          
          if (allApproved) {
            userUpdateData = { status: 'ACTIVE' }
            profileUpdateData = { 
              documentsValidated: true,
              validationStatus: 'APPROVED',
              validatedAt: new Date()
            }
            profileTable = 'delivererProfile'

            // Générer carte NFC automatiquement
            const nfcCardId = `NFC-${user.id.slice(-8).toUpperCase()}-${Date.now().toString().slice(-6)}`
            profileUpdateData.nfcCardId = nfcCardId
          } else if (status === 'REJECTED') {
            userUpdateData = { status: 'PENDING_DOCUMENTS' }
            profileUpdateData = { 
              documentsValidated: false,
              validationStatus: 'REJECTED'
            }
            profileTable = 'delivererProfile'
          }
        }
        break

      case 'PROVIDER':
        if (documentType === 'CERTIFICATION') {
          if (status === 'APPROVED') {
            userUpdateData = { status: 'ACTIVE' }
            profileUpdateData = { 
              certificationsValidated: true,
              validationStatus: 'APPROVED',
              validatedAt: new Date()
            }
          } else {
            userUpdateData = { status: 'PENDING_DOCUMENTS' }
            profileUpdateData = { 
              certificationsValidated: false,
              validationStatus: 'REJECTED'
            }
          }
          profileTable = 'providerProfile'
        }
        break

      case 'MERCHANT':
        if (documentType === 'CONTRACT') {
          if (status === 'APPROVED') {
            userUpdateData = { status: 'ACTIVE' }
            profileUpdateData = { 
              contractStatus: 'SIGNED',
              signedAt: new Date()
            }
          } else {
            profileUpdateData = { 
              contractStatus: 'REJECTED'  
            }
          }
          profileTable = 'merchantProfile'
        }
        break
    }

    // Mettre à jour l'utilisateur et son profil
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: userUpdateData
    })

    if (profileTable && Object.keys(profileUpdateData).length > 0) {
      await db[profileTable].update({
        where: { userId },
        data: profileUpdateData
      })
    }

    // TODO: Envoyer notification push avec OneSignal
    console.log(`📧 Notification à envoyer à ${user.email}: Document ${documentType} ${status.toLowerCase()}`)

    // Log d'audit
    console.log(`🔍 AUDIT: Admin ${user.email} a ${status.toLowerCase()} le document ${documentType} de ${user.email}`)

    return NextResponse.json({
      success: true,
      message: `Document ${status.toLowerCase()} avec succès`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        status: updatedUser.status
      },
      document: {
        id: document.id,
        type: documentType,
        status,
        validatedAt: new Date(),
        validatedBy: user.email
      }
    })

  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Forbidden"))) {
      return NextResponse.json(
        { error: "Accès non autorisé - Admin uniquement" },
        { status: 403 }
      )
    }

    console.error('❌ Erreur validation documents:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur lors de la validation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/validate-documents
 * Liste des documents en attente de validation
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN')

    const pendingDocuments = await db.document.findMany({
      where: { status: 'PENDING' },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      documents: pendingDocuments.map(doc => ({
        id: doc.id,
        type: doc.type,
        filename: doc.filename,
        url: doc.url,
        uploadedAt: doc.createdAt,
        user: doc.profile.user
      }))
    })

  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Forbidden"))) {
      return NextResponse.json(
        { error: "Accès non autorisé - Admin uniquement" },
        { status: 403 }
      )
    }

    console.error('❌ Erreur récupération documents:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}