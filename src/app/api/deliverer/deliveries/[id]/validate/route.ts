import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour validation de livraison
const validateDeliverySchema = z.object({
  validationCode: z.string().length(6, 'Le code doit contenir exactement 6 chiffres').regex(/^\d{6}$/, 'Le code doit contenir uniquement des chiffres'),
  deliveryProof: z.object({
    photo: z.string().url().optional(),
    signature: z.string().optional(),
    notes: z.string().max(500).optional(),
    gpsCoordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  }).optional(),
  issues: z.array(z.object({
    type: z.enum(['RECIPIENT_ABSENT', 'ADDRESS_NOT_FOUND', 'PACKAGE_DAMAGED', 'ACCESS_DENIED', 'OTHER']),
    description: z.string().max(500),
    photo: z.string().url().optional()
  })).optional()
})

// POST - Valider une livraison avec le code � 6 chiffres
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer only' }, { status: 403 })
    }

    const deliveryId = params.id
    const body = await request.json()
    const validatedData = validateDeliverySchema.parse(body)

    // R�cup�rer la livraison avec toutes les informations n�cessaires
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliverer: {
          include: {
            user: {
              select: { id: true, profile: { select: { firstName: true, lastName: true } } }
            }
          }
        },
        announcement: {
          include: {
            client: {
              include: {
                user: {
                  select: { id: true, profile: { select: { firstName: true, lastName: true } } }
                }
              }
            }
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // V�rifier que le livreur est bien assign� � cette livraison
    if (delivery.deliverer.userId !== user.id) {
      return NextResponse.json({ 
        error: 'You are not assigned to this delivery' 
      }, { status: 403 })
    }

    // V�rifier le statut de la livraison
    if (delivery.status !== 'IN_TRANSIT') {
      return NextResponse.json({
        error: 'Delivery cannot be validated',
        currentStatus: delivery.status,
        allowedStatus: 'IN_TRANSIT'
      }, { status: 409 })
    }

    // V�rifier le code de validation
    if (delivery.validationCode !== validatedData.validationCode) {
      // Enregistrer la tentative �chou�e
      await prisma.deliveryValidationAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptedCode: validatedData.validationCode,
          success: false,
          attemptedAt: new Date(),
          attemptedBy: user.id
        }
      })

      // Compter les tentatives �chou�es r�centes (derni�res 30 minutes)
      const recentFailedAttempts = await prisma.deliveryValidationAttempt.count({
        where: {
          deliveryId: delivery.id,
          success: false,
          attemptedAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
          }
        }
      })

      // Bloquer temporairement apr�s 3 tentatives �chou�es
      if (recentFailedAttempts >= 3) {
        return NextResponse.json({
          error: 'Too many failed attempts',
          message: 'Account temporarily locked. Please try again in 30 minutes.',
          attemptsRemaining: 0,
          lockUntil: new Date(Date.now() + 30 * 60 * 1000)
        }, { status: 429 })
      }

      return NextResponse.json({
        error: 'Invalid validation code',
        attemptsRemaining: 3 - recentFailedAttempts,
        hint: recentFailedAttempts >= 2 ? 'Contactez le client pour confirmer le code' : null
      }, { status: 400 })
    }

    // Code correct - enregistrer la tentative r�ussie
    await prisma.deliveryValidationAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptedCode: validatedData.validationCode,
        success: true,
        attemptedAt: new Date(),
        attemptedBy: user.id
      }
    })

    // D�terminer le statut final
    const hasIssues = validatedData.issues && validatedData.issues.length > 0
    const finalStatus = hasIssues ? 'DELIVERED_WITH_ISSUES' : 'DELIVERED'

    // Mettre � jour la livraison
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: finalStatus,
        validatedAt: new Date(),
        deliveryProof: validatedData.deliveryProof ? JSON.stringify(validatedData.deliveryProof) : null,
        issues: hasIssues ? JSON.stringify(validatedData.issues) : null,
        completedAt: new Date()
      }
    })

    // Calculer la commission du livreur (10% du prix)
    const delivererCommission = Math.round(delivery.price * 0.10 * 100) / 100

    // Cr�er la transaction de paiement pour le livreur
    const delivererPayment = await prisma.payment.create({
      data: {
        userId: delivery.deliverer.userId,
        amount: delivererCommission,
        currency: 'EUR',
        type: 'DELIVERY_COMMISSION',
        status: 'COMPLETED',
        metadata: {
          deliveryId: delivery.id,
          commissionRate: 0.10,
          originalAmount: delivery.price
        }
      }
    })

    // Mettre � jour le portefeuille du livreur
    await prisma.wallet.upsert({
      where: { userId: delivery.deliverer.userId },
      update: {
        balance: {
          increment: delivererCommission
        },
        totalEarnings: {
          increment: delivererCommission
        }
      },
      create: {
        userId: delivery.deliverer.userId,
        balance: delivererCommission,
        totalEarnings: delivererCommission
      }
    })

    // Cr�er les notifications
    const notifications = []

    // Notification pour le client
    notifications.push(prisma.notification.create({
      data: {
        userId: delivery.announcement.client.userId,
        type: hasIssues ? 'DELIVERY_COMPLETED_WITH_ISSUES' : 'DELIVERY_COMPLETED',
        title: hasIssues ? 'Livraison termin�e avec signalements' : 'Livraison termin�e',
        message: hasIssues 
          ? `Votre livraison a �t� effectu�e avec quelques signalements. Consultez les d�tails.`
          : `Votre livraison a �t� effectu�e avec succ�s par ${delivery.deliverer.user.profile?.firstName}.`,
        data: {
          deliveryId: delivery.id,
          delivererId: delivery.deliverer.userId,
          hasIssues,
          validatedAt: new Date()
        }
      }
    }))

    // Notification pour le livreur
    notifications.push(prisma.notification.create({
      data: {
        userId: delivery.deliverer.userId,
        type: 'DELIVERY_PAYMENT_RECEIVED',
        title: 'Paiement re�u',
        message: `Vous avez re�u ${delivererCommission}� pour la livraison termin�e.`,
        data: {
          deliveryId: delivery.id,
          amount: delivererCommission,
          paymentId: delivererPayment.id
        }
      }
    }))

    await Promise.all(notifications)

    // Log de l'action pour audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELIVERY_VALIDATED',
        entity: 'Delivery',
        entityId: delivery.id,
        details: {
          validationCode: validatedData.validationCode,
          finalStatus,
          hasIssues,
          issuesCount: validatedData.issues?.length || 0,
          commissionPaid: delivererCommission,
          clientId: delivery.announcement.client.userId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: hasIssues 
        ? 'Livraison valid�e avec signalements'
        : 'Livraison valid�e avec succ�s',
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        validatedAt: updatedDelivery.validatedAt,
        completedAt: updatedDelivery.completedAt,
        hasIssues
      },
      payment: {
        commission: delivererCommission,
        paymentId: delivererPayment.id,
        currency: 'EUR'
      },
      nextSteps: hasIssues 
        ? ['Client notifi� des signalements', 'R�solution en cours']
        : ['Livraison termin�e', '�valuation disponible']
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'validating delivery')
  }
}

