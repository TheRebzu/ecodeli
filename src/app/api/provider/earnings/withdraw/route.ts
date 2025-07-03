import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const withdrawSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  bankDetails: z.object({
    iban: z.string().min(15, "IBAN invalide"),
    bankName: z.string().min(2, "Nom de la banque requis"),
    accountHolder: z.string().min(2, "Titulaire du compte requis"),
  }),
});

// POST - Demande de retrait de gains
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, bankDetails } = withdrawSchema.parse(body);

    // Trouver le provider
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { userId: session.user.id }
        ]
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Vérifier que le provider est validé
    if (provider.validationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Provider must be validated to withdraw earnings" },
        { status: 400 }
      );
    }

    // Calculer le solde disponible
    const totalEarningsResult = await prisma.payment.aggregate({
      where: {
        booking: {
          service: {
            providerId: provider.id
          }
        },
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    });

    const totalWithdrawalsResult = await prisma.providerWithdrawal.aggregate({
      where: {
        providerId: provider.id,
        status: {
          in: ["PENDING", "COMPLETED"]
        }
      },
      _sum: {
        amount: true
      }
    });

    const availableBalance = (totalEarningsResult._sum.amount || 0) - (totalWithdrawalsResult._sum.amount || 0);

    if (amount > availableBalance) {
      return NextResponse.json(
        { 
          error: "Insufficient balance",
          availableBalance,
          requestedAmount: amount
        },
        { status: 400 }
      );
    }

    // Montant minimum de retrait
    if (amount < 10) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is 10€" },
        { status: 400 }
      );
    }

    // Créer la demande de retrait
    const withdrawal = await prisma.providerWithdrawal.create({
      data: {
        providerId: provider.id,
        amount,
        bankDetails,
        status: "PENDING",
        requestedAt: new Date(),
        // Simuler un délai de traitement de 2-5 jours ouvrés
        estimatedProcessingDate: new Date(Date.now() + (2 + Math.random() * 3) * 24 * 60 * 60 * 1000),
      },
    });

    // Créer une notification pour le provider
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Demande de retrait enregistrée",
        content: `Votre demande de retrait de ${amount}€ a été enregistrée et sera traitée sous 2-5 jours ouvrés.`,
        type: "PROVIDER_WITHDRAWAL",
        priority: "LOW",
        data: {
          withdrawalId: withdrawal.id,
          amount,
          bankDetails,
          action: "WITHDRAWAL_REQUESTED",
        },
      },
    });

    // Notifier les admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Nouvelle demande de retrait prestataire",
          content: `${provider.businessName} a demandé un retrait de ${amount}€. Solde disponible: ${availableBalance}€`,
          type: "PROVIDER_WITHDRAWAL",
          priority: "MEDIUM",
          data: {
            providerId: provider.id,
            withdrawalId: withdrawal.id,
            amount,
            businessName: provider.businessName,
            action: "WITHDRAWAL_REQUESTED",
          },
        },
      });
    }

    return NextResponse.json({
      message: "Withdrawal request submitted successfully",
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        estimatedProcessingDate: withdrawal.estimatedProcessingDate,
        requestedAt: withdrawal.requestedAt,
      },
      newBalance: availableBalance - amount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error processing withdrawal request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Historique des retraits
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Trouver le provider
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { userId: session.user.id }
        ]
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Construire la requête de filtrage
    const whereClause: any = {
      providerId: provider.id
    };

    if (status) {
      whereClause.status = status;
    }

    // Récupérer les retraits
    const withdrawals = await prisma.providerWithdrawal.findMany({
      where: whereClause,
      orderBy: {
        requestedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalCount = await prisma.providerWithdrawal.count({
      where: whereClause
    });

    return NextResponse.json({
      withdrawals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 