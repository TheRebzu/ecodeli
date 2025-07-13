import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const submitValidationSchema = z.object({
  providerId: z.string().cuid(),
});

// POST - Soumettre une candidature complète pour validation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { providerId } = submitValidationSchema.parse(body);

    // Vérifier que le provider existe et appartient à l'utilisateur
    let provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { id: providerId, userId: session.user.id },
          { userId: providerId },
          { userId: session.user.id },
        ],
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        services: true,
        certifications: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Vérifier que le statut permet la soumission
    if (provider.validationStatus === "APPROVED") {
      return NextResponse.json(
        { error: "Provider is already validated" },
        { status: 400 },
      );
    }

    if (provider.validationStatus === "PENDING") {
      return NextResponse.json(
        { error: "Validation request is already pending" },
        { status: 400 },
      );
    }

    // Vérifications des informations obligatoires
    const errors = [];

    // Profil
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

    // Services
    if (provider.services.length === 0) {
      errors.push("Au moins un service doit être défini");
    }

    const incompleteServices = provider.services.filter(
      (s) => !s.name || !s.description || s.price <= 0,
    );
    if (incompleteServices.length > 0) {
      errors.push(`${incompleteServices.length} service(s) incomplet(s)`);
    }

    // Certifications (optionnelles mais si présentes doivent être complètes)
    const incompleteCertifications = provider.certifications.filter(
      (c) => !c.name || !c.issuingOrganization,
    );
    if (incompleteCertifications.length > 0) {
      errors.push(
        `${incompleteCertifications.length} certification(s) incomplète(s)`,
      );
    }

    // Tarifs (vérifier qu'au moins un tarif est proposé)
    const rates = await prisma.providerRate.findMany({
      where: { providerId: provider.id },
    });

    if (rates.length === 0) {
      errors.push("Au moins un tarif doit être proposé");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Informations manquantes pour la validation",
          details: errors,
        },
        { status: 400 },
      );
    }

    // Mettre à jour le statut pour demander la validation
    const updatedProvider = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        validationStatus: "PENDING",
        submittedAt: new Date(),
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
          content: `${provider.businessName} a soumis sa candidature complète pour validation. SIRET: ${provider.siret}`,
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
        content:
          "Votre candidature complète a été envoyée avec succès. Vous recevrez une réponse sous 48h ouvrées.",
        type: "PROVIDER_VALIDATION",
        priority: "LOW",
        data: {
          providerId: provider.id,
          action: "VALIDATION_SUBMITTED",
        },
      },
    });

    return NextResponse.json({
      message: "Candidature envoyée avec succès",
      provider: {
        id: updatedProvider.id,
        validationStatus: updatedProvider.validationStatus,
        submittedAt: updatedProvider.submittedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error submitting provider validation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
