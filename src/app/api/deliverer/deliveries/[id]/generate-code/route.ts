import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

// Fonction pour générer un code de validation à 6 chiffres
function generateValidationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST - Générer un code de validation pour une livraison
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🚚 [POST /api/deliverer/deliveries/[id]/generate-code] Début de la requête",
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
    console.log("📦 ID Livraison:", deliveryId);

    // Vérifier que la livraison existe et appartient au livreur
    const existingDelivery = await db.delivery.findFirst({
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
      },
    });

    if (!existingDelivery) {
      console.log("❌ Livraison non trouvée ou non autorisée");
      return NextResponse.json(
        { error: "Delivery not found or not authorized" },
        { status: 404 },
      );
    }

    console.log("📋 Livraison trouvée:", {
      id: existingDelivery.id,
      status: existingDelivery.status,
      hasValidationCode: !!existingDelivery.validationCode,
    });

    // Vérifier que la livraison est en transit
    if (existingDelivery.status !== "in_transit") {
      console.log(
        "❌ Livraison ne peut pas être validée, statut:",
        existingDelivery.status,
      );
      return NextResponse.json(
        {
          error: `Cannot generate validation code for delivery with status: ${existingDelivery.status}`,
        },
        { status: 400 },
      );
    }

    // Générer un nouveau code de validation
    const validationCode = generateValidationCode();

    console.log("🔐 Code de validation généré:", validationCode);

    // Mettre à jour la livraison avec le code de validation
    const updatedDelivery = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        validationCode,
        updatedAt: new Date(),
      },
    });

    // Ajouter une entrée de tracking
    await db.deliveryTracking.create({
      data: {
        deliveryId,
        status: "in_transit",
        message: "Code de validation généré",
        timestamp: new Date(),
      },
    });

    console.log("✅ Code de validation généré avec succès");

    return NextResponse.json({
      success: true,
      delivery: {
        id: updatedDelivery.id,
        validationCode: updatedDelivery.validationCode,
        updatedAt: updatedDelivery.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur génération code de validation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
