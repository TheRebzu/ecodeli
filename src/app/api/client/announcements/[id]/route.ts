import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema de validation pour modification d'annonce
const updateAnnouncementSchema = z.object({
  title: z
    .string()
    .min(5, "Le titre doit faire au moins 5 caractères")
    .optional(),
  description: z
    .string()
    .min(20, "La description doit faire au moins 20 caractères")
    .optional(),
  pickupAddress: z
    .string()
    .min(10, "Adresse de récupération requise")
    .optional(),
  deliveryAddress: z
    .string()
    .min(10, "Adresse de livraison requise")
    .optional(),
  basePrice: z.number().positive("Le prix doit être positif").optional(),
  isUrgent: z.boolean().optional(),
  isFlexibleDate: z.boolean().optional(),
  specialInstructions: z.string().optional(),
  type: z
    .enum([
      "PACKAGE_DELIVERY",
      "PERSON_TRANSPORT",
      "AIRPORT_TRANSFER",
      "SHOPPING",
      "INTERNATIONAL_PURCHASE",
      "PET_SITTING",
      "HOME_SERVICE",
      "CART_DROP",
    ])
    .optional(),
  status: z
    .enum([
      "DRAFT",
      "ACTIVE",
      "MATCHED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
});

// GET - Détails d'une annonce spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireRole(request, ["CLIENT"]);

    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        authorId: user.id,
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
            tracking: {
              orderBy: { timestamp: "desc" },
              take: 10,
            },
          },
        },
        matches: {
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
            deliverer: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: { globalScore: "desc" },
          take: 10,
        },
        reviews: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce non trouvée" },
        { status: 404 },
      );
    }

    // Transformer les données pour correspondre au format attendu par le frontend
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
      viewCount: announcement.viewCount || 0,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      publishedAt: announcement.publishedAt,
      desiredDate: announcement.pickupDate || announcement.createdAt,

      // Informations auteur (CORRECTION: inclure l'auteur principal)
      author: announcement.author
        ? {
            id: announcement.author.id,
            email: announcement.author.email,
            profile: announcement.author.profile,
          }
        : null,

      // Transformation des adresses au format attendu
      startLocation: {
        address: announcement.pickupAddress,
        city: announcement.pickupAddress?.split(",")[1]?.trim() || "",
        postalCode: "",
        country: "FR",
        lat: announcement.pickupLatitude,
        lng: announcement.pickupLongitude,
      },
      endLocation: {
        address: announcement.deliveryAddress,
        city: announcement.deliveryAddress?.split(",")[1]?.trim() || "",
        postalCode: "",
        country: "FR",
        lat: announcement.deliveryLatitude,
        lng: announcement.deliveryLongitude,
      },

      // Détails du client/merchant
      client: announcement.Client
        ? {
            id: announcement.Client.userId,
            profile: announcement.Client.user.profile,
          }
        : null,

      merchant: announcement.Merchant
        ? {
            id: announcement.Merchant.userId,
            profile: {
              firstName: announcement.Merchant.user.profile?.firstName,
              lastName: announcement.Merchant.user.profile?.lastName,
              businessName: announcement.Merchant.companyName,
              avatar: announcement.Merchant.user.profile?.avatar,
            },
          }
        : null,

      // Détails du colis si applicable
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

      // Détails du service si applicable
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

      // Informations de livraison
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

      // Correspondances de trajets
      routeMatches: announcement.matches.map((match) => ({
        id: match.id,
        routeId: match.routeId,
        announcementId: match.announcementId,
        matchScore: Math.round(match.globalScore),
        isNotified: !!match.notifiedAt,
        notifiedAt: match.notifiedAt,
        createdAt: match.createdAt,
        route: match.route
          ? {
              id: match.route.id,
              delivererId: match.route.delivererId,
              startLocation: {
                address: match.route.startAddress,
                lat: match.route.startLatitude,
                lng: match.route.startLongitude,
              },
              endLocation: {
                address: match.route.endAddress,
                lat: match.route.endLatitude,
                lng: match.route.endLongitude,
              },
              departureTime: match.route.startDate,
              deliverer: match.route.deliverer
                ? {
                    id: match.route.deliverer.id,
                    profile: match.route.deliverer.profile,
                  }
                : null,
            }
          : null,
      })),

      // Évaluations
      reviews: announcement.reviews,

      // Pièces jointes
      attachments: announcement.attachments,
    };

    return NextResponse.json(transformedAnnouncement);
  } catch (error) {
    console.error("Erreur récupération annonce:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 },
    );
  }
}

// PUT - Modifier une annonce
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireRole(request, ["CLIENT"]);

    // Vérifier que l'annonce existe et appartient au client
    const existingAnnouncement = await prisma.announcement.findFirst({
      where: {
        id,
        authorId: user.id,
      },
      include: {
        delivery: true,
      },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "Annonce non trouvée" },
        { status: 404 },
      );
    }

    // Vérifier qu'on peut modifier (pas de livraison en cours)
    if (
      existingAnnouncement.delivery &&
      ["ACCEPTED", "IN_TRANSIT"].includes(existingAnnouncement.delivery.status)
    ) {
      return NextResponse.json(
        { error: "Impossible de modifier une annonce avec livraison en cours" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Transformer les données du frontend vers le format Prisma
    const transformedData = {
      title: body.title,
      description: body.description,
      type: body.type,
      pickupAddress: body.startLocation?.address || body.pickupAddress,
      deliveryAddress: body.endLocation?.address || body.deliveryAddress,
      basePrice: body.price || body.basePrice,
      isUrgent: body.urgent !== undefined ? body.urgent : body.isUrgent,
      isFlexibleDate:
        body.flexibleDates !== undefined
          ? body.flexibleDates
          : body.isFlexibleDate,
      specialInstructions: body.specialInstructions,
      status: body.status,
    };

    const validatedData = updateAnnouncementSchema.parse(transformedData);

    // Mettre à jour l'annonce
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedAnnouncement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erreur modification annonce:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 },
    );
  }
}

// DELETE - Supprimer une annonce
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireRole(request, ["CLIENT"]);

    // Vérifier que l'annonce existe et appartient au client
    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        authorId: user.id,
      },
      include: {
        delivery: true,
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce non trouvée" },
        { status: 404 },
      );
    }

    // Vérifier qu'on peut supprimer (pas de livraison en cours)
    if (
      announcement.delivery &&
      ["ACCEPTED", "IN_TRANSIT"].includes(announcement.delivery.status)
    ) {
      return NextResponse.json(
        {
          error: "Impossible de supprimer une annonce avec livraison en cours",
        },
        { status: 400 },
      );
    }

    // Supprimer l'annonce et toutes ses relations
    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Annonce supprimée avec succès" });
  } catch (error) {
    console.error("Erreur suppression annonce:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 },
    );
  }
}
