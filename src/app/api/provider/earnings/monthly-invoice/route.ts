import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { handleApiError, createError } from '@/lib/errors'
import jsPDF from 'jspdf'
import { ecoLogger } from '@/lib/logger'

const invoiceQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // Format: YYYY-MM
  action: z.enum(['generate', 'regenerate', 'preview']).optional().default('preview')
})

// GET - Récupérer les factures mensuelles du prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Si un mois spécifique est demandé
    if (month) {
      const invoice = await getOrCreateMonthlyInvoice(session.user.id, month)
      return NextResponse.json({
        success: true,
        data: invoice
      })
    }

    // Sinon, récupérer l'historique des factures
    const invoices = await prisma.monthlyProviderInvoice.findMany({
      where: { 
        providerId: session.user.id,
        ...(year && { 
          invoiceDate: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${parseInt(year) + 1}-01-01`)
          }
        })
      },
      orderBy: { invoiceDate: 'desc' },
      take: 12, // Derniers 12 mois
      include: {
        lineItems: {
          include: {
            booking: {
              include: {
                service: true,
                client: {
                  select: { firstName: true, lastName: true, email: true }
                }
              }
            }
          }
        }
      }
    })

    // Statistiques des revenus
    const stats = await calculateEarningsStats(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        statistics: stats,
        nextInvoiceDate: getNextInvoiceDate()
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Générer manuellement une facture mensuelle
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const body = await request.json()
    const { month, action } = invoiceQuerySchema.parse(body)

    // Vérifier si l'utilisateur peut générer une facture pour ce mois
    const targetDate = new Date(`${month}-01`)
    const now = new Date()
    
    // Ne peut générer que pour les mois passés ou le mois en cours après le 25
    if (targetDate > now && now.getDate() < 25) {
      return handleApiError(createError.validation.invalidDate('Cannot generate invoice for future month'))
    }

    const invoice = await generateMonthlyInvoice(session.user.id, month)

    if (action === 'generate') {
      // Marquer comme générée et envoyer pour paiement
      await processInvoiceForPayment(invoice.id)
    }

    ecoLogger.admin.monthlyBilling(session.user.id, invoice.id, invoice.totalAmount)

    return NextResponse.json({
      success: true,
      message: `Facture ${action === 'generate' ? 'générée et envoyée pour paiement' : 'calculée'}`,
      data: invoice
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// Fonction pour récupérer ou créer une facture mensuelle
async function getOrCreateMonthlyInvoice(providerId: string, month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

  // Vérifier si la facture existe déjà
  let invoice = await prisma.monthlyProviderInvoice.findFirst({
    where: {
      providerId,
      invoiceDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      lineItems: {
        include: {
          booking: {
            include: {
              service: true,
              client: {
                select: { firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      }
    }
  })

  if (!invoice) {
    invoice = await generateMonthlyInvoice(providerId, month)
  }

  return invoice
}

// Fonction principale de génération de facture
async function generateMonthlyInvoice(providerId: string, month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

  return await prisma.$transaction(async (tx) => {
    // Récupérer les prestations complétées du mois
    const completedBookings = await tx.serviceBooking.findMany({
      where: {
        providerId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: true,
        client: {
          select: { firstName: true, lastName: true, email: true }
        },
        payment: true
      }
    })

    if (completedBookings.length === 0) {
      throw new Error('Aucune prestation complétée ce mois-ci')
    }

    // Calculer les montants
    const subtotal = completedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
    const commissionRate = 0.15 // 15% de commission EcoDeli
    const commissionAmount = subtotal * commissionRate
    const totalAmount = subtotal - commissionAmount
    const vatAmount = totalAmount * 0.20 // TVA 20%

    // Générer le numéro de facture
    const invoiceNumber = `PROV-${year}${monthNum.toString().padStart(2, '0')}-${providerId.slice(-6).toUpperCase()}`

    // Créer la facture
    const invoice = await tx.monthlyProviderInvoice.create({
      data: {
        providerId,
        invoiceNumber,
        invoiceDate: endDate,
        month: monthNum,
        year,
        subtotalAmount: subtotal,
        commissionAmount,
        vatAmount,
        totalAmount,
        status: 'GENERATED',
        lineItems: {
          create: completedBookings.map(booking => ({
            bookingId: booking.id,
            description: `${booking.service.name} - ${booking.client.firstName} ${booking.client.lastName}`,
            quantity: 1,
            unitPrice: booking.totalPrice,
            totalPrice: booking.totalPrice,
            serviceDate: booking.completedAt!,
            commissionRate
          }))
        }
      },
      include: {
        lineItems: {
          include: {
            booking: {
              include: {
                service: true,
                client: {
                  select: { firstName: true, lastName: true, email: true }
                }
              }
            }
          }
        }
      }
    })

    // Générer le PDF
    const pdfBuffer = await generateInvoicePDF(invoice)
    
    // Sauvegarder le PDF
    await tx.monthlyProviderInvoice.update({
      where: { id: invoice.id },
      data: {
        pdfPath: `/invoices/providers/${invoice.invoiceNumber}.pdf`,
        pdfGenerated: true
      }
    })

    return invoice
  })
}

// Fonction pour traiter la facture pour paiement
async function processInvoiceForPayment(invoiceId: string) {
  return await prisma.$transaction(async (tx) => {
    // Marquer la facture comme envoyée
    const invoice = await tx.monthlyProviderInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            bankDetails: true
          }
        }
      }
    })

    // Créer un ordre de virement bancaire
    await tx.bankTransfer.create({
      data: {
        providerId: invoice.providerId,
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        currency: 'EUR',
        recipientName: `${invoice.provider.firstName} ${invoice.provider.lastName}`,
        recipientIban: invoice.provider.bankDetails?.iban || '',
        recipientBic: invoice.provider.bankDetails?.bic || '',
        reference: `Facture ${invoice.invoiceNumber}`,
        status: 'PENDING',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      }
    })

    return invoice
  })
}

// Génération du PDF de facture
async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  const doc = new jsPDF()
  
  // En-tête EcoDeli
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('EcoDeli', 20, 30)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Plateforme de services collaboratifs', 20, 40)
  doc.text('123 Avenue des Services', 20, 50)
  doc.text('75001 Paris, France', 20, 60)
  doc.text('contact@ecodeli.fr', 20, 70)
  
  // Informations facture
  doc.setFontSize(16)
  doc.setTextColor(40, 40, 40)
  doc.text(`Facture ${invoice.invoiceNumber}`, 120, 30)
  
  doc.setFontSize(10)
  doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}`, 120, 45)
  doc.text(`Période: ${new Date(invoice.year, invoice.month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`, 120, 55)
  doc.text(`Statut: ${invoice.status}`, 120, 65)
  
  // Informations prestataire
  doc.setFontSize(12)
  doc.text('Facturé à:', 20, 100)
  doc.setFontSize(10)
  doc.text(`${invoice.provider?.firstName || ''} ${invoice.provider?.lastName || ''}`, 20, 110)
  doc.text(invoice.provider?.email || '', 20, 120)
  
  // Tableau des prestations
  let yPosition = 150
  doc.setFontSize(12)
  doc.text('Détail des prestations:', 20, yPosition)
  
  yPosition += 20
  doc.setFontSize(8)
  doc.text('Date', 20, yPosition)
  doc.text('Prestation', 50, yPosition)
  doc.text('Client', 120, yPosition)
  doc.text('Montant', 170, yPosition)
  
  yPosition += 10
  invoice.lineItems?.forEach((item: any) => {
    doc.text(new Date(item.serviceDate).toLocaleDateString('fr-FR'), 20, yPosition)
    doc.text(item.description.substring(0, 30), 50, yPosition)
    doc.text(`${item.booking?.client?.firstName || ''} ${item.booking?.client?.lastName || ''}`, 120, yPosition)
    doc.text(`${item.totalPrice.toFixed(2)} ¬`, 170, yPosition)
    yPosition += 10
  })
  
  // Totaux
  yPosition += 20
  doc.setFontSize(10)
  doc.text(`Sous-total: ${invoice.subtotalAmount.toFixed(2)} ¬`, 120, yPosition)
  doc.text(`Commission EcoDeli (${(invoice.commissionAmount / invoice.subtotalAmount * 100).toFixed(1)}%): -${invoice.commissionAmount.toFixed(2)} ¬`, 120, yPosition + 10)
  doc.text(`TVA (20%): ${invoice.vatAmount.toFixed(2)} ¬`, 120, yPosition + 20)
  
  doc.setFontSize(12)
  doc.setTextColor(0, 100, 0)
  doc.text(`TOTAL NET: ${invoice.totalAmount.toFixed(2)} ¬`, 120, yPosition + 35)
  
  // Conditions de paiement
  yPosition += 60
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Conditions de paiement: Virement bancaire sous 7 jours', 20, yPosition)
  doc.text('Cette facture est générée automatiquement et ne nécessite pas de signature', 20, yPosition + 10)
  
  return Buffer.from(doc.output('arraybuffer'))
}

// Calcul des statistiques de revenus
async function calculateEarningsStats(providerId: string) {
  const currentYear = new Date().getFullYear()
  
  const yearlyStats = await prisma.monthlyProviderInvoice.aggregate({
    where: {
      providerId,
      year: currentYear
    },
    _sum: {
      totalAmount: true,
      subtotalAmount: true,
      commissionAmount: true
    },
    _count: {
      id: true
    }
  })
  
  const monthlyBookings = await prisma.serviceBooking.groupBy({
    by: ['completedAt'],
    where: {
      providerId,
      status: 'COMPLETED',
      completedAt: {
        gte: new Date(currentYear, 0, 1)
      }
    },
    _sum: {
      totalPrice: true
    },
    _count: {
      id: true
    }
  })
  
  return {
    yearlyRevenue: yearlyStats._sum.totalAmount || 0,
    yearlyGrossRevenue: yearlyStats._sum.subtotalAmount || 0,
    yearlyCommissions: yearlyStats._sum.commissionAmount || 0,
    invoicesCount: yearlyStats._count.id || 0,
    averageMonthlyRevenue: (yearlyStats._sum.totalAmount || 0) / Math.max(1, yearlyStats._count.id),
    monthlyBreakdown: monthlyBookings.map(month => ({
      month: month.completedAt,
      revenue: month._sum.totalPrice || 0,
      bookings: month._count.id
    }))
  }
}

// Calculer la prochaine date de facturation (25 du mois)
function getNextInvoiceDate(): Date {
  const now = new Date()
  const nextInvoice = new Date(now.getFullYear(), now.getMonth(), 25)
  
  // Si le 25 est passé, passer au mois suivant
  if (now.getDate() >= 25) {
    nextInvoice.setMonth(nextInvoice.getMonth() + 1)
  }
  
  return nextInvoice
}