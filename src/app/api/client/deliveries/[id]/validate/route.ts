import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

const clientValidationSchema = z.object({
  validated: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  review: z.string().max(500).optional(),
  issues: z
    .array(
      z.object({
        type: z.enum(["DAMAGED", "LATE", "WRONG_ADDRESS", "OTHER"]),
        description: z.string().max(500),
      }),
    )
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "👤 [POST /api/client/deliveries/[id]/validate] Début de la requête",
    );

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

    const { id: deliveryId } = await params;
    console.log("📦 ID Livraison à valider:", deliveryId);

    const body = await request.json();
    const validatedData = clientValidationSchema.parse(body);

    console.log("📝 Données de validation client:", validatedData);

    // Récupérer la livraison
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        announcement: {
          authorId: user.id,
        },
      },
      include: {
        announcement: true,
        deliverer: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      console.log("❌ Livraison non trouvée ou non autorisée");
      return NextResponse.json(
        { error: "Delivery not found or not authorized" },
        { status: 404 },
      );
    }

    console.log("📋 Livraison trouvée:", {
      id: delivery.id,
      status: delivery.status,
      clientId: delivery.announcement.authorId,
    });

    // Vérifier que la livraison peut être validée par le client
    if (delivery.status !== "IN_TRANSIT") {
      console.log(
        "❌ Livraison ne peut pas être validée, statut:",
        delivery.status,
      );
      return NextResponse.json(
        {
          error: "Delivery cannot be validated by client",
          currentStatus: delivery.status,
          allowedStatus: "IN_TRANSIT",
        },
        { status: 409 },
      );
    }

    // Mettre à jour la livraison selon la validation du client
    const finalStatus = validatedData.validated ? "DELIVERED" : "FAILED";

    console.log("🔄 Mise à jour du statut vers:", finalStatus);

    const updatedDelivery = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: finalStatus,
        clientValidatedAt: new Date(),
        clientValidated: validatedData.validated,
        clientRating: validatedData.rating,
        clientReview: validatedData.review,
        clientIssues: validatedData.issues
          ? JSON.stringify(validatedData.issues)
          : null,

        actualDeliveryDate: validatedData.validated ? new Date() : null,
      },
    });

    // Ajouter une entrée de tracking
    await db.deliveryTracking.create({
      data: {
        deliveryId,
        status: finalStatus,
        message: validatedData.validated
          ? "Livraison validée par le client"
          : "Livraison rejetée par le client",
        timestamp: new Date(),
      },
    });

    // Si la livraison est validée, débloquer le paiement du livreur
    if (validatedData.validated) {
      const delivererCommission = Math.round(delivery.price * 0.1 * 100) / 100;

      // Créer la transaction de paiement pour le livreur
      await db.payment.create({
        data: {
          userId: delivery.deliverer.userId,
          deliveryId: delivery.id,
          amount: delivererCommission,
          currency: "EUR",
          type: "DELIVERY_COMMISSION",
          status: "COMPLETED",
          paidAt: new Date(),
          metadata: JSON.stringify({
            deliveryId: delivery.id,
            commissionRate: 0.1,
            originalAmount: delivery.price,
          }),
        },
      });

      // Mettre à jour le portefeuille du livreur
      await db.wallet.upsert({
        where: { userId: delivery.deliverer.userId },
        update: {
          balance: {
            increment: delivererCommission,
          },
          totalEarnings: {
            increment: delivererCommission,
          },
        },
        create: {
          userId: delivery.deliverer.userId,
          balance: delivererCommission,
          totalEarnings: delivererCommission,
        },
      });

      // Créer une notification pour le livreur
      await db.notification.create({
        data: {
          userId: delivery.deliverer.userId,
          type: "DELIVERY_VALIDATED",
          title: "Livraison validée",
          message: `Votre livraison a été validée par le client et vous avez gagné ${delivererCommission}€ de commission.`,
          data: JSON.stringify({
            deliveryId: delivery.id,
            commission: delivererCommission,
          }),
          read: false,
          createdAt: new Date(),
        },
      });
    } else {
      // Si la livraison est rejetée, créer une notification pour le livreur
      await db.notification.create({
        data: {
          userId: delivery.deliverer.userId,
          type: "DELIVERY_REJECTED",
          title: "Livraison rejetée",
          message:
            "Le client a rejeté la livraison. Veuillez contacter le support.",
          data: JSON.stringify({
            deliveryId: delivery.id,
            issues: validatedData.issues,
          }),
          read: false,
          createdAt: new Date(),
        },
      });
    }

    console.log("✅ Validation client terminée avec succès");

    return NextResponse.json({
      success: true,
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        clientValidated: updatedDelivery.clientValidated,
        clientValidatedAt: updatedDelivery.clientValidatedAt?.toISOString(),
        completedAt: updatedDelivery.actualDeliveryDate?.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur validation client:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
