import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Vue d'ensemble de la validation Provider
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId') || session.user.id;

    // Trouver ou créer le provider
    let provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { id: providerId },
          { userId: providerId }
        ]
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

    // Si pas trouvé et l'utilisateur est PROVIDER, créer automatiquement
    if (!provider && session.user.role === "PROVIDER") {
      provider = await prisma.provider.create({
        data: {
          userId: session.user.id,
          validationStatus: "DRAFT",
          businessName: "",
          siret: "",
          description: "",
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
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Calculer les pourcentages de completion
    let profileCompletion = 0;
    let servicesCompletion = 0;
    let certificationsCompletion = 0;
    let ratesCompletion = 0;

    // Profile completion (25 points par champ obligatoire)
    const requiredFields = ['businessName', 'siret', 'description'];
    const profileFields = requiredFields.filter(field => {
      const value = provider![field as keyof typeof provider];
      return value && value.toString().length > 0;
    });
    const userFields = ['phone', 'address', 'city', 'postalCode'].filter(field => {
      const value = provider!.user.profile?.[field as keyof typeof provider.user.profile];
      return value && value.toString().length > 0;
    });
    profileCompletion = Math.round(((profileFields.length + userFields.length) / 7) * 100);

    // Services completion
    if (provider.services.length > 0) {
      const servicesWithDetails = provider.services.filter(s => 
        s.name && s.description && s.price > 0
      );
      servicesCompletion = Math.round((servicesWithDetails.length / Math.max(provider.services.length, 1)) * 100);
    }

    // Certifications completion
    if (provider.certifications.length > 0) {
      const completeCertifications = provider.certifications.filter(c => 
        c.name && c.issuingOrganization && c.documentUrl
      );
      certificationsCompletion = Math.round((completeCertifications.length / Math.max(provider.certifications.length, 1)) * 100);
    }

    // Rates completion - Vérifier s'il y a des tarifs configurés
    const rates = await prisma.providerRate.findMany({
      where: { providerId: provider.id }
    });
    
    if (rates.length > 0) {
      const approvedRates = rates.filter(r => r.status === 'APPROVED');
      ratesCompletion = Math.round((approvedRates.length / Math.max(rates.length, 1)) * 100);
    }

    return NextResponse.json({
      id: provider.id,
      validationStatus: provider.validationStatus,
      profileCompletion,
      servicesCompletion,
      certificationsCompletion,
      ratesCompletion,
      lastUpdated: provider.updatedAt.toISOString(),
      validationNotes: provider.validationNotes,
    });
  } catch (error) {
    console.error("Error fetching provider validation overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 