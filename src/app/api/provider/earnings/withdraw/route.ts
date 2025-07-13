import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const withdrawSchema = z.object({
  providerId: z.string(),
  amount: z.number().positive("Le montant doit être positif"),
});

// POST - Demande de retrait de gains
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { providerId, amount } = withdrawSchema.parse(body);

    // Vérifier que l'utilisateur demande un retrait pour lui-même
    if (providerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { userId: providerId },
      include: { user: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Vérifier que le provider est validé
    if (provider.validationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Provider must be validated to withdraw earnings" },
        { status: 400 },
      );
    }

    // Calculer le solde disponible basé sur les factures payées
    const totalEarningsAgg = await prisma.providerMonthlyInvoice.aggregate({
      where: {
        providerId: provider.id,
        status: "PAID",
      },
      _sum: {
        netAmount: true,
      },
    });

    // Total des retraits déjà effectués
    const totalWithdrawalsAgg = await prisma.walletOperation.aggregate({
      where: {
        userId: providerId,
        type: "WITHDRAWAL",
        status: { in: ["PENDING", "COMPLETED"] },
      },
      _sum: {
        amount: true,
      },
    });

    const totalEarnings = totalEarningsAgg._sum.netAmount || 0;
    const totalWithdrawals = Math.abs(totalWithdrawalsAgg._sum.amount || 0);
    const availableBalance = totalEarnings - totalWithdrawals;

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          availableBalance,
          requestedAmount: amount,
        },
        { status: 400 },
      );
    }

    // Montant minimum de retrait
    if (amount < 10) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is 10€" },
        { status: 400 },
      );
    }

    // Créer l'opération de retrait dans WalletOperation
    const withdrawal = await prisma.walletOperation.create({
      data: {
        userId: providerId,
        walletId: provider.user.id, // Utiliser l'ID utilisateur comme walletId temporaire
        type: "WITHDRAWAL",
        amount: -amount, // Montant négatif pour un retrait
        description: `Retrait de gains - ${amount}€`,
        status: "PENDING",
      },
    });

    // Créer une notification pour le provider
    await prisma.notification.create({
      data: {
        userId: providerId,
        title: "Demande de retrait enregistrée",
        content: `Votre demande de retrait de ${amount}€ a été enregistrée et sera traitée sous 2-5 jours ouvrés.`,
        type: "PAYMENT",
        data: {
          withdrawalId: withdrawal.id,
          amount,
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
          content: `${provider.businessName || provider.user.profile?.firstName} a demandé un retrait de ${amount}€. Solde disponible: ${availableBalance}€`,
          type: "PAYMENT",
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
        amount: Math.abs(withdrawal.amount),
        status: withdrawal.status,
        requestedAt: withdrawal.createdAt,
      },
      newBalance: availableBalance - amount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error processing withdrawal request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET - Historique des retraits
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 },
      );
    }

    // Vérifier les permissions
    if (providerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Construire la condition de recherche
    const where: any = {
      userId: providerId,
      type: "WITHDRAWAL",
    };

    if (status) {
      where.status = status;
    }

    // Récupérer l'historique des retraits
    const [withdrawals, totalCount] = await Promise.all([
      prisma.walletOperation.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.walletOperation.count({ where }),
    ]);

    const formattedWithdrawals = withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      amount: Math.abs(withdrawal.amount),
      status: withdrawal.status,
      description: withdrawal.description,
      requestedAt: withdrawal.createdAt.toISOString(),
      executedAt: withdrawal.executedAt?.toISOString(),
    }));

    return NextResponse.json({
      withdrawals: formattedWithdrawals,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
