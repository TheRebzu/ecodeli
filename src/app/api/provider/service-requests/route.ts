import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "🔍 [GET /api/provider/service-requests] Début de la requête - DEMANDES DE SERVICES POUR PRESTATAIRES",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      console.log("❌ Utilisateur non authentifié ou non prestataire");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Prestataire authentifié:", user.id, user.role);

    // Récupérer le profil prestataire avec ses spécialités
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
      include: {
        services: {
          where: { isActive: true },
        },
      },
    });

    if (!provider) {
      console.log("❌ Profil prestataire non trouvé");
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);

    // Validation des paramètres
    const params = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
      status: searchParams.get("status"),
      type: searchParams.get("type"),
      budgetMin: searchParams.get("budgetMin"),
      budgetMax: searchParams.get("budgetMax"),
      city: searchParams.get("city"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      urgency: searchParams.get("urgency"),
      isRecurring: searchParams.get("isRecurring"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    console.log("📝 Paramètres de recherche demandes de services:", params);

    // Construction des filtres - demandes de services actives des clients
    const where: any = {
      type: "HOME_SERVICE",
      status: "ACTIVE", // Seulement les demandes actives
    };

    // Filtres optionnels
    if (params.status) {
      where.status = (await params).status;
    }

    if (params.budgetMin || (await params).budgetMax) {
      where.basePrice = {};
      if (params.budgetMin) where.basePrice.gte = parseFloat(params.budgetMin);
      if (params.budgetMax) where.basePrice.lte = parseFloat(params.budgetMax);
    }

    if (params.urgency) {
      where.isUrgent = (await params).urgency === "true";
    }

    if (params.city) {
      where.location = {
        path: ["city"],
        contains: (await params).city,
      };
    }

    // Filtrer par types de services que le prestataire propose
    const providerServiceTypes = provider.services.map((s) => s.type);
    console.log("🔍 Types de services du prestataire:", providerServiceTypes);

    if (providerServiceTypes.length > 0) {
      // Filtrer par ServiceAnnouncement.serviceType au lieu de serviceDetails JSON
      where.ServiceAnnouncement = {
        serviceType: {
          in: providerServiceTypes,
        },
      };
    }

    // Exclure les demandes auxquelles le prestataire a déjà candidaté
    where.NOT = {
      applications: {
        some: {
          providerId: provider.id,
        },
      },
    };

    console.log("🔍 Filtres WHERE appliqués:", JSON.stringify(where, null, 2));

    console.log(
      "🔍 Requête base de données demandes de services avec filtres...",
    );

    try {
      // Debug: Vérifier toutes les demandes de services existantes
      const allServiceRequests = await db.announcement.findMany({
        where: { type: "HOME_SERVICE" },
        include: {
          ServiceAnnouncement: true,
          author: {
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
      });

      console.log(
        "🔍 Toutes les demandes de services HOME_SERVICE:",
        allServiceRequests.length,
      );
      allServiceRequests.forEach((req, index) => {
        console.log(`🔍 Service request ${index + 1}:`, {
          id: req.id,
          title: req.title,
          status: req.status,
          serviceType: req.ServiceAnnouncement?.serviceType,
          authorId: req.authorId,
        });
      });

      const [serviceRequests, total] = await Promise.all([
        db.announcement.findMany({
          where,
          include: {
            author: {
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
            ServiceAnnouncement: true, // Inclure les détails de service
            applications: {
              where: {
                providerId: provider.id,
              },
              select: {
                id: true,
                status: true,
              },
            },
            _count: {
              select: {
                reviews: true,
                matches: true,
                attachments: true,
                notifications: true,
                tracking: true,
                AnnouncementGroup: true,
                GroupingProposal: true,
              },
            },
          },
          orderBy: {
            [(await params).sortBy]: (await params).sortOrder,
          },
          skip: (params.page - 1) * (await params).limit,
          take: (await params).limit,
        }),
        db.announcement.count({ where }),
      ]);

      console.log(
        `✅ Demandes de services trouvées: ${serviceRequests.length} sur un total de ${total}`,
      );

      // Debug: Afficher les données du premier service request
      if (serviceRequests.length > 0) {
        console.log("🔍 Premier service request - Données client:", {
          id: serviceRequests[0].id,
          title: serviceRequests[0].title,
          author: serviceRequests[0].author,
          authorProfile: serviceRequests[0].author?.profile,
          serviceAnnouncement: serviceRequests[0].ServiceAnnouncement,
          hasApplication: serviceRequests[0].applications.length > 0,
        });
      }

      // Debug: Vérifier que les candidatures sont bien exclues
      console.log("🔍 Vérification filtrage candidatures:");
      serviceRequests.forEach((req, index) => {
        console.log(
          `  - ${index + 1}. "${req.title}" - Candidatures: ${req.applications.length}`,
        );
      });

      // Transformer les données pour correspondre à l'interface frontend
      const transformedRequests = serviceRequests.map((request) => ({
        id: request.id,
        title: request.title,
        description: request.description,
        serviceType: request.ServiceAnnouncement?.serviceType || "HOME_SERVICE",
        status: request.status,
        budget: request.basePrice,
        estimatedDuration: request.ServiceAnnouncement?.duration || 60,
        scheduledAt:
          request.pickupDate?.toISOString() || new Date().toISOString(),
        isRecurring: request.ServiceAnnouncement?.recurringService || false,
        frequency: request.ServiceAnnouncement?.recurringPattern,
        urgency: request.isUrgent ? "URGENT" : "NORMAL",
        location: request.location
          ? {
              address: (request.location as any)?.address || "",
              city: (request.location as any)?.city || "",
              postalCode: (request.location as any)?.postalCode || "",
              latitude: (request.location as any)?.latitude,
              longitude: (request.location as any)?.longitude,
            }
          : undefined,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        clientId: request.authorId,
        client: {
          id: request.author.id,
          profile: {
            firstName: request.author.profile?.firstName || "",
            lastName: request.author.profile?.lastName || "",
            avatar: request.author.profile?.avatar,
          },
        },
        hasApplied: request.applications.length > 0, // Normalement toujours false maintenant
        _count: request._count,
      }));

      // Debug: Afficher les données transformées
      if (transformedRequests.length > 0) {
        console.log("🔍 Premier service request transformé - Données client:", {
          id: transformedRequests[0].id,
          title: transformedRequests[0].title,
          client: transformedRequests[0].client,
          clientProfile: transformedRequests[0].client?.profile,
          serviceType: transformedRequests[0].serviceType,
        });
      }

      return NextResponse.json({
        serviceRequests: transformedRequests,
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
        { error: "Erreur lors de la récupération des demandes de services" },
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
