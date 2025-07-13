import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { validateDeliveryCodeSchema } from "@/features/deliveries/schemas/delivery.schema";
import { deliveryValidationService } from "@/features/deliveries/services/delivery-validation.service";

/**
 * POST /api/shared/deliveries/[id]/validate
 * Valide une livraison avec le code 6 chiffres
 * FONCTIONNALITÉ CRITIQUE du cahier des charges EcoDeli
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: deliveryId } = await params;
    const body = await request.json();

    // Validation des données avec le schéma spécifique au code 6 chiffres
    const validatedData = validateDeliveryCodeSchema.parse({
      ...body,
      deliveryId,
      clientId: session.user.id,
    });

    const { validationCode, location, signature, proofPhoto } = validatedData;

    // Vérifier que l'utilisateur est autorisé (CLIENT ou ADMIN uniquement)
    if (!["CLIENT", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Seuls les clients peuvent valider une livraison" },
        { status: 403 },
      );
    }

    console.log(
      `[VALIDATION TENTATIVE] Livraison: ${deliveryId}, Code: ${validationCode}`,
    );

    // Valider la livraison via le service critique
    const result =
      await deliveryValidationService.validateDeliveryWithCode(validatedData);

    console.log(`[VALIDATION RÉUSSIE] Livraison: ${deliveryId}`);

    return NextResponse.json({
      success: true,
      message: result.message,
      delivery: {
        id: result.delivery.id,
        status: result.delivery.status,
      },
      validation: {
        timestamp: new Date().toISOString(),
        method: "CODE_6_DIGITS",
        location: location || null,
        hasSignature: !!signature,
        hasProofPhoto: !!proofPhoto,
      },
    });
  } catch (error) {
    console.error("Erreur validation livraison:", error);

    // Gestion spécifique des erreurs de validation
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données de validation invalides",
          details: error.errors,
          help: "Le code doit faire exactement 6 chiffres",
        },
        { status: 400 },
      );
    }

    // Erreur générique
    return NextResponse.json(
      {
        error: "Erreur lors de la validation de la livraison",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/shared/deliveries/[id]/validate
 * Vérifie si un code de validation est valide (sans l'utiliser)
 * Utile pour la validation temps réel côté client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: deliveryId } = await params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Code de validation requis" },
        { status: 400 },
      );
    }

    // Vérifier que le code fait 6 chiffres
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          valid: false,
          error: "Le code doit faire exactement 6 chiffres",
        },
        { status: 400 },
      );
    }

    // Vérifier la validité du code
    const isValid = await deliveryValidationService.isValidationCodeValid(
      deliveryId,
      code,
    );

    return NextResponse.json({
      valid: isValid,
      deliveryId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur vérification code:", error);

    return NextResponse.json(
      {
        valid: false,
        error: "Erreur lors de la vérification du code",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/shared/deliveries/[id]/validate
 * Invalide le code de validation (en cas d'annulation par admin)
 * ADMIN uniquement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 },
      );
    }

    const { id: deliveryId } = await params;

    // Invalider le code de validation
    await deliveryValidationService.invalidateValidationCode(deliveryId);

    console.log(
      `[CODE INVALIDÉ] Livraison: ${deliveryId}, Admin: ${session.user.id}`,
    );

    return NextResponse.json({
      success: true,
      message: "Code de validation invalidé",
      deliveryId,
      invalidatedBy: session.user.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur invalidation code:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de l'invalidation du code",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
