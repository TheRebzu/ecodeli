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
      announcement: {
        authorId: user.id,
      },
    };

    // Filtres optionnels
    if (params.status) {
      where.status = (await params).status;
    }

    if (params.serviceRequestId) {
      where.announcementId = (await params).serviceRequestId;
    }

    console.log("🔍 Requête base de données candidatures avec filtres...");

    try {
      const [applications, total] = await Promise.all([
        db.serviceApplication.findMany({
          where,
          include: {
            provider: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    city: true,
                  },
                },
                provider: {
                  select: {
                    id: true,
                    businessName: true,
                    averageRating: true,
                    specialties: true,
                  },
                },
              },
            },
            announcement: {
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
            [(await params).sortBy]: (await params).sortOrder,
          },
          skip: (params.page - 1) * (await params).limit,
          take: (await params).limit,
        }),
        db.serviceApplication.count({ where }),
      ]);

      console.log(
        `✅ Candidatures trouvées: ${applications.length} sur un total de ${total}`,
      );

      // Transformer les données pour correspondre à l'interface frontend
      const transformedApplications = applications.map((application) => ({
        id: application.id,
        serviceRequestId: application.announcementId,
        providerId: application.providerId,
        proposedPrice: application.proposedPrice,
        estimatedDuration: application.estimatedDuration,
        message: application.message,
        status: application.status,
        availableDates: application.availableDates || [],
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        paymentStatus: application.paymentStatus || "PENDING",
        paidAt: application.paidAt ? application.paidAt.toISOString() : null,
        provider: {
          id: application.provider.id,
          profile: {
            firstName: application.provider.profile?.firstName || "",
            lastName: application.provider.profile?.lastName || "",
            avatar: application.provider.profile?.avatar,
            city: application.provider.profile?.city,
          },
          businessName: application.provider.provider?.businessName,
          averageRating: application.provider.provider?.averageRating || 0,
          specialties: application.provider.provider?.specialties || [],
        },
        serviceRequest: {
          id: application.announcement.id,
          title: application.announcement.title,
          description: application.announcement.description,
          basePrice: application.announcement.basePrice,
          status: application.announcement.status,
          createdAt: application.announcement.createdAt.toISOString(),
        },
      }));

      return NextResponse.json({
        applications: transformedApplications,
        pagination: {
          page: (await params).page,
          limit: (await params).limit,
          total,
          totalPages: Math.ceil(total / (await params).limit),
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
