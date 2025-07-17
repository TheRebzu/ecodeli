import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "🔍 [GET /api/provider/interventions] Applications payées du prestataire",
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
    const sortBy = searchParams.get("sortBy") || "createdAt";

    // Rechercher les applications PAYÉES, EN COURS et TERMINÉES du prestataire
    const where: any = {
      providerId: user.id,
      status: {
        in: ["PAID", "IN_PROGRESS", "COMPLETED"]
      }
    };

    // Filtrer par statut supplémentaire si spécifié
    if (status) {
      where.status = status;
    }

    console.log("🔍 Recherche avec critères:", where);

    // Récupérer les applications payées
    const [paidApplications, total] = await Promise.all([
      db.serviceApplication.findMany({
        where,
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
          [sortBy]: sortOrder as any,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.serviceApplication.count({ where }),
    ]);

    console.log(
      `✅ Applications payées trouvées: ${paidApplications.length} sur un total de ${total}`,
    );

    // Transformer les applications payées en format intervention
    const transformedApplications = paidApplications.map((app) => {
      return {
        id: app.id,
        providerId: app.providerId,
        clientId: app.announcement.authorId,
        serviceRequestId: app.announcementId,
        title: app.announcement.title,
        description: app.announcement.description,
        scheduledDate: app.paidAt?.toISOString() || app.updatedAt.toISOString(),
        estimatedDuration: app.estimatedDuration || 0,
        actualDuration: null,
        status: app.status,
        notes: app.message,
        rating: null,
        review: null,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
        type: "paid_application",
        client: {
          id: app.announcement.authorId,
          email: app.announcement.author.email,
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
          basePrice: app.proposedPrice || 0,
          status: app.announcement.status,
          pickupAddress: app.announcement.pickupAddress || "",
          deliveryAddress: app.announcement.deliveryAddress || "",
        },
        payment: {
          status: "COMPLETED", // Les applications PAID sont considérées comme ayant un paiement complété
          paidAt: app.paidAt,
        },
        applicationData: {
          proposedPrice: app.proposedPrice,
          message: app.message,
          applicationId: app.id,
          paymentStatus: app.status,
          paidAt: app.paidAt,
          availableDates: app.availableDates,
        },
      };
    });

    console.log(
      `✅ Applications payées transformées: ${transformedApplications.length}`,
    );

    return NextResponse.json({
      interventions: transformedApplications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des applications payées:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
