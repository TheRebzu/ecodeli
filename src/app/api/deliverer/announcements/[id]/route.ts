import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

// GET - Détails d'une annonce pour un livreur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireRole(request, ["DELIVERER"]);

    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        status: {
          in: ["ACTIVE", "MATCHED", "IN_PROGRESS"],
        },
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        Client: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        Merchant: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        PackageAnnouncement: true,
        ServiceAnnouncement: true,
        delivery: {
          include: {
            deliverer: {
              include: {
                profile: true,
              },
            },
          },
        },
        matches: {
          where: {
            delivererId: user.id,
          },
          include: {
            route: {
              include: {
                deliverer: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce non trouvée ou non accessible" },
        { status: 404 },
      );
    }

    // Transformer les données pour le frontend
    const transformedAnnouncement = {
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      status: announcement.status,
      price: announcement.basePrice,
      currency: announcement.currency,
      urgent: announcement.isUrgent,
      flexibleDates: announcement.isFlexibleDate,
      specialInstructions: announcement.specialInstructions,
      viewCount: announcement.viewCount,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      publishedAt: announcement.publishedAt,
      desiredDate: announcement.pickupDate || announcement.createdAt,

      // Adresses transformées
      startLocation: {
        address: announcement.pickupAddress,
        city: announcement.pickupAddress?.split(",")[1]?.trim() || "",
        postalCode: announcement.pickupAddress?.split(",")[2]?.trim() || "",
        country: "FR",
        lat: announcement.pickupLatitude,
        lng: announcement.pickupLongitude,
      },
      endLocation: {
        address: announcement.deliveryAddress,
        city: announcement.deliveryAddress?.split(",")[1]?.trim() || "",
        postalCode: announcement.deliveryAddress?.split(",")[2]?.trim() || "",
        country: "FR",
        lat: announcement.deliveryLatitude,
        lng: announcement.deliveryLongitude,
      },

      // Informations client
      client: announcement.Client
        ? {
            id: announcement.Client.userId,
            profile: announcement.Client.user.profile,
            createdAt: announcement.Client.user.createdAt,
          }
        : null,

      // Informations merchant
      merchant: announcement.Merchant
        ? {
            id: announcement.Merchant.userId,
            companyName: announcement.Merchant.companyName,
            profile: announcement.Merchant.user.profile,
          }
        : null,

      // Détails du colis
      packageDetails: announcement.PackageAnnouncement
        ? {
            weight: announcement.PackageAnnouncement.weight,
            length: announcement.PackageAnnouncement.length,
            width: announcement.PackageAnnouncement.width,
            height: announcement.PackageAnnouncement.height,
            fragile: announcement.PackageAnnouncement.fragile,
            requiresInsurance:
              announcement.PackageAnnouncement.requiresInsurance,
            insuredValue: announcement.PackageAnnouncement.insuredValue,
            content:
              announcement.PackageAnnouncement.specialInstructions ||
              "Contenu non spécifié",
          }
        : null,

      // Détails du service
      serviceDetails: announcement.ServiceAnnouncement
        ? {
            serviceType: announcement.ServiceAnnouncement.serviceType,
            numberOfPeople: announcement.ServiceAnnouncement.numberOfPeople,
            duration: announcement.ServiceAnnouncement.duration,
            recurringService: announcement.ServiceAnnouncement.recurringService,
            recurringPattern: announcement.ServiceAnnouncement.recurringPattern,
            specialRequirements:
              announcement.ServiceAnnouncement.specialRequirements,
          }
        : null,

      // Informations de livraison existante
      delivery: announcement.delivery
        ? {
            id: announcement.delivery.id,
            status: announcement.delivery.status,
            trackingNumber: announcement.delivery.trackingNumber,
            deliverer: announcement.delivery.deliverer
              ? {
                  id: announcement.delivery.deliverer.id,
                  profile: announcement.delivery.deliverer.profile,
                }
              : null,
          }
        : null,

      // Correspondances pour ce livreur
      myMatches: announcement.matches,
    };

    return NextResponse.json(transformedAnnouncement);
  } catch (error) {
    console.error("Erreur récupération annonce deliverer:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 },
    );
  }
}
