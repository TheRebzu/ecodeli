import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const searchParamsSchema = z.object({
  page: z
    .string()
    .nullable()
    .optional()
    .default("1")
    .transform((val) => Number(val || "1")),
  limit: z
    .string()
    .nullable()
    .optional()
    .default("12")
    .transform((val) => Number(val || "12")),
  category: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || undefined),
  priceMin: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  priceMax: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  city: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || undefined),
  search: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val || undefined),
  sortBy: z
    .enum(["price", "rating", "name", "created"])
    .nullable()
    .optional()
    .default("created")
    .transform((val) => val || "created"),
  sortOrder: z
    .enum(["asc", "desc"])
    .nullable()
    .optional()
    .default("desc")
    .transform((val) => val || "desc"),
});

// GET - Récupérer tous les services disponibles publiquement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = searchParamsSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      category: searchParams.get("category"),
      priceMin: searchParams.get("priceMin"),
      priceMax: searchParams.get("priceMax"),
      city: searchParams.get("city"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    // Construire les filtres WHERE
    const where: any = {
      isActive: true, // Seulement les services actifs
      provider: {
        validationStatus: {
          in: ["APPROVED", "VALIDATED"] // Accepter les deux statuts valides
        },
        isActive: true,
      },
    };

    if (params.category) {
      where.type = params.category;
    }

    if (params.priceMin || params.priceMax) {
      where.basePrice = {};
      if (params.priceMin) where.basePrice.gte = params.priceMin;
      if (params.priceMax) where.basePrice.lte = params.priceMax;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        {
          provider: {
            businessName: { contains: params.search, mode: "insensitive" },
          },
        },
      ];
    }

    if (params.city) {
      // Filtrer par zone géographique du provider
      where.provider.zone = {
        path: ["city"],
        string_contains: params.city,
      };
    }

    // Construire l'ordre de tri
    let orderBy: any = {};

    switch (params.sortBy) {
      case "price":
        orderBy.basePrice = params.sortOrder;
        break;
      case "rating":
        orderBy.provider = { averageRating: params.sortOrder };
        break;
      case "name":
        orderBy.name = params.sortOrder;
        break;
      default:
        orderBy.createdAt = params.sortOrder;
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        include: {
          provider: {
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatar: true,
                      city: true,
                    },
                  },
                },
              },
            },
          },
          // Inclure quelques avis récents
          _count: {
            select: {
              bookings: {
                where: { status: "COMPLETED" },
              },
            },
          },
        },
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      db.service.count({ where }),
    ]);

    // Formater les résultats
    const formattedServices = services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      type: service.type,
      basePrice: Number(service.basePrice),
      priceUnit: service.priceUnit,
      duration: service.duration,
      minAdvanceBooking: service.minAdvanceBooking,
      maxAdvanceBooking: service.maxAdvanceBooking,
      requirements: service.requirements,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      completedBookings: service._count.bookings,

      provider: {
        id: service.provider.id,
        businessName: service.provider.businessName,
        description: service.provider.description,
        averageRating: Number(service.provider.averageRating || 0),
        totalBookings: service.provider.totalBookings,
        specialties: service.provider.specialties,
        hourlyRate: service.provider.hourlyRate
          ? Number(service.provider.hourlyRate)
          : null,
        isActive: service.provider.isActive,
        user: {
          id: service.provider.user.id,
          name: service.provider.user.profile
            ? `${service.provider.user.profile.firstName || ""} ${service.provider.user.profile.lastName || ""}`.trim()
            : service.provider.businessName || "Prestataire",
          avatar: service.provider.user.profile?.avatar,
          city: service.provider.user.profile?.city,
        },
      },
    }));

    // Calculer les statistiques
    const stats = {
      total,
      averagePrice:
        formattedServices.length > 0
          ? formattedServices.reduce((sum, s) => sum + s.basePrice, 0) /
            formattedServices.length
          : 0,
      priceRange: {
        min:
          formattedServices.length > 0
            ? Math.min(...formattedServices.map((s) => s.basePrice))
            : 0,
        max:
          formattedServices.length > 0
            ? Math.max(...formattedServices.map((s) => s.basePrice))
            : 0,
      },
      categoryBreakdown: await db.service.groupBy({
        by: ["type"],
        where: { ...where },
        _count: { type: true },
      }),
    };

    const result = {
      services: formattedServices,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNext: params.page < Math.ceil(total / params.limit),
        hasPrev: params.page > 1,
      },
      stats,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching public services:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
