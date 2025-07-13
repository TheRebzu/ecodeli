import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema pour demande de retrait
const withdrawalRequestSchema = z.object({
  amount: z
    .number()
    .min(10, "Le montant minimum est de 10€")
    .max(5000, "Le montant maximum est de 5000€"),
  bankAccountId: z.string().min(1, "Compte bancaire requis"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    console.log("💰 [GET /api/deliverer/wallet] Début de la requête");

    const user = await requireRole(request, ["DELIVERER"]);

    // Récupérer le profil livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id },
      include: {
        wallet: true,
        bankAccounts: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    // Récupérer les gains des livraisons terminées
    const completedDeliveries = await db.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        status: "DELIVERED",
      },
      include: {
        announcement: {
          select: {
            finalPrice: true,
            basePrice: true,
            type: true,
            title: true,
          },
        },
        payment: {
          select: {
            amount: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { actualDeliveryTime: "desc" },
    });

    // Calculer les gains
    const totalEarnings = completedDeliveries.reduce((sum, delivery) => {
      const price = Number(
        delivery.announcement.finalPrice || delivery.announcement.basePrice,
      );
      // Commission EcoDeli (15% par défaut)
      const delivererEarning = price * 0.85;
      return sum + delivererEarning;
    }, 0);

    const paidEarnings = completedDeliveries
      .filter((d) => d.payment?.status === "COMPLETED")
      .reduce((sum, delivery) => {
        const price = Number(
          delivery.announcement.finalPrice || delivery.announcement.basePrice,
        );
        const delivererEarning = price * 0.85;
        return sum + delivererEarning;
      }, 0);

    // Récupérer les retraits
    const withdrawals = await db.withdrawal.findMany({
      where: { delivererId: deliverer.id },
      include: {
        bankAccount: {
          select: {
            bankName: true,
            accountNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Balance actuelle du wallet (simulée pour maintenant)
    const currentBalance =
      totalEarnings -
      withdrawals
        .filter((w) => w.status === "COMPLETED")
        .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendingBalance = totalEarnings - paidEarnings;

    // Statistiques par mois
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = completedDeliveries
      .filter(
        (d) =>
          d.actualDeliveryTime && new Date(d.actualDeliveryTime) >= thisMonth,
      )
      .reduce((sum, delivery) => {
        const price = Number(
          delivery.announcement.finalPrice || delivery.announcement.basePrice,
        );
        return sum + price * 0.85;
      }, 0);

    const result = {
      wallet: {
        currentBalance: Math.max(0, currentBalance),
        pendingBalance,
        totalEarnings,
        availableForWithdrawal: Math.max(0, currentBalance),
      },
      statistics: {
        totalDeliveries: completedDeliveries.length,
        thisMonthEarnings,
        averageEarningPerDelivery:
          completedDeliveries.length > 0
            ? totalEarnings / completedDeliveries.length
            : 0,
        commissionRate: 15, // % de commission EcoDeli
      },
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        bankAccount: w.bankAccount
          ? {
              bankName: w.bankAccount.bankName,
              accountNumber: `****${w.bankAccount.accountNumber.slice(-4)}`,
            }
          : null,
        requestedAt: w.createdAt.toISOString(),
        processedAt: w.processedAt?.toISOString(),
      })),
      bankAccounts: deliverer.bankAccounts.map((account) => ({
        id: account.id,
        bankName: account.bankName,
        accountNumber: `****${account.accountNumber.slice(-4)}`,
        accountHolderName: account.accountHolderName,
        isDefault: account.isDefault,
      })),
      recentEarnings: completedDeliveries.slice(0, 10).map((delivery) => ({
        id: delivery.id,
        announcementTitle: delivery.announcement?.title || "Livraison",
        grossAmount: Number(
          delivery.announcement.finalPrice || delivery.announcement.basePrice,
        ),
        netAmount:
          Number(
            delivery.announcement.finalPrice || delivery.announcement.basePrice,
          ) * 0.85,
        commission:
          Number(
            delivery.announcement.finalPrice || delivery.announcement.basePrice,
          ) * 0.15,
        status: delivery.payment?.status || "PENDING",
        completedAt: delivery.actualDeliveryTime?.toISOString(),
      })),
    };

    console.log(`✅ Wallet data récupéré pour livreur ${deliverer.id}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Erreur récupération wallet:", error);

    // Si c'est une erreur d'authentification, retourner 403
    if (error.message?.includes("Accès refusé")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("💰 [POST /api/deliverer/wallet] Demande de retrait");

    const user = await requireRole(request, ["DELIVERER"]);

    // Récupérer le profil livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id },
      include: {
        bankAccounts: {
          where: { isActive: true },
        },
      },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validatedData = withdrawalRequestSchema.parse(body);

    // Vérifier que le compte bancaire existe
    const bankAccount = deliverer.bankAccounts.find(
      (acc) => acc.id === validatedData.bankAccountId,
    );
    if (!bankAccount) {
      return NextResponse.json(
        { error: "Compte bancaire non trouvé" },
        { status: 404 },
      );
    }

    // Créer la demande de retrait (simulation pour maintenant)
    const withdrawal = await db.withdrawal.create({
      data: {
        delivererId: deliverer.id,
        bankAccountId: validatedData.bankAccountId,
        amount: validatedData.amount,
        status: "PENDING",
        notes: validatedData.notes,
      },
    });

    console.log("✅ Demande de retrait créée:", withdrawal.id);

    return NextResponse.json(
      {
        success: true,
        withdrawal: {
          id: withdrawal.id,
          amount: Number(withdrawal.amount),
          status: withdrawal.status,
          requestedAt: withdrawal.createdAt.toISOString(),
        },
        message: "Demande de retrait créée avec succès",
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

    console.error("❌ Erreur création demande retrait:", error);

    // Si c'est une erreur d'authentification, retourner 403
    if (error.message?.includes("Accès refusé")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
