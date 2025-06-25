import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour actions de validation utilisateur
const userValidationActionSchema = z.object({
  userId: z.string().cuid(),
  action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REQUEST_DOCUMENTS']),
  reason: z.string().min(10).max(1000).optional(),
  requiredDocuments: z.array(z.enum([
    'IDENTITY_CARD', 'DRIVING_LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION',
    'PROFESSIONAL_CARD', 'TAX_CERTIFICATE', 'BANK_RIB', 'KBIS'
  ])).optional(),
  suspensionDuration: z.number().min(1).max(365).optional() // jours
})

// GET - Liste des utilisateurs en attente de validation
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construire les filtres
    const whereConditions: any = {
      role: role ? role : { in: ['DELIVERER', 'MERCHANT', 'PROVIDER'] }
    }

    // Filtres par statut de validation selon le rôle
    const roleStatusMap = {
      DELIVERER: ['PENDING_DOCUMENTS', 'DOCUMENTS_REJECTED', 'PENDING_VERIFICATION'],
      MERCHANT: ['PENDING_VERIFICATION', 'DOCUMENTS_REJECTED'],
      PROVIDER: ['PENDING_VERIFICATION', 'DOCUMENTS_REJECTED']
    }

    if (status && status !== 'ALL') {
      if (role) {
        whereConditions[`${role.toLowerCase()}`] = {
          verificationStatus: status
        }
      }
    }

    // Récupérer les utilisateurs avec leurs informations spécifiques
    const users = await prisma.user.findMany({
      where: whereConditions,
      include: {
        profile: true,
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        deliverer: role === 'DELIVERER' || !role ? {
          select: {
            id: true,
            vehicleType: true,
            verificationStatus: true,
            documentsUploaded: true,
            verifiedAt: true,
            rejectionReason: true
          }
        } : false,
        merchant: role === 'MERCHANT' || !role ? {
          select: {
            id: true,
            businessName: true,
            businessType: true,
            verificationStatus: true,
            verifiedAt: true,
            rejectionReason: true
          }
        } : false,
        provider: role === 'PROVIDER' || !role ? {
          select: {
            id: true,
            companyName: true,
            serviceTypes: true,
            verificationStatus: true,
            verifiedAt: true,
            rejectionReason: true
          }
        } : false
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Filtrer les utilisateurs qui nécessitent une validation
    const pendingUsers = users.filter(user => {
      if (user.role === 'DELIVERER' && user.deliverer) {
        return ['PENDING_DOCUMENTS', 'DOCUMENTS_REJECTED', 'PENDING_VERIFICATION'].includes(user.deliverer.verificationStatus)
      }
      if (user.role === 'MERCHANT' && user.merchant) {
        return ['PENDING_VERIFICATION', 'DOCUMENTS_REJECTED'].includes(user.merchant.verificationStatus)
      }
      if (user.role === 'PROVIDER' && user.provider) {
        return ['PENDING_VERIFICATION', 'DOCUMENTS_REJECTED'].includes(user.provider.verificationStatus)
      }
      return false
    })

    // Calculer la priorité pour chaque utilisateur
    const usersWithPriority = pendingUsers.map(user => {
      const daysSinceRegistration = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      let priority = 'MEDIUM'
      let priorityScore = 0

      // Facteurs de priorité
      if (daysSinceRegistration > 7) priorityScore += 3 // Anciens
      if (daysSinceRegistration > 3) priorityScore += 2
      if (user.documents.length > 0) priorityScore += 2 // A des documents
      if (user.role === 'DELIVERER') priorityScore += 1 // Livreurs prioritaires

      // Documents rejetés = haute priorité
      const hasRejectedDocs = user.documents.some(doc => doc.status === 'REJECTED')
      if (hasRejectedDocs) priorityScore += 4

      if (priorityScore >= 6) priority = 'HIGH'
      else if (priorityScore <= 2) priority = 'LOW'

      return {
        ...user,
        priority,
        priorityScore,
        daysSinceRegistration,
        validationInfo: getValidationInfo(user)
      }
    })

    // Filtrer par priorité si demandé
    const filteredUsers = priority && priority !== 'ALL' 
      ? usersWithPriority.filter(user => user.priority === priority)
      : usersWithPriority

    // Trier par priorité puis par date
    const sortedUsers = filteredUsers.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder]
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder]
      
      if (aPriority !== bPriority) return bPriority - aPriority
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    // Calculer les statistiques
    const stats = {
      total: pendingUsers.length,
      byRole: {
        DELIVERER: pendingUsers.filter(u => u.role === 'DELIVERER').length,
        MERCHANT: pendingUsers.filter(u => u.role === 'MERCHANT').length,
        PROVIDER: pendingUsers.filter(u => u.role === 'PROVIDER').length
      },
      byPriority: {
        HIGH: usersWithPriority.filter(u => u.priority === 'HIGH').length,
        MEDIUM: usersWithPriority.filter(u => u.priority === 'MEDIUM').length,
        LOW: usersWithPriority.filter(u => u.priority === 'LOW').length
      },
      byStatus: {}
    }

    // Compter par statut
    const allStatuses = ['PENDING_DOCUMENTS', 'DOCUMENTS_REJECTED', 'PENDING_VERIFICATION']
    allStatuses.forEach(status => {
      stats.byStatus[status] = pendingUsers.filter(user => {
        const roleData = user.deliverer || user.merchant || user.provider
        return roleData?.verificationStatus === status
      }).length
    })

    return NextResponse.json({
      users: sortedUsers.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        priority: user.priority,
        daysSinceRegistration: user.daysSinceRegistration,
        validationInfo: user.validationInfo,
        documentsCount: user.documents.length,
        lastDocumentUpload: user.documents[0]?.uploadedAt || null,
        createdAt: user.createdAt
      })),
      stats,
      pagination: {
        total: filteredUsers.length,
        limit,
        offset,
        hasMore: offset + limit < filteredUsers.length
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching pending validations')
  }
}

