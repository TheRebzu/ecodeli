import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

// Schema pour validation de livraison
const validateDeliverySchema = z.object({
  validationCode: z
    .string()
    .length(6, "Le code doit contenir exactement 6 chiffres")
    .regex(/^\d{6}$/, "Le code doit contenir uniquement des chiffres"),
  deliveryProof: z
    .object({
      photo: z.string().url().optional(),
      signature: z.string().optional(),
      notes: z.string().max(500).optional(),
      gpsCoordinates: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
        .optional(),
    })
    .optional(),
  issues: z
    .array(
      z.object({
        type: z.enum([
          "RECIPIENT_ABSENT",
          "ADDRESS_NOT_FOUND",
          "PACKAGE_DAMAGED",
          "ACCESS_DENIED",
          "OTHER",
        ]),
        description: z.string().max(500),
        photo: z.string().url().optional(),
      }),
    )
    .optional(),
});

// POST - Valider une livraison avec le code à 6 chiffres
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🚚 [POST /api/deliverer/deliveries/[id]/validate] Début de la requête",
    );

    const user = await getUserFromSession(request);
    if (!user) {
      console.log("❌ Utilisateur non authentifié");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "DELIVERER") {
      console.log("❌ Rôle incorrect:", user.role);
      return NextResponse.json(
        { error: "Forbidden - DELIVERER role required" },
        { status: 403 },
      );
    }

    const { id: deliveryId } = await params;
    console.log("📦 ID Livraison à valider:", deliveryId);

    const body = await request.json();
    const validatedData = validateDeliverySchema.parse(body);

    console.log("📝 Données de validation reçues:", {
      validationCode: validatedData.validationCode,
      hasDeliveryProof: !!validatedData.deliveryProof,
      hasIssues: !!validatedData.issues,
    });

    // Récupérer la livraison avec toutes les informations nécessaires
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: user.id,
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
        payment: true,
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
      delivererId: delivery.delivererId,
      hasValidationCode: !!delivery.validationCode,
    });

    // Vérifier le statut de la livraison
    if (delivery.status !== "IN_TRANSIT" && delivery.status !== "IN_PROGRESS") {
      console.log("❌ Statut incorrect pour validation:", delivery.status);
      return NextResponse.json(
        {
          error: "Delivery cannot be validated",
          currentStatus: delivery.status,
          allowedStatus: "IN_TRANSIT or IN_PROGRESS",
        },
        { status: 409 },
      );
    }

    // Vérifier le code de validation
    if (delivery.validationCode !== validatedData.validationCode) {
      console.log("❌ Code de validation incorrect:", {
        provided: validatedData.validationCode,
        expected: delivery.validationCode,
      });

      // Enregistrer la tentative échouée
      await db.deliveryValidationAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptedCode: validatedData.validationCode,
          success: false,
          attemptedAt: new Date(),
          attemptedBy: user.id,
        },
      });

      // Compter les tentatives échouées récentes (dernières 30 minutes)
      const recentFailedAttempts = await db.deliveryValidationAttempt.count({
        where: {
          deliveryId: delivery.id,
          success: false,
          attemptedAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes
          },
        },
      });

      // Bloquer temporairement après 3 tentatives échouées
      if (recentFailedAttempts >= 3) {
        return NextResponse.json(
          {
            error: "Too many failed attempts",
            message:
              "Account temporarily locked. Please try again in 30 minutes.",
            attemptsRemaining: 0,
            lockUntil: new Date(Date.now() + 30 * 60 * 1000),
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error: "Invalid validation code",
          attemptsRemaining: 3 - recentFailedAttempts,
          hint:
            recentFailedAttempts >= 2
              ? "Contactez le client pour confirmer le code"
              : null,
        },
        { status: 400 },
      );
    }

    console.log("✅ Code de validation correct");

    // Code correct - enregistrer la tentative réussie
    await db.deliveryValidationAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptedCode: validatedData.validationCode,
        success: true,
        attemptedAt: new Date(),
        attemptedBy: user.id,
      },
    });

    // Déterminer le statut final
    const hasIssues = validatedData.issues && validatedData.issues.length > 0;
    const finalStatus = "DELIVERED"; // Toujours DELIVERED selon l'enum

    console.log("🔄 Mise à jour du statut vers:", finalStatus);

    // Mettre à jour la livraison
    const updatedDelivery = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: finalStatus,
        actualDeliveryDate: new Date(),
      },
    });

    // Créer une preuve de livraison si nécessaire
    if (validatedData.deliveryProof || hasIssues) {
      await db.proofOfDelivery.upsert({
        where: { deliveryId },
        update: {
          notes: validatedData.deliveryProof
            ? JSON.stringify(validatedData.deliveryProof)
            : null,
          validatedWithCode: true,
        },
        create: {
          deliveryId,
          notes: validatedData.deliveryProof
            ? JSON.stringify(validatedData.deliveryProof)
            : null,
          validatedWithCode: true,
        },
      });
    }

    // Ajouter une entrée de tracking
    await db.trackingUpdate.create({
      data: {
        deliveryId,
        status: "DELIVERED",
        message: hasIssues
          ? "Livraison terminée avec signalements"
          : "Livraison terminée avec succès",
        timestamp: new Date(),
      },
    });

    // Calculer la commission du livreur (10% du prix)
    const delivererCommission = Math.round(delivery.price * 0.1 * 100) / 100;

    console.log("💰 Commission livreur calculée:", delivererCommission);

    // Créer la transaction de paiement pour le livreur
    const delivererPayment = await db.payment.create({
      data: {
        userId: user.id,
        deliveryId: delivery.id,
        amount: delivererCommission,
        currency: "EUR",
        status: "COMPLETED",
        paymentMethod: "DELIVERY_COMMISSION",
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
      where: { userId: user.id },
      update: {
        balance: {
          increment: delivererCommission,
        },
      },
      create: {
        userId: user.id,
        balance: delivererCommission,
      },
    });

    // Si le paiement client existe et est en attente, le compléter
    if (delivery.payment && delivery.payment.status === "PENDING") {
      await db.payment.update({
        where: { id: delivery.payment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
        },
      });
    }

    // Créer les notifications
    const notifications = [];

    // Notification pour le client
    notifications.push(
      db.notification.create({
        data: {
          userId: delivery.announcement.authorId,
          type: hasIssues
            ? "DELIVERY_COMPLETED_WITH_ISSUES"
            : "DELIVERY_COMPLETED",
          title: hasIssues
            ? "Livraison terminée avec signalements"
            : "Livraison terminée",
          message: hasIssues
            ? `Votre livraison a été terminée mais des problèmes ont été signalés.`
            : `Votre livraison a été terminée avec succès !`,
          data: JSON.stringify({
            deliveryId: delivery.id,
            hasIssues,
            issues: validatedData.issues,
          }),
          isRead: false,
        },
      }),
    );

    // Notification pour le livreur
    notifications.push(
      db.notification.create({
        data: {
          userId: user.id,
          type: "DELIVERY_VALIDATED",
          title: "Livraison validée",
          message: `Vous avez validé la livraison et gagné ${delivererCommission}€ de commission.`,
          data: JSON.stringify({
            deliveryId: delivery.id,
            commission: delivererCommission,
          }),
          isRead: false,
        },
      }),
    );

    // Exécuter toutes les notifications
    await Promise.all(notifications);

    console.log("✅ Livraison validée avec succès");

    return NextResponse.json({
      success: true,
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        actualDeliveryDate: updatedDelivery.actualDeliveryDate?.toISOString(),
      },
      commission: delivererCommission,
      payment: {
        id: delivererPayment.id,
        amount: delivererPayment.amount,
        status: delivererPayment.status,
      },
    });
  } catch (error) {
    console.error("❌ Erreur validation livraison:", error);

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

// GET - Récupérer les informations de validation d'une livraison
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "DELIVERER") {
      return NextResponse.json(
        { error: "Forbidden - DELIVERER role required" },
        { status: 403 },
      );
    }

    const { id: deliveryId } = await params;

    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: user.id,
      },
      select: {
        id: true,
        status: true,
        validationCode: true,
        actualDeliveryDate: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found or not authorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        hasValidationCode: !!delivery.validationCode,
        actualDeliveryDate: delivery.actualDeliveryDate?.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur récupération validation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
