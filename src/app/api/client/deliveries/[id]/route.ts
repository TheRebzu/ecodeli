import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

// GET - Détails complets d'une livraison pour un client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer la livraison avec toutes les relations nécessaires
    const delivery = await prisma.delivery.findFirst({
      where: {
        id,
        announcement: {
          authorId: user.id, // Vérifier que l'utilisateur est bien le client
        },
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
        deliverer: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        ProofOfDelivery: {
          select: {
            id: true,
            photos: true,
            notes: true,
            recipientName: true,
            validatedWithCode: true,
            validatedWithNFC: true,
            createdAt: true,
          },
        },
        tracking: {
          orderBy: {
            timestamp: "desc",
          },
          take: 10, // Limiter aux 10 dernières mises à jour
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 },
      );
    }

    // Créer l'historique des événements
    const history = [];

    // Ajout automatique des événements de base selon le statut
    history.push({
      status: "PENDING",
      timestamp: delivery.createdAt.toISOString(),
      message: "Demande de livraison créée",
      location: null,
    });

    if (
      ["ACCEPTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(
        delivery.status,
      )
    ) {
      history.push({
        status: "ACCEPTED",
        timestamp: new Date(
          delivery.createdAt.getTime() + 30 * 60 * 1000,
        ).toISOString(), // +30 min
        message: "Livraison acceptée par un livreur",
        location: null,
      });
    }

    if (["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
      history.push({
        status: "PICKED_UP",
        timestamp: new Date(
          delivery.createdAt.getTime() + 60 * 60 * 1000,
        ).toISOString(), // +1h
        message: "Colis récupéré",
        location: delivery.announcement.pickupAddress,
      });
    }

    if (["IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
      history.push({
        status: "IN_TRANSIT",
        timestamp: new Date(
          delivery.createdAt.getTime() + 90 * 60 * 1000,
        ).toISOString(), // +1h30
        message: "Colis en cours de livraison",
        location: "En route vers la destination",
      });
    }

    if (delivery.status === "DELIVERED") {
      history.push({
        status: "DELIVERED",
        timestamp:
          delivery.actualDeliveryDate?.toISOString() ||
          new Date().toISOString(),
        message: "Colis livré avec succès",
        location: delivery.announcement.deliveryAddress,
      });
    }

    // Ajouter les mises à jour de tracking s'il y en a
    delivery.tracking.forEach((update) => {
      history.push({
        status: update.status,
        timestamp: update.timestamp.toISOString(),
        message: update.message,
        location: update.location,
      });
    });

    // Trier par timestamp décroissant (plus récent en premier)
    history.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Formater les détails de la livraison
    const deliveryDetails = {
      id: delivery.id,
      announcementId: delivery.announcementId,
      announcementTitle: delivery.announcement.title,
      status: delivery.status,
      delivererName: delivery.deliverer?.profile
        ? `${delivery.deliverer.profile.firstName} ${delivery.deliverer.profile.lastName}`
        : null,
      delivererPhone: delivery.deliverer?.profile?.phone || null,
      delivererEmail: delivery.deliverer?.email || null,
      delivererAvatar: delivery.deliverer?.profile?.avatar || null,
      pickupAddress: delivery.announcement.pickupAddress,
      deliveryAddress: delivery.announcement.deliveryAddress,
      scheduledDate:
        delivery.deliveryDate?.toISOString() ||
        delivery.pickupDate?.toISOString() ||
        null,
      price: Number(delivery.price),
      validationCode: delivery.validationCode,
      trackingNumber: delivery.trackingNumber,
      estimatedDelivery: delivery.deliveryDate?.toISOString() || null,
      actualDelivery: delivery.actualDeliveryDate?.toISOString() || null,
      instructions: delivery.announcement.instructions || null,
      packageDetails: {
        description: delivery.announcement.description,
        weight: delivery.announcement.weight
          ? Number(delivery.announcement.weight)
          : null,
        dimensions: delivery.announcement.dimensions || null,
        fragile: delivery.announcement.isFragile || false,
      },
      proofOfDelivery: delivery.ProofOfDelivery
        ? {
            id: delivery.ProofOfDelivery.id,
            photos: delivery.ProofOfDelivery.photos || [],
            notes: delivery.ProofOfDelivery.notes,
            recipientName: delivery.ProofOfDelivery.recipientName,
            validatedWithCode: delivery.ProofOfDelivery.validatedWithCode,
            validatedWithNFC: delivery.ProofOfDelivery.validatedWithNFC,
            uploadedAt:
              delivery.ProofOfDelivery.createdAt?.toISOString() || null,
          }
        : null,
      createdAt: delivery.createdAt.toISOString(),
      history,
    };

    return NextResponse.json(deliveryDetails);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des détails de livraison:",
      error,
    );
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
