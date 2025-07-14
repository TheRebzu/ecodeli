import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Provider Validation Check: Starting')
    
    const session = await auth()
    
    if (!session?.user) {
      console.log('❌ Provider Validation Check: No session')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { providerId } = body

    console.log('🔍 Provider Validation Check:', { 
      userId: session.user.id, 
      userRole: session.user.role, 
      providerId 
    })

    if (!providerId) {
      console.log('❌ Provider Validation Check: No providerId')
      return NextResponse.json({ error: 'ID prestataire requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur peut accéder à ce prestataire
    if (session.user.role !== 'ADMIN' && session.user.id !== providerId) {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true }
      })

      if (!provider || provider.userId !== session.user.id) {
        return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
      }
    }

    // Récupérer les documents du prestataire
    console.log('🔍 Provider Validation Check: Looking for documents with userId:', providerId)
    
    const documents = await prisma.document.findMany({
      where: {
        userId: providerId,
      },
      select: {
        id: true,
        type: true,
        filename: true,
        validationStatus: true,
        createdAt: true,
        rejectionReason: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log('🔍 Provider Validation Check: Found documents:', documents.length)
    console.log('🔍 Provider Validation Check: Document types:', documents.map((d: any) => d.type))

    // Récupérer le prestataire - chercher par userId (car c'est la relation dans le modèle)
    console.log('🔍 Provider Validation Check: Looking for provider with userId:', providerId)
    
    let provider = await prisma.provider.findFirst({
      where: { userId: providerId },
      select: {
        id: true,
        validationStatus: true,
        businessName: true,
        siret: true,
        description: true,
        user: {
          select: {
            profile: {
              select: {
                phone: true,
                address: true,
                city: true,
                postalCode: true,
              }
            }
          }
        }
      }
    })

    console.log('🔍 Provider Validation Check: Found by userId:', provider ? 'YES' : 'NO')

    // Si toujours pas trouvé, créer automatiquement un provider pour cet utilisateur
    if (!provider) {
      console.log('🔍 Provider Validation Check: Creating provider for user:', providerId)
      provider = await prisma.provider.create({
        data: {
          userId: providerId,
          businessName: '',
          siret: '',
          description: '',
          validationStatus: 'PENDING',
        },
        select: {
          id: true,
          validationStatus: true,
          businessName: true,
          siret: true,
          description: true,
          user: {
            select: {
              profile: {
                select: {
                  phone: true,
                  address: true,
                  city: true,
                  postalCode: true,
                }
              }
            }
          }
        }
      })
    }

    // Définir les documents requis pour les prestataires
    const requiredDocumentTypes = ['IDENTITY', 'INSURANCE']
    const optionalDocumentTypes = ['DRIVING_LICENSE', 'CERTIFICATION', 'CONTRACT']

    // Analyser les documents
    const requiredDocs = documents.filter((doc: any) => requiredDocumentTypes.includes(doc.type))
    const optionalDocs = documents.filter((doc: any) => optionalDocumentTypes.includes(doc.type))
    
    const approvedRequiredDocs = requiredDocs.filter((doc: any) => doc.validationStatus === 'APPROVED')
    const pendingDocs = documents.filter((doc: any) => doc.validationStatus === 'PENDING')
    const rejectedDocs = documents.filter((doc: any) => doc.validationStatus === 'REJECTED')

    // Vérifier les informations du profil
    const profileComplete = provider.businessName && 
                          provider.siret && 
                          provider.description &&
                          provider.user.profile?.phone &&
                          provider.user.profile?.address &&
                          provider.user.profile?.city &&
                          provider.user.profile?.postalCode

    // Calculer le statut global
    const allRequiredDocsApproved = approvedRequiredDocs.length >= requiredDocumentTypes.length
    const hasPendingDocs = pendingDocs.length > 0
    const hasRejectedDocs = rejectedDocs.length > 0
    const isProfileComplete = profileComplete

    let validationStatus = 'INCOMPLETE'
    let message = ''
    let canActivate = false

    if (hasRejectedDocs) {
      validationStatus = 'REJECTED'
      message = 'Certains documents ont été rejetés. Veuillez les corriger.'
    } else if (allRequiredDocsApproved && isProfileComplete) {
      validationStatus = 'READY'
      message = 'Tous les documents requis sont approuvés et le profil est complet!'
      canActivate = true
    } else if (hasPendingDocs) {
      validationStatus = 'PENDING'
      message = 'Vos documents sont en cours de validation par l\'équipe EcoDeli.'
    } else if (!allRequiredDocsApproved) {
      validationStatus = 'MISSING_DOCUMENTS'
      message = 'Veuillez télécharger tous les documents requis.'
    } else if (!isProfileComplete) {
      validationStatus = 'INCOMPLETE_PROFILE'
      message = 'Veuillez compléter votre profil avec toutes les informations requises.'
    }

    const result = {
      success: true,
      validationStatus,
      message,
      canActivate,
      summary: {
        totalDocuments: documents.length,
        requiredDocuments: requiredDocs.length,
        approvedRequired: approvedRequiredDocs.length,
        pendingDocuments: pendingDocs.length,
        rejectedDocuments: rejectedDocs.length,
        profileComplete: isProfileComplete,
        providerStatus: provider.validationStatus
      },
      documents: {
        required: requiredDocs,
        optional: optionalDocs,
        pending: pendingDocs,
        rejected: rejectedDocs
      }
    }

    console.log('✅ Provider Validation Check: Success', {
      validationStatus: result.validationStatus,
      message: result.message,
      canActivate: result.canActivate,
      summary: result.summary
    })
    return NextResponse.json(result)

  } catch (error) {
    console.error('Erreur vérification validation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la validation' },
      { status: 500 }
    )
  }
} 