// GET - Obtenir les informations de validation d'une livraison
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deliveryId = params.id

    // R�cup�rer la livraison avec les informations de validation
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliverer: {
          include: {
            user: {
              select: { id: true, profile: { select: { firstName: true, lastName: true } } }
            }
          }
        },
        announcement: {
          include: {
            client: {
              include: {
                user: {
                  select: { id: true, profile: { select: { firstName: true, lastName: true } } }
                }
              }
            }
          }
        },
        validationAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // V�rifier les permissions
    const canView = user.role === 'ADMIN' || 
                   delivery.deliverer.userId === user.id ||
                   delivery.announcement.client.userId === user.id

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Compter les tentatives �chou�es r�centes
    const recentFailedAttempts = delivery.validationAttempts.filter(
      attempt => !attempt.success && 
      attempt.attemptedAt > new Date(Date.now() - 30 * 60 * 1000)
    ).length

    const isLocked = recentFailedAttempts >= 3
    const lockUntil = isLocked ? new Date(Date.now() + 30 * 60 * 1000) : null

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        canValidate: delivery.status === 'IN_TRANSIT' && !isLocked,
        validatedAt: delivery.validatedAt,
        completedAt: delivery.completedAt,
        hasValidationCode: !!delivery.validationCode,
        deliveryProof: delivery.deliveryProof ? JSON.parse(delivery.deliveryProof) : null,
        issues: delivery.issues ? JSON.parse(delivery.issues) : null
      },
      validation: {
        attemptsRemaining: Math.max(0, 3 - recentFailedAttempts),
        isLocked,
        lockUntil,
        totalAttempts: delivery.validationAttempts.length,
        lastAttempt: delivery.validationAttempts[0] || null
      },
      permissions: {
        canValidate: user.role === 'DELIVERER' && delivery.deliverer.userId === user.id,
        canViewCode: user.role === 'ADMIN' || delivery.announcement.client.userId === user.id,
        canViewAttempts: user.role === 'ADMIN'
      },
      // Code visible seulement pour le client et admin
      ...(user.role === 'ADMIN' || delivery.announcement.client.userId === user.id ? {
        validationCode: delivery.validationCode
      } : {})
    })

  } catch (error) {
    return handleApiError(error, 'fetching delivery validation info')
  }
}