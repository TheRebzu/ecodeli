import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { userId: providerId }
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Construire les conditions de recherche pour les paiements de services
    const where: any = {
      type: "SERVICE",
      booking: {
        service: {
          providerId: provider.id
        }
      }
    };

    if (type) {
      // Mapper les types de l'interface vers les statuts de paiement
      if (type === "EARNING") {
        where.status = "COMPLETED";
      } else if (type === "REFUND") {
        where.status = { in: ["REFUNDED", "PARTIALLY_REFUNDED"] };
      }
    }

    // Récupérer les paiements des services + les retraits
    const [servicePayments, withdrawals, totalServiceCount, totalWithdrawalCount] = await Promise.all([
      // Paiements des services
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              service: {
                select: {
                  name: true,
                  type: true
                }
              }
            }
          },
          user: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: type === "WITHDRAWAL" ? limit : (page - 1) * limit,
        take: type === "WITHDRAWAL" ? 0 : limit,
      }),
      // Retraits du provider (seulement si demandé)
      type === "WITHDRAWAL" ? prisma.walletOperation.findMany({
        where: {
          userId: providerId,
          type: "WITHDRAWAL",
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }) : [],
      // Compter les paiements
      prisma.payment.count({ where }),
      // Compter les retraits
      type === "WITHDRAWAL" ? prisma.walletOperation.count({
        where: {
          userId: providerId,
          type: "WITHDRAWAL",
        }
      }) : 0,
    ]);

    // Commission EcoDeli (15%)
    const commissionRate = 0.15;

    // Formater les paiements de services
    const formattedPayments = servicePayments.map(payment => {
      const grossAmount = payment.amount;
      const commission = grossAmount * commissionRate;
      const netAmount = grossAmount - commission;

      return {
        id: payment.id,
        type: payment.status === "COMPLETED" ? "EARNING" : 
              payment.status === "REFUNDED" ? "REFUND" : "EARNING",
        amount: netAmount, // Montant net après commission
        grossAmount, // Montant brut
        commission,
        description: `Service: ${payment.booking?.service?.name || 'Service'} - Client: ${payment.user?.profile?.firstName || 'Client'} ${payment.user?.profile?.lastName || ''}`,
        serviceName: payment.booking?.service?.name,
        serviceType: payment.booking?.service?.type,
        status: payment.status,
        clientName: `${payment.user?.profile?.firstName || ''} ${payment.user?.profile?.lastName || ''}`.trim(),
        createdAt: payment.createdAt.toISOString(),
      };
    });

    // Formater les retraits
    const formattedWithdrawals = withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      type: "WITHDRAWAL",
      amount: Math.abs(withdrawal.amount),
      description: withdrawal.description,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt.toISOString(),
    }));

    // Combiner selon le type demandé
    let allTransactions = [];
    let totalCount = 0;

    if (type === "WITHDRAWAL") {
      allTransactions = formattedWithdrawals;
      totalCount = totalWithdrawalCount;
    } else {
      allTransactions = formattedPayments;
      totalCount = totalServiceCount;
    }

    return NextResponse.json({
      transactions: allTransactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      commission: {
        rate: commissionRate,
        description: `Commission EcoDeli: ${(commissionRate * 100)}%`
      }
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 