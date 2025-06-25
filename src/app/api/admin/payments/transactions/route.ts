import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour filtres de transactions
const transactionFiltersSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  type: z.enum(['DELIVERY', 'SERVICE', 'STORAGE_RENTAL', 'SUBSCRIPTION', 'COMMISSION', 'REFUND']).optional(),
  userId: z.string().cuid().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'WALLET', 'PAYPAL']).optional()
})

// Schema pour actions sur transactions
const transactionActionSchema = z.object({
  transactionId: z.string().cuid(),
  action: z.enum(['APPROVE', 'CANCEL', 'REFUND', 'RETRY']),
  reason: z.string().min(5).max(500).optional(),
  refundAmount: z.number().min(0).optional()
})

// GET - Liste des transactions avec filtres avancés
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
    const filters = {
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      userId: searchParams.get('userId'),
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      paymentMethod: searchParams.get('paymentMethod')
    }

    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const exportFormat = searchParams.get('export') // 'csv' ou 'excel'

    // Construire les conditions WHERE
    const whereConditions: any = {}

    if (filters.status) whereConditions.status = filters.status
    if (filters.type) whereConditions.type = filters.type
    if (filters.userId) whereConditions.userId = filters.userId
    if (filters.paymentMethod) whereConditions.paymentMethod = filters.paymentMethod

    if (filters.minAmount || filters.maxAmount) {
      whereConditions.amount = {}
      if (filters.minAmount) whereConditions.amount.gte = filters.minAmount
      if (filters.maxAmount) whereConditions.amount.lte = filters.maxAmount
    }

    if (filters.startDate || filters.endDate) {
      whereConditions.createdAt = {}
      if (filters.startDate) whereConditions.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) whereConditions.createdAt.lte = new Date(filters.endDate)
    }

    // Récupérer les transactions
    const transactions = await prisma.payment.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      ...(exportFormat ? {} : { take: limit, skip: offset })
    })

    // Si export demandé, générer le fichier
    if (exportFormat) {
      return generateTransactionExport(transactions, exportFormat)
    }

    // Calculer les statistiques
    const stats = await calculateTransactionStats(whereConditions)

    // Enrichir les données des transactions
    const enrichedTransactions = transactions.map(transaction => {
      const metadata = transaction.metadata ? JSON.parse(transaction.metadata as string) : {}
      
      return {
        ...transaction,
        metadata,
        user: {
          ...transaction.user,
          fullName: `${transaction.user.profile?.firstName || ''} ${transaction.user.profile?.lastName || ''}`.trim()
        },
        riskScore: calculateRiskScore(transaction),
        canRefund: canRefundTransaction(transaction),
        canCancel: canCancelTransaction(transaction),
        relatedEntities: getRelatedEntities(metadata)
      }
    })

    return NextResponse.json({
      transactions: enrichedTransactions,
      stats,
      pagination: {
        total: enrichedTransactions.length,
        limit,
        offset,
        hasMore: transactions.length === limit
      },
      filters: {
        applied: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined)
        ),
        available: {
          statuses: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'],
          types: ['DELIVERY', 'SERVICE', 'STORAGE_RENTAL', 'SUBSCRIPTION', 'COMMISSION', 'REFUND'],
          paymentMethods: ['CARD', 'BANK_TRANSFER', 'WALLET', 'PAYPAL']
        }
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching payment transactions')
  }
}

