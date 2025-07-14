import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(3, "Le nom du service doit faire au moins 3 caractères"),
  description: z
    .string()
    .min(10, "La description doit faire au moins 10 caractères"),
  type: z.enum([
    "PERSON_TRANSPORT",
    "AIRPORT_TRANSFER",
    "SHOPPING",
    "INTERNATIONAL_PURCHASE",
    "PET_CARE",
    "HOME_SERVICE",
    "CART_DROP",
    "OTHER",
  ]),
  basePrice: z.number().positive("Le prix doit être positif"),
  duration: z.number().positive("La durée doit être positive"),
});

// GET - Liste des services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    // Construire les conditions de filtrage
    const whereConditions: any = {
      isActive: true,
    };

    if (type) {
      whereConditions.type = type;
    }

    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          provider: {
            profile: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    // Construire l'ordre de tri
    let orderBy: any = {};
    switch (sortBy) {
      case "basePrice":
        orderBy.basePrice = sortOrder === "desc" ? "desc" : "asc";
        break;
      case "duration":
        orderBy.duration = sortOrder === "desc" ? "desc" : "asc";
        break;
      case "name":
      default:
        orderBy.name = sortOrder === "desc" ? "desc" : "asc";
        break;
    }

    // Récupérer les services avec les informations du prestataire
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: whereConditions,
        include: {
          provider: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  city: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.service.count({
        where: whereConditions,
      }),
    ]);

    // Transformer les services pour l'interface
    const servicesWithStats = services.map((service: {
      id: string;
      name: string;
      description: string;
      type: string;
      basePrice: number;
      duration: number | null;
      isActive: boolean;
      provider: {
        id: string;
        profile: any;
      };
      createdAt: Date;
      updatedAt: Date;
    }) => {
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        type: service.type,
        basePrice: service.basePrice,
        duration: service.duration,
        isActive: service.isActive,
        provider: {
          id: service.provider.id,
          profile: service.provider.profile,
        },
        averageRating: 0, // Placeholder - no reviews relation in current schema
        totalReviews: 0, // Placeholder - no reviews relation in current schema
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      };
    });

    return NextResponse.json({
      services: servicesWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Créer un nouveau service (pour les prestataires)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un prestataire
    if (user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Only providers can create services" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    // Créer le service
    const service = await prisma.service.create({
      data: {
        ...validatedData,
        providerId: user.id,
      },
      include: {
        provider: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
