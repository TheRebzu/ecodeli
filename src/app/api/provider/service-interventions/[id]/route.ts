import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateServiceInterventionSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'PAYMENT_PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
  actualDuration: z.number().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: interventionId } = await params

    const intervention = await prisma.serviceIntervention.findUnique({
      where: { id: interventionId },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        serviceRequest: true,
        payment: true,
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    if (!intervention) {
      return NextResponse.json({ error: 'Service intervention not found' }, { status: 404 })
    }

    // Vérifier que l'intervention appartient au provider
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider || intervention.providerId !== provider.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ intervention })

  } catch (error) {
    console.error('Error fetching service intervention:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: interventionId } = await params
    const body = await request.json()
    const validatedData = updateServiceInterventionSchema.parse(body)

    // Vérifier que l'intervention existe et appartient au prestataire
    const existingIntervention = await prisma.serviceIntervention.findUnique({
      where: { id: interventionId },
      include: {
        client: true,
        serviceRequest: true,
        payment: true,
        provider: {
          include: {
            user: true
          }
        }
      }
    })

    if (!existingIntervention) {
      return NextResponse.json({ error: 'Service intervention not found' }, { status: 404 })
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider || existingIntervention.providerId !== provider.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Vérifier les transitions de statut autorisées
    const allowedTransitions = {
      'SCHEDULED': ['IN_PROGRESS', 'CANCELLED'],
      'CONFIRMED': ['IN_PROGRESS', 'CANCELLED'],
      'PAYMENT_PENDING': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // État final
      'CANCELLED': [] // État final
    }

    const currentStatus = existingIntervention.status
    const newStatus = validatedData.status

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Transition non autorisée de ${currentStatus} vers ${newStatus}` 
      }, { status: 400 })
    }

    // Mettre à jour l'intervention
    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    if (validatedData.actualDuration !== undefined) {
      updateData.actualDuration = validatedData.actualDuration
    }

    // Si l'intervention est annulée, annuler le paiement
    if (validatedData.status === 'CANCELLED' && existingIntervention.paymentId) {
      await prisma.payment.update({
        where: { id: existingIntervention.paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          metadata: {
            ...existingIntervention.payment?.metadata,
            cancelledBy: session.user.id,
            cancelledAt: new Date().toISOString(),
            reason: 'Service intervention cancelled'
          }
        }
      })

      // Créer une notification pour le client
      await prisma.notification.create({
        data: {
          userId: existingIntervention.clientId,
          type: 'SERVICE_CANCELLED',
          title: 'Service annulé',
          message: `Votre service "${existingIntervention.title}" a été annulé. Le remboursement sera traité.`,
          data: {
            interventionId: interventionId,
            paymentId: existingIntervention.paymentId,
            refundAmount: existingIntervention.payment?.amount
          }
        }
      })
    }

    // Si l'intervention est terminée, débloquer le paiement
    if (validatedData.status === 'COMPLETED' && existingIntervention.paymentId) {
      await prisma.payment.update({
        where: { id: existingIntervention.paymentId },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          metadata: {
            ...existingIntervention.payment?.metadata,
            completedAt: new Date().toISOString(),
            actualDuration: validatedData.actualDuration
          }
        }
      })

      // Créer une notification pour le client
      await prisma.notification.create({
        data: {
          userId: existingIntervention.clientId,
          type: 'SERVICE_COMPLETED',
          title: 'Service terminé',
          message: `Votre service "${existingIntervention.title}" a été terminé avec succès.`,
          data: {
            interventionId: interventionId,
            paymentId: existingIntervention.paymentId
          }
        }
      })
    }

    // Si l'intervention passe en cours, créer une notification
    if (validatedData.status === 'IN_PROGRESS') {
      await prisma.notification.create({
        data: {
          userId: existingIntervention.clientId,
          type: 'SERVICE_STARTED',
          title: 'Service commencé',
          message: `Votre prestataire a commencé le service "${existingIntervention.title}".`,
          data: {
            interventionId: interventionId,
            providerId: provider.id
          }
        }
      })
    }

    const updatedIntervention = await prisma.serviceIntervention.update({
      where: { id: interventionId },
      data: updateData,
      include: {
        client: {
          include: {
            profile: true
          }
        },
        serviceRequest: true,
        payment: true,
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true,
      intervention: updatedIntervention,
      message: `Intervention ${validatedData.status.toLowerCase()} avec succès`
    })

  } catch (error) {
    console.error('Error updating service intervention:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 