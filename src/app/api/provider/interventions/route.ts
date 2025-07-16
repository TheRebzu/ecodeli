import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "🔍 [GET /api/provider/interventions] Interventions du prestataire",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      console.log("❌ Utilisateur non authentifié ou non prestataire");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Prestataire authentifié:", user.id, user.role);

    // Récupérer le profil prestataire
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      console.log("❌ Profil prestataire non trouvé");
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    console.log("✅ Profil prestataire trouvé:", provider.id);

    // Récupérer les paramètres de pagination et de filtre
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || undefined;
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const sortBy = searchParams.get("sortBy") || "scheduledDate";

    const where: any = { providerId: provider.id };
    if (status) where.status = status;

    // Récupérer les interventions existantes
    const [interventions, total] = await Promise.all([
      db.intervention.findMany({
        where,
        include: {
          booking: {
            include: {
              client: {
                include: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                      address: true,
                      city: true,
                    },
                  },
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  basePrice: true,
                },
              },
              payment: {
                select: {
                  id: true,
                  amount: true,
                  currency: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: sortOrder as any,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.intervention.count({ where }),
    ]);

    console.log(
      `✅ Interventions trouvées: ${interventions.length} sur un total de ${total}`,
    );

    // Transformer les interventions existantes
    const transformedInterventions = interventions.map((intervention) => ({
      id: intervention.id,
      providerId: intervention.providerId,
      clientId: intervention.booking.clientId,
      serviceRequestId: intervention.booking.serviceId,
      title: intervention.booking.service.name,
      description: intervention.booking.service.description,
      scheduledDate: intervention.booking.scheduledDate.toISOString(),
      estimatedDuration: intervention.booking.duration,
      actualDuration: intervention.actualDuration,
      status: intervention.isCompleted ? "COMPLETED" : "IN_PROGRESS",
      notes: intervention.report,
      rating: null, // TODO: récupérer depuis review si nécessaire
      review: null,
      createdAt: intervention.createdAt.toISOString(),
      updatedAt: intervention.updatedAt.toISOString(),
      type: "intervention",
      client: {
        id: intervention.booking.client.id,
        profile: {
          firstName: intervention.booking.client.profile?.firstName || "",
          lastName: intervention.booking.client.profile?.lastName || "",
          phone: intervention.booking.client.profile?.phone,
          address: intervention.booking.client.profile?.address,
          city: intervention.booking.client.profile?.city,
        },
      },
      serviceRequest: {
        id: intervention.booking.service.id,
        title: intervention.booking.service.name,
        description: intervention.booking.service.description,
        basePrice: intervention.booking.service.basePrice,
        status: intervention.booking.status,
        pickupAddress: "", // Bookings n'ont pas ces champs
        deliveryAddress: "",
      },
      payment: intervention.booking.payment
        ? {
            id: intervention.booking.payment.id,
            amount: intervention.booking.payment.amount,
            currency: intervention.booking.payment.currency,
            status: intervention.booking.payment.status,
          }
        : null,
    }));

    // Récupérer les candidatures acceptées qui n'ont pas encore d'intervention
    const acceptedApplications = await db.serviceApplication.findMany({
      where: {
        providerId: provider.id,
        status: "ACCEPTED",
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      `✅ Candidatures acceptées trouvées: ${acceptedApplications.length}`,
    );

    // Transformer les candidatures acceptées en format intervention
    const transformedApplications = acceptedApplications.map((app) => ({
      id: `app_${app.id}`, // Préfixe pour distinguer des interventions
      providerId: app.providerId,
      clientId: app.announcement.authorId,
      serviceRequestId: app.announcementId,
      title: app.announcement.title,
      description: app.announcement.description,
      scheduledDate: new Date().toISOString(), // Date actuelle car pas encore planifiée
      estimatedDuration: app.estimatedDuration,
      actualDuration: null,
      status: "ACCEPTED_PENDING_PAYMENT", // Statut spécial pour candidatures acceptées
      notes: app.message,
      rating: null,
      review: null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      type: "application",
      client: {
        id: app.announcement.authorId,
        profile: {
          firstName: app.announcement.author.profile?.firstName || "",
          lastName: app.announcement.author.profile?.lastName || "",
          phone: app.announcement.author.profile?.phone,
          address: app.announcement.author.profile?.address,
          city: app.announcement.author.profile?.city,
        },
      },
      serviceRequest: {
        id: app.announcement.id,
        title: app.announcement.title,
        description: app.announcement.description,
        basePrice: app.proposedPrice, // Utiliser le prix proposé
        status: app.announcement.status,
        pickupAddress: app.announcement.pickupAddress || "",
        deliveryAddress: app.announcement.deliveryAddress || "",
      },
      payment: null, // Pas encore de paiement
      applicationData: {
        proposedPrice: app.proposedPrice,
        message: app.message,
        applicationId: app.id,
      },
    }));

    // Combiner les interventions et les candidatures acceptées
    const allItems = [...transformedInterventions, ...transformedApplications];

    // Trier par date de création (plus récent en premier)
    allItems.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    console.log(
      `✅ Total items (interventions + candidatures acceptées): ${allItems.length}`,
    );

    return NextResponse.json({
      interventions: allItems,
      pagination: {
        page: page,
        limit: limit,
        total: total + acceptedApplications.length,
        totalPages: Math.ceil((total + acceptedApplications.length) / limit),
      },
    });
  } catch (error) {
    console.error("❌ Erreur base de données:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
