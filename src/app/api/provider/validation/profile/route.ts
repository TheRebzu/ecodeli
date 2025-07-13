import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const profileUpdateSchema = z.object({
  providerId: z.string().cuid(),
  businessName: z
    .string()
    .min(2, "Le nom commercial doit faire au moins 2 caractères"),
  siret: z.string().regex(/^\d{14}$/, "Le SIRET doit faire 14 chiffres"),
  description: z
    .string()
    .min(50, "La description doit faire au moins 50 caractères"),
  phone: z
    .string()
    .min(10, "Le numéro de téléphone doit faire au moins 10 caractères"),
  street: z.string().min(5, "L'adresse doit faire au moins 5 caractères"),
  city: z.string().min(2, "La ville doit faire au moins 2 caractères"),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, "Le code postal doit faire 5 chiffres"),
  country: z.string().default("France"),
});

// GET - Récupérer le profil de validation d'un prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 },
      );
    }

    // Récupérer le profil provider - accepter soit l'ID du provider soit l'ID de l'utilisateur
    let provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                address: true,
                city: true,
                postalCode: true,
                country: true,
              },
            },
          },
        },
      },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: { userId: providerId },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  address: true,
                  city: true,
                  postalCode: true,
                  country: true,
                },
              },
            },
          },
        },
      });
    }

    // Si toujours pas trouvé et que l'utilisateur est un PROVIDER, créer le profil provider
    if (!provider && session.user.role === "PROVIDER") {
      provider = await prisma.provider.create({
        data: {
          userId: session.user.id,
          businessName: "",
          siret: "",
          description: "",
          validationStatus: "PENDING",
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  address: true,
                  city: true,
                  postalCode: true,
                  country: true,
                },
              },
            },
          },
        },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Vérifier les permissions (le prestataire ne peut voir que son profil, les admins peuvent tout voir)
    if (session.user.role !== "ADMIN" && provider.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer les documents du prestataire
    const documents = await prisma.document.findMany({
      where: {
        userId: provider.userId,
      },
      select: {
        id: true,
        type: true,
        filename: true,
        validationStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Formater la réponse
    const profileData = {
      id: provider.id,
      businessName: provider.businessName,
      siret: provider.siret,
      description: provider.description,
      phone: provider.user.profile?.phone,
      address: {
        street: provider.user.profile?.address || "",
        city: provider.user.profile?.city || "",
        postalCode: provider.user.profile?.postalCode || "",
        country: provider.user.profile?.country || "France",
      },
      validationStatus: provider.validationStatus,
      validationNotes: null, // À ajouter au modèle si nécessaire
      validatedAt: provider.activatedAt,
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        filename: doc.filename,
        validationStatus: doc.validationStatus,
        uploadedAt: doc.createdAt.toISOString(),
      })),
    };

    return NextResponse.json({ profile: profileData });
  } catch (error) {
    console.error("Error fetching provider validation profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Mettre à jour le profil de validation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = profileUpdateSchema.parse(body);

    // Vérifier que le provider existe - accepter soit l'ID du provider soit l'ID de l'utilisateur
    let provider = await prisma.provider.findUnique({
      where: { id: validatedData.providerId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: { userId: validatedData.providerId },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
    }

    // Si toujours pas trouvé et que l'utilisateur est un PROVIDER, créer le profil provider
    if (!provider && session.user.role === "PROVIDER") {
      provider = await prisma.provider.create({
        data: {
          userId: session.user.id,
          businessName: "",
          siret: "",
          description: "",
          validationStatus: "PENDING",
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Vérifier les permissions
    if (session.user.role !== "ADMIN" && provider.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier l'unicité du SIRET (sauf pour le provider actuel)
    const existingSiret = await prisma.provider.findFirst({
      where: {
        siret: validatedData.siret,
        id: { not: provider.id }, // Utiliser l'ID réel du provider
      },
    });

    if (existingSiret) {
      return NextResponse.json(
        { error: "Ce numéro SIRET est déjà utilisé" },
        { status: 400 },
      );
    }

    // Mettre à jour le provider
    const updatedProvider = await prisma.provider.update({
      where: { id: provider.id }, // Utiliser l'ID réel du provider
      data: {
        businessName: validatedData.businessName,
        siret: validatedData.siret,
        description: validatedData.description,
      },
    });

    // Mettre à jour le profil utilisateur
    if (provider.user.profile) {
      await prisma.profile.update({
        where: { userId: provider.userId },
        data: {
          phone: validatedData.phone,
          address: validatedData.street,
          city: validatedData.city,
          postalCode: validatedData.postalCode,
          country: validatedData.country,
        },
      });
    } else {
      // Créer le profil s'il n'existe pas
      await prisma.profile.create({
        data: {
          userId: provider.userId,
          phone: validatedData.phone,
          address: validatedData.street,
          city: validatedData.city,
          postalCode: validatedData.postalCode,
          country: validatedData.country,
        },
      });
    }

    return NextResponse.json({
      message: "Profil mis à jour avec succès",
      provider: updatedProvider,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating provider validation profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
