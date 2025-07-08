import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const serviceSchema = z.object({
  providerId: z.string().cuid(),
  name: z.string().min(3, "Le nom du service doit faire au moins 3 caractères"),
  description: z.string().min(10, "La description doit faire au moins 10 caractères"),
  type: z.enum(["PERSON_TRANSPORT", "AIRPORT_TRANSFER", "SHOPPING", "INTERNATIONAL_PURCHASE", "PET_CARE", "HOME_SERVICE", "CART_DROP", "OTHER"]),
  basePrice: z.number().positive("Le prix de base doit être positif"),
  priceUnit: z.enum(["HOUR", "FLAT", "KM", "DAY"]),
  duration: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  requirements: z.array(z.string()).default([]),
  minAdvanceBooking: z.number().positive("Le délai minimum de réservation doit être positif"),
  maxAdvanceBooking: z.number().positive("Le délai maximum de réservation doit être positif"),
});

// GET - Récupérer les services d'un prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Vérifier les permissions - accepter soit l'ID du provider soit l'ID de l'utilisateur
    let provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: { userId: providerId },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && provider.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Récupérer les services
    const services = await prisma.service.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Error fetching provider services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau service
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
    const validatedData = serviceSchema.parse(body);

    // Vérifier que le provider existe et appartient à l'utilisateur - accepter userId ou providerId
    let provider = await prisma.provider.findFirst({
      where: {
        id: validatedData.providerId,
        userId: session.user.id,
      },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: {
          userId: validatedData.providerId,
        },
      });
      
      // Vérifier que ce provider appartient bien à l'utilisateur connecté
      if (provider && provider.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Créer le service - utiliser le vrai providerId du record Provider
    const service = await prisma.service.create({
      data: {
        providerId: provider.id, // Utiliser l'ID du provider trouvé, pas celui passé en paramètre
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        basePrice: validatedData.basePrice,
        duration: validatedData.duration,
        isActive: validatedData.isActive,
        requirements: validatedData.requirements,
        minAdvanceBooking: validatedData.minAdvanceBooking,
        maxAdvanceBooking: validatedData.maxAdvanceBooking,
      },
    });

    return NextResponse.json({
      message: "Service créé avec succès",
      service,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating provider service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 