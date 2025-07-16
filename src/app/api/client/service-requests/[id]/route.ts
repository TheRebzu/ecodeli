import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🔍 [GET /api/client/service-requests/[id]] Récupération détails demande de service",
    );

    const user = await getUserFromSession(request);
    if (!user) {
      console.log("❌ Utilisateur non authentifié");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log("✅ Utilisateur authentifié:", user.id, user.role);
    console.log("📝 Service Request ID:", id);

    // Récupérer la demande de service avec tous les détails
    const serviceRequest = await db.announcement.findFirst({
      where: {
        id: id,
        authorId: user.id,
        type: "HOME_SERVICE",
      },
      include: {
        author: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
                phone: true
              },
            },
          },
        },
        applications: {
          include: {
            provider: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    phone: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            applications: true,
            reviews: true
          },
        },
      },
    });

    if (!serviceRequest) {
      console.log("❌ Demande de service non trouvée");
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 },
      );
    }

    console.log("✅ Demande de service trouvée:", serviceRequest.id);

    // Transformer les données pour le frontend
    const serviceRequestDetails = {
      id: serviceRequest.id,
      title: serviceRequest.title,
      description: serviceRequest.description,
      status: serviceRequest.status,
      budget: serviceRequest.basePrice,
      currency: serviceRequest.currency,
      isUrgent: serviceRequest.isUrgent,
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString(),

      // Détails du service
      serviceDetails: serviceRequest.serviceDetails
        ? {
            serviceType:
              serviceRequest.serviceDetails.serviceType || "HOME_SERVICE",
            numberOfPeople: serviceRequest.serviceDetails.numberOfPeople,
            duration: serviceRequest.serviceDetails.estimatedDuration,
            recurringService:
              serviceRequest.serviceDetails.isRecurring || false,
            recurringPattern: serviceRequest.serviceDetails.frequency,
            specialRequirements:
              serviceRequest.serviceDetails.requirements?.join(", ") ||
              serviceRequest.serviceDetails.specialRequirements,
          }
        : null,

      // Localisation
      location: {
        address: serviceRequest.pickupAddress,
        city: serviceRequest.pickupAddress?.split(",").pop()?.trim() || "",
        scheduledAt: serviceRequest.pickupDate?.toISOString() || null,
      },

      // Auteur (client)
      author: {
        id: serviceRequest.author.id,
        profile: serviceRequest.author.profile,
      },

      // Candidatures reçues
      applications: serviceRequest.applications.map((app) => ({
        id: app.id,
        provider: {
          id: app.provider.id,
          name: `${app.provider.profile?.firstName || ""} ${app.provider.profile?.lastName || ""}`.trim(),
          avatar: app.provider.profile?.avatar,
          phone: app.provider.profile?.phone,
          rating: app.provider.averageRating || 0,
        },
        price: app.price,
        estimatedDuration: app.estimatedDuration,
        message: app.message,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
      })),

      // Réservations (vides pour l'instant car pas de relation directe)
      bookings: [],

      // Statistiques
      stats: {
        applicationsCount: serviceRequest._count.applications,
        reviewsCount: serviceRequest._count.reviews,
      },
    };

    return NextResponse.json(serviceRequestDetails);
  } catch (error) {
    console.error("❌ Erreur récupération détails demande de service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🔍 [PUT /api/client/service-requests/[id]] Mise à jour demande de service",
    );

    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Vérifier que la demande de service appartient à l'utilisateur
    const existingServiceRequest = await db.announcement.findFirst({
      where: {
        id: id,
        authorId: user.id,
        type: "HOME_SERVICE",
      },
    });

    if (!existingServiceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 },
      );
    }

    // Vérifier que la demande peut être modifiée
    if (
      existingServiceRequest.status !== "DRAFT" &&
      existingServiceRequest.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { error: "Service request cannot be modified" },
        { status: 400 },
      );
    }

    // Mettre à jour la demande de service
    const updatedServiceRequest = await db.announcement.update({
      where: { id: id },
      data: {
        title: body.title,
        description: body.description,
        basePrice: body.budget,
        isUrgent: body.isUrgent,
        pickupDate: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        deliveryDate: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedServiceRequest);
  } catch (error) {
    console.error("Error updating service request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🔍 [DELETE /api/client/service-requests/[id]] Suppression demande de service",
    );

    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que la demande de service appartient à l'utilisateur
    const existingServiceRequest = await db.announcement.findFirst({
      where: {
        id: id,
        authorId: user.id,
        type: "HOME_SERVICE",
      },
    });

    if (!existingServiceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 },
      );
    }

    // Vérifier que la demande peut être supprimée
    if (
      existingServiceRequest.status !== "DRAFT" &&
      existingServiceRequest.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { error: "Service request cannot be deleted" },
        { status: 400 },
      );
    }

    // Supprimer la demande de service
    await db.announcement.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
