import { NextRequest, NextResponse } from "next/server";
import {
  createServiceSchema,
  searchServicesSchema,
} from "@/features/services/schemas/service.schema";
import { requireRole } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "🔍 [GET /api/client/services] Début de la requête - SERVICES À LA PERSONNE UNIQUEMENT",
    );

    const user = await requireRole(request, ["CLIENT"]);

    console.log("✅ Utilisateur authentifié:", user.id, user.role);

    const { searchParams } = new URL(request.url);

    // Validation des paramètres avec le schema
    const params = searchServicesSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      type: searchParams.get("type"),
      category: searchParams.get("category"),
      priceMin: searchParams.get("priceMin"),
      priceMax: searchParams.get("priceMax"),
      city: searchParams.get("city"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      urgent: searchParams.get("urgent"),
      requiresCertification: searchParams.get("requiresCertification"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    console.log("📝 Paramètres de recherche services:", params);

    // Construction des filtres
    const where: any = {
      isActive: true,
    };

    // Filtres optionnels
    if (params.type) {
      where.type = params.type;
    }

    if (params.priceMin || params.priceMax) {
      where.basePrice = {};
      if (params.priceMin) where.basePrice.gte = parseFloat(params.priceMin);
      if (params.priceMax) where.basePrice.lte = parseFloat(params.priceMax);
    }

    console.log(
      "🔍 Requête base de données avec filtres pour services à la personne...",
    );

    try {
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
                      },
                    },
                  },
                },
              },
            },
            bookings: {
              where: {
                clientId: user.id,
              },
              include: {
                client: {
                  include: {
                    user: {
                      include: {
                        profile: {
                          select: {
                            firstName: true,
                            lastName: true,
                            avatar: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            [params.sortBy || "createdAt"]: params.sortOrder || "desc",
          },
          skip: (params.page - 1) * params.limit,
          take: params.limit,
        }),
        db.service.count({ where }),
      ]);

      console.log(
        `✅ Services trouvés: ${services.length} sur un total de ${total}`,
      );

      return NextResponse.json({
        services,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit),
        },
      });
    } catch (dbError) {
      console.error("❌ Erreur base de données:", dbError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des services" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔍 [POST /api/client/services] Demande de service - PRESTATIONS À LA PERSONNE UNIQUEMENT",
    );

    const user = await requireRole(request, ["CLIENT"]);

    console.log("✅ Utilisateur authentifié:", user.id, user.role);

    const body = await request.json();
    console.log("📝 Données reçues:", body);

    try {
      const validatedData = createServiceSchema.parse(body);
      console.log("✅ Données de service validées avec succès");

      console.log("🔍 Création de la demande de service en base...");

      // Préparer les données selon le type de service
      const serviceData: any = {
        name: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        basePrice: validatedData.basePrice,
        priceUnit: validatedData.priceUnit,
        duration: validatedData.estimatedDuration,
        minAdvanceBooking: 24, // 24h par défaut
        isActive: true,

        // Instructions et notes
        requirements: validatedData.specialRequirements
          ? [validatedData.specialRequirements]
          : [],
        cancellationPolicy: validatedData.allowsReschedule
          ? "Modification autorisée jusqu'à 24h avant"
          : "Pas de modification possible",
      };

      // Créer d'abord le service
      const service = await db.service.create({
        data: serviceData,
        include: {
          provider: {
            include: {
              user: {
                include: {
                  profile: {
                    select: { firstName: true, lastName: true, avatar: true },
                  },
                },
              },
            },
          },
        },
      });

      // Ensuite créer une réservation pour ce service
      const booking = await db.booking.create({
        data: {
          clientId: user.id,
          serviceId: service.id,
          providerId: service.providerId, // Le prestataire sera assigné plus tard via matching
          status: "PENDING",
          scheduledDate: new Date(validatedData.scheduledDate),
          scheduledTime: validatedData.startTime,
          duration: validatedData.estimatedDuration,
          address: validatedData.location,
          totalPrice: validatedData.basePrice,
          notes: validatedData.clientNotes,
        },
        include: {
          service: true,
          client: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
      });

      console.log(
        "✅ Service et réservation créés avec succès:",
        service.id,
        booking.id,
      );

      const result = {
        service: {
          id: service.id,
          name: service.name,
          description: service.description,
          type: service.type,
          category: service.category,
          basePrice: Number(service.basePrice),
          priceUnit: service.priceUnit,
          duration: service.duration,
          isActive: service.isActive,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
        },
        booking: {
          id: booking.id,
          status: booking.status,
          scheduledDate: booking.scheduledDate.toISOString(),
          scheduledTime: booking.scheduledTime,
          duration: booking.duration,
          totalPrice: Number(booking.totalPrice),
          createdAt: booking.createdAt.toISOString(),
          client: {
            id: booking.client.id,
            name: booking.client.profile
              ? `${booking.client.profile.firstName || ""} ${booking.client.profile.lastName || ""}`.trim()
              : booking.client.email,
            avatar: booking.client.profile?.avatar,
          },
        },
      };

      return NextResponse.json(result, { status: 201 });
    } catch (validationError: any) {
      console.error("❌ Erreur validation/création service:", validationError);
      return NextResponse.json(
        {
          error: "Validation or creation error",
          details: validationError?.message || "Validation failed",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("❌ Erreur générale POST services:", error);

    // Si c'est une erreur d'authentification, retourner 403
    if (error?.message?.includes("Accès refusé")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
