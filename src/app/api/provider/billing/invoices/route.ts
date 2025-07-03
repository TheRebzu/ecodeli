import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Récupérer les factures du prestataire
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Construire les conditions de recherche
    const where: any = {
      providerId,
    }

    if (status) {
      where.status = status
    }

    // Récupérer les factures mensuelles du prestataire
    const [invoices, totalCount] = await Promise.all([
      prisma.providerMonthlyInvoice.findMany({
        where,
        include: {
          interventions: {
            include: {
              intervention: {
                include: {
                  booking: {
                    include: {
                      service: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          provider: {
            include: {
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.providerMonthlyInvoice.count({ where }),
    ])

    // Formater les données
    const formattedInvoices = invoices.map(invoice => {
      // Calculer les dates de période pour le mois/année
      const periodStart = new Date(invoice.year, invoice.month - 1, 1);
      const periodEnd = new Date(invoice.year, invoice.month, 0); // Dernier jour du mois

      return {
        id: invoice.id,
        type: "PROVIDER_MONTHLY",
        status: invoice.status,
        invoiceNumber: invoice.invoiceNumber,
        month: invoice.month,
        year: invoice.year,
        totalAmount: invoice.totalAmount,
        netAmount: invoice.netAmount,
        commissionAmount: invoice.commissionAmount,
        commissionRate: invoice.commissionRate,
        totalHours: invoice.totalHours,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        sentAt: invoice.sentAt?.toISOString(),
        paidAt: invoice.paidAt?.toISOString(),
        invoiceUrl: invoice.invoiceUrl,
        createdAt: invoice.createdAt.toISOString(),
        itemsCount: invoice.interventions.length,
        interventions: invoice.interventions.map(item => ({
          id: item.intervention.id,
          serviceName: item.intervention.booking?.service?.name || "Service non spécifié",
          hours: item.hours,
          rate: item.rate,
          amount: item.amount,
        })),
      };
    })

    return NextResponse.json({
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}