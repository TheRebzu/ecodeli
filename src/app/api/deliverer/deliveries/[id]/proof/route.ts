import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

const proofUploadSchema = z.object({
  photo: z.string().url("Photo URL requise"),
  notes: z.string().max(500).optional(),
  gpsCoordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  signature: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "📸 [POST /api/deliverer/deliveries/[id]/proof] Début de la requête",
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

    const body = await request.json();
    const validatedData = proofUploadSchema.parse(body);

    console.log("📝 Données de preuve reçues:", {
      hasPhoto: !!validatedData.photo,
      hasNotes: !!validatedData.notes,
      hasGPS: !!validatedData.gpsCoordinates,
      hasSignature: !!validatedData.signature,
    });

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
      delivererId: existingDelivery.delivererId,
    });

    // Vérifier que la livraison peut recevoir une preuve
    if (!["IN_PROGRESS", "DELIVERED"].includes(existingDelivery.status)) {
      console.log(
        "❌ Livraison ne peut pas recevoir de preuve, statut:",
        existingDelivery.status,
      );
      return NextResponse.json(
        {
          error: `Cannot upload proof for delivery with status: ${existingDelivery.status}`,
        },
        { status: 400 },
      );
    }

    // Créer ou mettre à jour la preuve de livraison
    const proofData = {
      deliveryId,
      photoUrl: validatedData.photo,
      notes: validatedData.notes,
      gpsCoordinates: validatedData.gpsCoordinates
        ? JSON.stringify(validatedData.gpsCoordinates)
        : null,
      signature: validatedData.signature,
      uploadedAt: new Date(),
      uploadedBy: user.id,
    };

    const proofOfDelivery = await db.proofOfDelivery.upsert({
      where: { deliveryId },
      update: proofData,
      create: proofData,
    });

    // Mettre à jour la livraison avec les informations de preuve
    await db.delivery.update({
      where: { id: deliveryId },
      data: {
        deliveryProof: JSON.stringify({
          photo: validatedData.photo,
          notes: validatedData.notes,
          gpsCoordinates: validatedData.gpsCoordinates,
          signature: validatedData.signature,
          uploadedAt: new Date(),
        }),
        updatedAt: new Date(),
      },
    });

    // Ajouter une entrée de tracking
    await db.deliveryTracking.create({
      data: {
        deliveryId,
        status: existingDelivery.status,
        message: "Preuve de livraison uploadée",
        timestamp: new Date(),
      },
    });

    // Créer une notification pour le client
    await db.notification.create({
      data: {
        userId: existingDelivery.announcement.authorId,
        type: "DELIVERY_PROOF_UPLOADED",
        title: "Preuve de livraison disponible",
        message:
          "Le livreur a uploadé une preuve de livraison. Vous pouvez maintenant valider la livraison.",
        data: JSON.stringify({
          deliveryId: existingDelivery.id,
          hasPhoto: !!validatedData.photo,
          hasSignature: !!validatedData.signature,
        }),
        read: false,
        createdAt: new Date(),
      },
    });

    console.log("✅ Preuve de livraison uploadée avec succès");

    return NextResponse.json({
      success: true,
      proof: {
        id: proofOfDelivery.id,
        deliveryId: proofOfDelivery.deliveryId,
        photoUrl: proofOfDelivery.photoUrl,
        uploadedAt: proofOfDelivery.uploadedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur upload preuve de livraison:", error);

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

// GET - Récupérer la preuve de livraison
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: deliveryId } = await params;

    // Vérifier que l'utilisateur a accès à cette livraison
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        OR: [{ delivererId: user.id }, { announcement: { authorId: user.id } }],
      },
      include: {
        ProofOfDelivery: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found or not authorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      proof: delivery.ProofOfDelivery
        ? {
            id: delivery.ProofOfDelivery.id,
            photoUrl: delivery.ProofOfDelivery.photoUrl,
            notes: delivery.ProofOfDelivery.notes,
            gpsCoordinates: delivery.ProofOfDelivery.gpsCoordinates
              ? JSON.parse(delivery.ProofOfDelivery.gpsCoordinates)
              : null,
            signature: delivery.ProofOfDelivery.signature,
            uploadedAt: delivery.ProofOfDelivery.uploadedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Erreur récupération preuve:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
