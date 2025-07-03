import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const submitValidationSchema = z.object({
  providerId: z.string().cuid(),
});

// POST - Soumettre une candidature pour validation
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
    const { providerId } = submitValidationSchema.parse(body);

    // Vérifier que le provider existe et appartient à l'utilisateur - accepter userId ou providerId
    let provider = await prisma.provider.findFirst({
      where: {
        id: providerId,
        userId: session.user.id,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        services: true,
      },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: {
          userId: providerId,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          services: true,
        },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Vérifier que le statut permet la soumission
    if (provider.validationStatus === "APPROVED") {
      return NextResponse.json(
        { error: "Provider is already validated" },
        { status: 400 }
      );
    }

    if (provider.validationStatus === "PENDING") {
      return NextResponse.json(
        { error: "Validation request is already pending" },
        { status: 400 }
      );
    }

    // Vérifications des informations obligatoires
    const errors = [];

    if (!provider.businessName || provider.businessName.length < 2) {
      errors.push("Le nom commercial est requis (minimum 2 caractères)");
    }

    if (!provider.siret || !/^\d{14}$/.test(provider.siret)) {
      errors.push("Le SIRET est requis (14 chiffres)");
    }

    if (!provider.description || provider.description.length < 50) {
      errors.push("La description est requise (minimum 50 caractères)");
    }

    if (!provider.user.profile?.phone) {
      errors.push("Le numéro de téléphone est requis");
    }

    if (!provider.user.profile?.address) {
      errors.push("L'adresse est requise");
    }

    if (!provider.user.profile?.city) {
      errors.push("La ville est requise");
    }

    if (!provider.user.profile?.postalCode) {
      errors.push("Le code postal est requis");
    }

    if (provider.services.length === 0) {
      errors.push("Au moins un service doit être défini");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: "Informations manquantes pour la validation",
          details: errors,
        },
        { status: 400 }
      );
    }

    // Mettre à jour le statut pour demander la validation
    const updatedProvider = await prisma.provider.update({
      where: { id: provider.id }, // Utiliser l'ID réel du provider
      data: {
        validationStatus: "PENDING",
        updatedAt: new Date(),
      },
    });

    // Créer une notification pour les admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Demande de validation prestataire",
          content: `${provider.businessName} a soumis sa candidature pour validation. SIRET: ${provider.siret}`,
          type: "PROVIDER_VALIDATION",
          priority: "MEDIUM",
          data: {
            providerId: provider.id,
            businessName: provider.businessName,
            siret: provider.siret,
            action: "VALIDATION_REQUESTED",
          },
        },
      });
    }

    // Créer une notification pour le prestataire
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Demande de validation envoyée",
        content: "Votre demande de validation a été envoyée avec succès. Vous recevrez une réponse sous 48h ouvrées.",
        type: "PROVIDER_VALIDATION",
        priority: "LOW",
        data: {
          providerId: provider.id,
          action: "VALIDATION_SUBMITTED",
        },
      },
    });

    return NextResponse.json({
      message: "Demande de validation envoyée avec succès",
      provider: {
        id: updatedProvider.id,
        validationStatus: updatedProvider.validationStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error submitting provider validation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 