// POST - Approuver, rejeter ou suspendre un utilisateur
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = userValidationActionSchema.parse(body)

    // Récupérer l'utilisateur avec ses informations de rôle
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      include: {
        profile: true,
        deliverer: true,
        merchant: true,
        provider: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const roleData = user.deliverer || user.merchant || user.provider
    if (!roleData) {
      return NextResponse.json({ 
        error: 'User has no role-specific data' 
      }, { status: 400 })
    }

    let newStatus: string
    let updateData: any = {}

    switch (validatedData.action) {
      case 'APPROVE':
        newStatus = 'VERIFIED'
        updateData = {
          verificationStatus: newStatus,
          verifiedAt: new Date(),
          rejectionReason: null
        }
        break

      case 'REJECT':
        newStatus = 'REJECTED'
        updateData = {
          verificationStatus: newStatus,
          rejectionReason: validatedData.reason,
          verifiedAt: null
        }
        break

      case 'SUSPEND':
        newStatus = 'SUSPENDED'
        const suspensionEnd = validatedData.suspensionDuration 
          ? new Date(Date.now() + validatedData.suspensionDuration * 24 * 60 * 60 * 1000)
          : null
        updateData = {
          verificationStatus: newStatus,
          suspensionReason: validatedData.reason,
          suspendedUntil: suspensionEnd
        }
        break

      case 'REQUEST_DOCUMENTS':
        newStatus = 'PENDING_DOCUMENTS'
        updateData = {
          verificationStatus: newStatus,
          requiredDocuments: validatedData.requiredDocuments
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Mettre à jour les données du rôle
    const roleTable = user.role.toLowerCase()
    await prisma[roleTable].update({
      where: { userId: user.id },
      data: updateData
    })

    // Créer une notification pour l'utilisateur
    const notificationMessages = {
      APPROVE: `Félicitations ! Votre compte ${user.role.toLowerCase()} a été approuvé. Vous pouvez maintenant utiliser toutes les fonctionnalités de la plateforme.`,
      REJECT: `Votre demande d'inscription a été rejetée. Raison: ${validatedData.reason}`,
      SUSPEND: `Votre compte a été suspendu. Raison: ${validatedData.reason}`,
      REQUEST_DOCUMENTS: `Documents supplémentaires requis: ${validatedData.requiredDocuments?.join(', ')}. Veuillez les uploader dans votre espace personnel.`
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: `ACCOUNT_${validatedData.action}D`,
        title: validatedData.action === 'APPROVE' ? 'Compte approuvé' : 
               validatedData.action === 'REJECT' ? 'Compte rejeté' :
               validatedData.action === 'SUSPEND' ? 'Compte suspendu' :
               'Documents requis',
        message: notificationMessages[validatedData.action],
        data: {
          action: validatedData.action,
          reason: validatedData.reason,
          requiredDocuments: validatedData.requiredDocuments,
          suspensionDuration: validatedData.suspensionDuration
        }
      }
    })

    // Log de l'action pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `USER_${validatedData.action}`,
        entity: 'User',
        entityId: user.id,
        details: {
          targetUserId: user.id,
          targetUserRole: user.role,
          previousStatus: roleData.verificationStatus,
          newStatus,
          reason: validatedData.reason,
          requiredDocuments: validatedData.requiredDocuments,
          suspensionDuration: validatedData.suspensionDuration
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `User ${validatedData.action.toLowerCase()}d successfully`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        newStatus,
        actionTaken: validatedData.action,
        processedAt: new Date()
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'processing user validation action')
  }
}

// Fonction pour extraire les informations de validation selon le rôle
function getValidationInfo(user: any) {
  const roleData = user.deliverer || user.merchant || user.provider
  if (!roleData) return null

  const baseInfo = {
    status: roleData.verificationStatus,
    verifiedAt: roleData.verifiedAt,
    rejectionReason: roleData.rejectionReason
  }

  if (user.role === 'DELIVERER') {
    return {
      ...baseInfo,
      vehicleType: roleData.vehicleType,
      documentsUploaded: roleData.documentsUploaded,
      documentsStatus: analyzeDocuments(user.documents)
    }
  }

  if (user.role === 'MERCHANT') {
    return {
      ...baseInfo,
      businessName: roleData.businessName,
      businessType: roleData.businessType
    }
  }

  if (user.role === 'PROVIDER') {
    return {
      ...baseInfo,
      companyName: roleData.companyName,
      serviceTypes: roleData.serviceTypes
    }
  }

  return baseInfo
}

// Fonction pour analyser le statut des documents
function analyzeDocuments(documents: any[]) {
  const required = ['IDENTITY_CARD', 'DRIVING_LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION']
  
  return {
    total: documents.length,
    validated: documents.filter(d => d.status === 'VALIDATED').length,
    pending: documents.filter(d => d.status === 'PENDING').length,
    rejected: documents.filter(d => d.status === 'REJECTED').length,
    missingRequired: required.filter(type => 
      !documents.some(doc => doc.type === type && doc.status === 'VALIDATED')
    )
  }
}