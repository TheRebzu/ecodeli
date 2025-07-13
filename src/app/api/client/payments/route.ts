import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema pour créer un paiement
const createPaymentSchema = z.object({
  announcementId: z.string().optional(),
  bookingId: z.string().optional(),
  amount: z.number().positive("Le montant doit être positif"),
  currency: z.string().default("EUR"),
  paymentMethod: z.string().default("stripe"),
  description: z.string().optional(),
  metadata: z
    .object({
      type: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const offset = (page - 1) * limit;

    // Construire les filtres
    const where: any = {
      userId: user.id,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    // Construire les filtres metadata séparément pour éviter l'écrasement
    const metadataFilters: any[] = [];

    if (type && type !== "all") {
      metadataFilters.push({
        path: ["type"],
        equals: type,
      });
    }

    if (search) {
      metadataFilters.push({
        path: ["description"],
        string_contains: search,
      });
    }

    if (metadataFilters.length === 1) {
      where.metadata = metadataFilters[0];
    } else if (metadataFilters.length > 1) {
      where.AND = metadataFilters.map((filter) => ({ metadata: filter }));
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Récupérer les paiements
    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          delivery: {
            select: {
              id: true,
              announcement: {
                select: {
                  title: true,
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              status: true,
              scheduledDate: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    // Calculer les statistiques
    const allPayments = await db.payment.findMany({
      where: {
        userId: user.id,
      },
    });

    const stats = {
      totalSpent: allPayments
        .filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0),
      totalRefunds: allPayments
        .filter((p) => p.status === "REFUNDED")
        .reduce((sum, p) => sum + (p.refundAmount || p.amount), 0),
      totalPending: allPayments
        .filter((p) => p.status === "PENDING")
        .reduce((sum, p) => sum + p.amount, 0),
      monthlySpending: [], // À implémenter si nécessaire
    };

    // Transformer les données
    const transformedPayments = payments.map((payment) => ({
      id: payment.id,
      type: payment.metadata?.type || "UNKNOWN",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description:
        payment.metadata?.description || `Paiement ${payment.amount}€`,
      createdAt: payment.createdAt.toISOString(),
      userName: payment.user?.name,
      deliveryId: payment.delivery?.id,
      deliveryTitle: payment.delivery?.announcement?.title,
      bookingId: payment.booking?.id,
      bookingServiceName: payment.booking?.service?.name,
      bookingServiceType: payment.booking?.service?.type,
      bookingStatus: payment.booking?.status,
      stripePaymentId: payment.stripePaymentId,
      refundAmount: payment.refundAmount,
      paymentMethod: payment.paymentMethod,
    }));

    return NextResponse.json({
      payments: transformedPayments,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Créer un nouveau paiement
export async function POST(request: NextRequest) {
  try {
    console.log("💳 [POST /api/client/payments] Début de la requête");

    const user = await getUserFromSession(request);
    if (!user) {
      console.log("❌ Utilisateur non authentifié");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "CLIENT") {
      console.log("❌ Rôle incorrect:", user.role);
      return NextResponse.json(
        { error: "Forbidden - CLIENT role required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    console.log("📝 Données de paiement reçues:", {
      amount: validatedData.amount,
      currency: validatedData.currency,
      announcementId: validatedData.announcementId,
      bookingId: validatedData.bookingId,
    });

    // Vérifier que l'annonce ou la réservation existe si spécifiée
    if (validatedData.announcementId) {
      const announcement = await db.announcement.findFirst({
        where: {
          id: validatedData.announcementId,
          authorId: user.id,
        },
      });

      if (!announcement) {
        return NextResponse.json(
          {
            error: "Annonce non trouvée ou non autorisée",
          },
          { status: 404 },
        );
      }
    }

    if (validatedData.bookingId) {
      const booking = await db.booking.findFirst({
        where: {
          id: validatedData.bookingId,
          clientId: user.id,
        },
      });

      if (!booking) {
        return NextResponse.json(
          {
            error: "Réservation non trouvée ou non autorisée",
          },
          { status: 404 },
        );
      }
    }

    // Simuler l'intégration Stripe (à remplacer par la vraie intégration)
    const stripePaymentId = `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer le paiement en base
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        announcementId: validatedData.announcementId,
        bookingId: validatedData.bookingId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: "COMPLETED", // Simulé comme réussi
        paymentMethod: validatedData.paymentMethod,
        stripePaymentId: stripePaymentId,
        paidAt: new Date(),
        metadata: {
          type: validatedData.metadata?.type || "DELIVERY",
          description:
            validatedData.description || `Paiement ${validatedData.amount}€`,
          ...validatedData.metadata,
        },
      },
    });

    console.log(`✅ Paiement créé avec succès: ${payment.id}`);
    console.log(`💳 Stripe Payment ID: ${stripePaymentId}`);

    // TODO: Intégrer avec la vraie API Stripe
    // const stripePayment = await stripe.paymentIntents.create({
    //   amount: Math.round(validatedData.amount * 100), // Convertir en centimes
    //   currency: validatedData.currency,
    //   metadata: {
    //     userId: user.id,
    //     announcementId: validatedData.announcementId,
    //     bookingId: validatedData.bookingId
    //   }
    // })

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          stripePaymentId: payment.stripePaymentId,
          paidAt: payment.paidAt?.toISOString(),
          createdAt: payment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("❌ Erreur création paiement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