// POST - Actions sur les transactions (approuver, annuler, rembourser)
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
    const validatedData = transactionActionSchema.parse(body)

    // Récupérer la transaction
    const transaction = await prisma.payment.findUnique({
      where: { id: validatedData.transactionId },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    let result
    switch (validatedData.action) {
      case 'APPROVE':
        result = await approveTransaction(transaction, session.user.id, validatedData.reason)
        break
      case 'CANCEL':
        result = await cancelTransaction(transaction, session.user.id, validatedData.reason)
        break
      case 'REFUND':
        result = await refundTransaction(
          transaction, 
          session.user.id, 
          validatedData.reason,
          validatedData.refundAmount
        )
        break
      case 'RETRY':
        result = await retryTransaction(transaction, session.user.id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log de l'action pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `PAYMENT_${validatedData.action}`,
        entity: 'Payment',
        entityId: transaction.id,
        details: {
          previousStatus: transaction.status,
          newStatus: result.newStatus,
          reason: validatedData.reason,
          amount: transaction.amount,
          refundAmount: validatedData.refundAmount,
          userId: transaction.userId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Transaction ${validatedData.action.toLowerCase()}d successfully`,
      transaction: result.transaction,
      newStatus: result.newStatus
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'processing transaction action')
  }
}

// Fonctions utilitaires
async function calculateTransactionStats(whereConditions: any) {
  // Statistiques générales
  const totalTransactions = await prisma.payment.count({ where: whereConditions })
  
  const amountStats = await prisma.payment.aggregate({
    where: whereConditions,
    _sum: { amount: true },
    _avg: { amount: true },
    _max: { amount: true },
    _min: { amount: true }
  })

  // Répartition par statut
  const statusStats = await prisma.payment.groupBy({
    where: whereConditions,
    by: ['status'],
    _count: { status: true },
    _sum: { amount: true }
  })

  // Répartition par type
  const typeStats = await prisma.payment.groupBy({
    where: whereConditions,
    by: ['type'],
    _count: { type: true },
    _sum: { amount: true }
  })

  // Transactions aujourd'hui
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayStats = await prisma.payment.aggregate({
    where: {
      ...whereConditions,
      createdAt: { gte: today }
    },
    _count: true,
    _sum: { amount: true }
  })

  return {
    total: {
      transactions: totalTransactions,
      amount: amountStats._sum.amount || 0,
      average: amountStats._avg.amount || 0,
      highest: amountStats._max.amount || 0,
      lowest: amountStats._min.amount || 0
    },
    today: {
      transactions: todayStats._count,
      amount: todayStats._sum.amount || 0
    },
    byStatus: statusStats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: stat._count.status,
        amount: stat._sum.amount || 0
      }
      return acc
    }, {} as Record<string, any>),
    byType: typeStats.reduce((acc, stat) => {
      acc[stat.type] = {
        count: stat._count.type,
        amount: stat._sum.amount || 0
      }
      return acc
    }, {} as Record<string, any>)
  }
}

function calculateRiskScore(transaction: any): number {
  let score = 0
  
  // Montant élevé
  if (transaction.amount > 1000) score += 3
  else if (transaction.amount > 500) score += 2
  else if (transaction.amount > 200) score += 1
  
  // Statut suspect
  if (transaction.status === 'FAILED') score += 2
  if (transaction.status === 'PENDING') score += 1
  
  // Nouvel utilisateur (créé dans les 7 derniers jours)
  const userAge = Date.now() - new Date(transaction.createdAt).getTime()
  if (userAge < 7 * 24 * 60 * 60 * 1000) score += 2
  
  return Math.min(score, 10) // Max 10
}

function canRefundTransaction(transaction: any): boolean {
  return transaction.status === 'COMPLETED' && 
         transaction.type !== 'REFUND' &&
         transaction.amount > 0
}

function canCancelTransaction(transaction: any): boolean {
  return transaction.status === 'PENDING'
}

function getRelatedEntities(metadata: any): any {
  const entities = []
  
  if (metadata.deliveryId) {
    entities.push({ type: 'delivery', id: metadata.deliveryId })
  }
  if (metadata.serviceBookingId) {
    entities.push({ type: 'service', id: metadata.serviceBookingId })
  }
  if (metadata.announcementId) {
    entities.push({ type: 'announcement', id: metadata.announcementId })
  }
  
  return entities
}

async function approveTransaction(transaction: any, adminId: string, reason?: string) {
  if (transaction.status !== 'PENDING') {
    throw new Error('Only pending transactions can be approved')
  }

  const updatedTransaction = await prisma.payment.update({
    where: { id: transaction.id },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
      adminNotes: reason
    }
  })

  // Notification à l'utilisateur
  await prisma.notification.create({
    data: {
      userId: transaction.userId,
      type: 'PAYMENT_APPROVED',
      title: 'Paiement approuvé',
      message: `Votre paiement de ${transaction.amount}¬ a été approuvé.`,
      data: {
        paymentId: transaction.id,
        amount: transaction.amount
      }
    }
  })

  return {
    transaction: updatedTransaction,
    newStatus: 'COMPLETED'
  }
}

async function cancelTransaction(transaction: any, adminId: string, reason?: string) {
  if (!['PENDING', 'FAILED'].includes(transaction.status)) {
    throw new Error('Only pending or failed transactions can be cancelled')
  }

  const updatedTransaction = await prisma.payment.update({
    where: { id: transaction.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      adminNotes: reason
    }
  })

  // Notification à l'utilisateur
  await prisma.notification.create({
    data: {
      userId: transaction.userId,
      type: 'PAYMENT_CANCELLED',
      title: 'Paiement annulé',
      message: `Votre paiement de ${transaction.amount}¬ a été annulé. ${reason ? `Raison: ${reason}` : ''}`,
      data: {
        paymentId: transaction.id,
        amount: transaction.amount,
        reason
      }
    }
  })

  return {
    transaction: updatedTransaction,
    newStatus: 'CANCELLED'
  }
}

async function refundTransaction(transaction: any, adminId: string, reason?: string, refundAmount?: number) {
  if (transaction.status !== 'COMPLETED') {
    throw new Error('Only completed transactions can be refunded')
  }

  const finalRefundAmount = refundAmount || transaction.amount

  if (finalRefundAmount > transaction.amount) {
    throw new Error('Refund amount cannot exceed original amount')
  }

  // Créer une transaction de remboursement
  const refundTransaction = await prisma.payment.create({
    data: {
      userId: transaction.userId,
      amount: -finalRefundAmount,
      currency: transaction.currency,
      type: 'REFUND',
      status: 'COMPLETED',
      paymentMethod: transaction.paymentMethod,
      metadata: JSON.stringify({
        originalTransactionId: transaction.id,
        refundReason: reason
      })
    }
  })

  // Mettre à jour la transaction originale
  const updatedTransaction = await prisma.payment.update({
    where: { id: transaction.id },
    data: {
      status: finalRefundAmount === transaction.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAt: new Date(),
      refundedAmount: finalRefundAmount,
      adminNotes: reason
    }
  })

  // Notification à l'utilisateur
  await prisma.notification.create({
    data: {
      userId: transaction.userId,
      type: 'PAYMENT_REFUNDED',
      title: 'Remboursement effectué',
      message: `Un remboursement de ${finalRefundAmount}¬ a été effectué. ${reason ? `Raison: ${reason}` : ''}`,
      data: {
        originalPaymentId: transaction.id,
        refundPaymentId: refundTransaction.id,
        refundAmount: finalRefundAmount,
        reason
      }
    }
  })

  return {
    transaction: updatedTransaction,
    refundTransaction,
    newStatus: updatedTransaction.status
  }
}

async function retryTransaction(transaction: any, adminId: string) {
  if (transaction.status !== 'FAILED') {
    throw new Error('Only failed transactions can be retried')
  }

  const updatedTransaction = await prisma.payment.update({
    where: { id: transaction.id },
    data: {
      status: 'PENDING',
      retryCount: (transaction.retryCount || 0) + 1,
      lastRetryAt: new Date()
    }
  })

  // TODO: Relancer le processus de paiement avec Stripe
  
  return {
    transaction: updatedTransaction,
    newStatus: 'PENDING'
  }
}

async function generateTransactionExport(transactions: any[], format: string) {
  if (format === 'csv') {
    const csv = generateCSV(transactions)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.csv`
      }
    })
  }
  
  // Pour Excel, on retournerait un fichier XLSX
  return NextResponse.json({ error: 'Export format not implemented' }, { status: 501 })
}

function generateCSV(transactions: any[]): string {
  const headers = ['ID', 'Date', 'User', 'Amount', 'Currency', 'Type', 'Status', 'Payment Method']
  const rows = transactions.map(t => [
    t.id,
    t.createdAt.toISOString(),
    t.user.email,
    t.amount,
    t.currency,
    t.type,
    t.status,
    t.paymentMethod || 'N/A'
  ])
  
  return [headers, ...rows].map(row => row.join(',')).join('\n')
}