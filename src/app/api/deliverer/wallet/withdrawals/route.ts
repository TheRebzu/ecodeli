import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const withdrawalSchema = z.object({
  amount: z.number().min(50, "Le montant minimum de retrait est de 50€"),
  bankAccountId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedWithdrawal = withdrawalSchema.parse(body);

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer not found" },
        { status: 404 },
      );
    }

    // Vérifier le solde disponible
    const availableBalance = await calculateAvailableBalance(session.user.id);

    if (validatedWithdrawal.amount > availableBalance) {
      return NextResponse.json(
        {
          error: "Solde insuffisant",
          availableBalance,
        },
        { status: 400 },
      );
    }

    // Générer une référence unique
    const reference = `WTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Créer le retrait
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: session.user.id,
        amount: validatedWithdrawal.amount,
        status: "PENDING",
        reference,
        type: "WITHDRAWAL",
        bankAccountId: validatedWithdrawal.bankAccountId || null,
      },
    });

    // TODO: Intégrer avec un service de virement bancaire
    // TODO: Envoyer une notification email de confirmation

    return NextResponse.json(
      {
        message: "Withdrawal request created successfully",
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          reference: withdrawal.reference,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating withdrawal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    const whereClause: any = {
      userId: session.user.id,
      type: "WITHDRAWAL",
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        bankAccount: true,
      },
    });

    const total = await prisma.withdrawal.count({
      where: whereClause,
    });

    // Formater les données pour le front-end
    const formattedWithdrawals = withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      requestedAt: withdrawal.createdAt,
      processedAt: withdrawal.updatedAt,
      reference: withdrawal.reference,
      bankAccount: withdrawal.bankAccount
        ? {
            iban: maskIBAN(withdrawal.bankAccount.iban),
            accountHolder: withdrawal.bankAccount.accountHolder,
          }
        : null,
    }));

    return NextResponse.json({
      withdrawals: formattedWithdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function calculateAvailableBalance(userId: string): Promise<number> {
  // Calculer le solde disponible (gains - retraits déjà effectués)
  const totalEarnings = await prisma.payment.aggregate({
    where: {
      userId,
      status: "COMPLETED",
      type: "DELIVERY",
    },
    _sum: {
      amount: true,
    },
  });

  const totalWithdrawals = await prisma.withdrawal.aggregate({
    where: {
      userId,
      status: "COMPLETED",
      type: "WITHDRAWAL",
    },
    _sum: {
      amount: true,
    },
  });

  const earnings = totalEarnings._sum.amount || 0;
  const withdrawals = totalWithdrawals._sum.amount || 0;

  return earnings - withdrawals;
}

function maskIBAN(iban: string): string {
  if (!iban) return "";
  // Masquer l'IBAN pour la sécurité (garder seulement les 4 premiers et 4 derniers caractères)
  const cleaned = iban.replace(/\s/g, "");
  if (cleaned.length < 8) return iban;

  const first = cleaned.substring(0, 4);
  const last = cleaned.substring(cleaned.length - 4);
  const masked = "*".repeat(cleaned.length - 8);

  return `${first} ${masked} ${last}`;
}
