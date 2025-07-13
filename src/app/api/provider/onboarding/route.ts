import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/utils";

const providerOnboardingSchema = z.object({
  businessName: z
    .string()
    .min(2, "Le nom de l'entreprise doit faire au moins 2 caractères"),
  description: z
    .string()
    .min(20, "La description doit faire au moins 20 caractères"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  address: z.string().min(10, "Adresse requise"),
  city: z.string().min(2, "Ville requise"),
  postalCode: z.string().min(5, "Code postal invalide"),
  serviceCategories: z
    .array(z.string())
    .min(1, "Sélectionnez au moins une catégorie de service"),
  hourlyRate: z.number().min(10, "Tarif horaire minimum : 10€"),
  experience: z.string().min(1, "Sélectionnez votre niveau d'expérience"),
  certifications: z.array(z.string()).optional(),
  insurance: z.boolean(),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "Vous devez accepter les conditions"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Accès refusé - rôle prestataire requis" },
        { status: 403 },
      );
    }

    // Récupérer les informations d'onboarding du prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: user.id },
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
        { error: "Profil prestataire introuvable" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      provider,
    });
  } catch (error) {
    console.error("Erreur récupération onboarding:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Accès refusé - rôle prestataire requis" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      businessName,
      description,
      services,
      certifications,
      availability,
      pricing,
    } = body;

    // Mettre à jour ou créer le profil prestataire
    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {
        businessName,
        description,
        availability,
        pricing,
        onboardingCompleted: true,
      },
      create: {
        userId: user.id,
        businessName,
        description,
        availability,
        pricing,
        onboardingCompleted: true,
      },
    });

    // Ajouter les services
    if (services && services.length > 0) {
      await prisma.service.createMany({
        data: services.map((service: any) => ({
          providerId: provider.id,
          name: service.name,
          description: service.description,
          category: service.category,
          price: service.price,
          duration: service.duration,
        })),
      });
    }

    // Ajouter les certifications
    if (certifications && certifications.length > 0) {
      await prisma.certification.createMany({
        data: certifications.map((cert: any) => ({
          providerId: provider.id,
          name: cert.name,
          issuer: cert.issuer,
          issueDate: new Date(cert.issueDate),
          expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      provider,
    });
  } catch (error) {
    console.error("Erreur mise à jour onboarding:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
