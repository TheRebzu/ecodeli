import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "🔍 [GET /api/client/applications] Candidatures reçues par le client",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      console.log("❌ Utilisateur non authentifié ou non client");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Client authentifié:", user.id, user.role);

    const { searchParams } = new URL(request.url);

    // Validation des paramètres
    const params = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
      status: searchParams.get("status"),
      serviceRequestId: searchParams.get("serviceRequestId"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    console.log("📝 Paramètres de recherche candidatures:", params);

    // Construction des filtres - candidatures pour les demandes du client
    const where: any = {
      serviceRequest: {
        authorId: user.id,
      },
    };

    // Filtres optionnels
    if (params.status) {
      where.status = params.status;
    }

    if (params.serviceRequestId) {
      where.serviceRequestId = params.serviceRequestId;
    }

    console.log("🔍 Requête base de données candidatures avec filtres...");

    try {
      const [applications, total] = await Promise.all([
        db.serviceApplication.findMany({
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
            serviceRequest: {
              select: {
                id: true,
                title: true,
                description: true,
                basePrice: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            [params.sortBy]: params.sortOrder,
          },
          skip: (params.page - 1) * params.limit,
          take: params.limit,
        }),
        db.serviceApplication.count({ where }),
      ]);

      console.log(
        `✅ Candidatures trouvées: ${applications.length} sur un total de ${total}`,
      );

      // Transformer les données pour correspondre à l'interface frontend
      const transformedApplications = applications.map((application) => ({
        id: application.id,
        serviceRequestId: application.serviceRequestId,
        providerId: application.providerId,
        proposedPrice: application.proposedPrice,
        estimatedDuration: application.estimatedDuration,
        message: application.message,
        status: application.status,
        availableDates: application.availableDates || [],
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        provider: {
          id: application.provider.id,
          businessName: application.provider.businessName,
          hourlyRate: application.provider.hourlyRate,
          averageRating: application.provider.averageRating,
          totalBookings: application.provider.totalBookings,
          user: {
            id: application.provider.user.id,
            profile: {
              firstName: application.provider.user.profile?.firstName || "",
              lastName: application.provider.user.profile?.lastName || "",
              avatar: application.provider.user.profile?.avatar,
              city: application.provider.user.profile?.city,
            },
          },
        },
        serviceRequest: {
          id: application.serviceRequest.id,
          title: application.serviceRequest.title,
          description: application.serviceRequest.description,
          basePrice: application.serviceRequest.basePrice,
          status: application.serviceRequest.status,
          createdAt: application.serviceRequest.createdAt.toISOString(),
        },
      }));

      return NextResponse.json({
        applications: transformedApplications,
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
        { error: "Erreur lors de la récupération des candidatures" },
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
