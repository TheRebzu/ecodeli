import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema pour création d'annonce commerçant
const createMerchantAnnouncementSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  type: z.enum([
    "CART_DROP",
    "BULK_DELIVERY",
    "SCHEDULED_PICKUP",
    "RETURN_SERVICE",
  ]),
  pickupAddress: z.string().min(1, "L'adresse d'enlèvement est requise"),
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  deliveryAddress: z.string().min(1, "L'adresse de livraison est requise"),
  deliveryLatitude: z.number(),
  deliveryLongitude: z.number(),
  basePrice: z.number().min(0),
  isUrgent: z.boolean().default(false),
  pickupDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  specialInstructions: z.string().optional(),

  // Spécifique aux commerçants
  customerInfo: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
  }),
  orderReference: z.string().optional(),
  packageCount: z.number().min(1).default(1),
  totalWeight: z.number().min(0).optional(),
  dimensions: z
    .object({
      length: z.number().min(0),
      width: z.number().min(0),
      height: z.number().min(0),
    })
    .optional(),
  fragile: z.boolean().default(false),
  insuredValue: z.number().min(0).optional(),
});

// Schema pour filtres
const announcementsFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["createdAt", "pickupDate", "basePrice"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createAnnouncementSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  type: z.enum([
    "PACKAGE_DELIVERY",
    "PERSON_TRANSPORT",
    "AIRPORT_TRANSFER",
    "SHOPPING",
    "INTERNATIONAL_PURCHASE",
    "PET_SITTING",
    "HOME_SERVICE",
    "CART_DROP",
  ]),
  basePrice: z.number().min(0),
  pickupAddress: z.string().min(10).max(500),
  deliveryAddress: z.string().min(10).max(500),
  weight: z.number().min(0.1).optional(),
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  pickupDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  specialInstructions: z.string().optional(),
});

const querySchema = z.object({
  page: z
    .string()
    .nullable()
    .transform((val) => (val ? Number(val) : 1)),
  limit: z
    .string()
    .nullable()
    .transform((val) => (val ? Number(val) : 20)),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  sortBy: z
    .enum(["createdAt", "basePrice", "title", "pickupDate"])
    .nullable()
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).nullable().optional(),
  search: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    console.log("🏪 [GET /api/merchant/announcements] Début de la requête");

    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      type: searchParams.get("type"),
      status: searchParams.get("status"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      search: searchParams.get("search"),
    });

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Construire les filtres
    const where: any = {
      authorId: user.id,
      author: {
        role: "MERCHANT",
      },
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { pickupAddress: { contains: query.search, mode: "insensitive" } },
        { deliveryAddress: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Ordre de tri
    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    // Récupérer les annonces avec pagination
    const [announcements, totalCount] = await Promise.all([
      db.announcement.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          delivery: {
            include: {
              deliverer: {
                select: {
                  id: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              payment: {
                select: {
                  status: true,
                  amount: true,
                },
              },
            },
          },
        },
      }),
      db.announcement.count({ where }),
    ]);

    // Calculer les statistiques par type
    const typeStats = await db.announcement.groupBy({
      by: ["type"],
      where: { authorId: user.id },
      _count: { type: true },
      _avg: { basePrice: true },
    });

    // Statistiques globales
    const stats = {
      total: totalCount,
      active: await db.announcement.count({
        where: { ...where, status: "ACTIVE" },
      }),
      completed: await db.announcement.count({
        where: { ...where, status: "COMPLETED" },
      }),
      cancelled: await db.announcement.count({
        where: { ...where, status: "CANCELLED" },
      }),
      avgPrice:
        announcements.length > 0
          ? announcements.reduce((sum, ann) => sum + ann.basePrice, 0) /
            announcements.length
          : 0,
      typeBreakdown: typeStats.reduce(
        (acc, stat) => {
          acc[stat.type] = {
            count: stat._count.type,
            avgPrice: stat._avg.basePrice || 0,
          };
          return acc;
        },
        {} as Record<string, any>,
      ),
    };

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      announcements: announcements.map((ann) => ({
        id: ann.id,
        title: ann.title,
        description: ann.description,
        type: ann.type,
        status: ann.status,
        basePrice: ann.basePrice,
        finalPrice: ann.finalPrice,
        pickupAddress: ann.pickupAddress,
        deliveryAddress: ann.deliveryAddress,
        weight: ann.weight,
        isUrgent: ann.isUrgent,
        requiresInsurance: ann.requiresInsurance,
        pickupDate: ann.pickupDate,
        deliveryDate: ann.deliveryDate,
        specialInstructions: ann.specialInstructions,
        createdAt: ann.createdAt,
        updatedAt: ann.updatedAt,
        hasDelivery: !!ann.delivery,
        delivery: ann.delivery
          ? {
              id: ann.delivery.id,
              status: ann.delivery.status,
              deliverer: ann.delivery.deliverer
                ? {
                    name: `${ann.delivery.deliverer.profile?.firstName || ""} ${ann.delivery.deliverer.profile?.lastName || ""}`.trim(),
                  }
                : null,
              payment: ann.delivery.payment
                ? {
                    status: ann.delivery.payment.status,
                    amount: ann.delivery.payment.amount,
                  }
                : null,
              pickupDate: ann.delivery.pickupDate,
              deliveryDate: ann.delivery.deliveryDate,
              actualDeliveryDate: ann.delivery.actualDeliveryDate,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats,
    });
  } catch (error) {
    console.error("❌ Erreur récupération annonces commerçant:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres de requête invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🏪 [POST /api/merchant/announcements] Création annonce");

    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que le commerçant existe et est validé
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        contract: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Profil commerçant non trouvé" },
        { status: 404 },
      );
    }

    if (merchant.contractStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Votre contrat commerçant doit être actif avant de pouvoir créer des annonces",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const announcementData = createAnnouncementSchema.parse(body);

    // Vérifier les limites du contrat (simplifiées pour l'instant)
    if (merchant.contract && merchant.contract.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Votre contrat doit être actif pour créer des annonces",
        },
        { status: 403 },
      );
    }

    // TODO: Ajouter d'autres vérifications de contrat si nécessaire

    // Créer l'annonce
    const announcement = await db.announcement.create({
      data: {
        ...announcementData,
        authorId: user.id,
        status: "ACTIVE",
        finalPrice: announcementData.basePrice,
      },
      include: {
        author: {
          include: {
            merchant: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });

    // Déclencher le matching avec les livreurs (si applicable)
    if (
      announcementData.type === "PACKAGE_DELIVERY" &&
      (!announcementData.availableFrom ||
        new Date(announcementData.availableFrom) <= new Date())
    ) {
      try {
        // TODO: Appeler le service de matching
        // await matchingService.triggerMatching(announcement.id)

        console.log(`🔍 Matching déclenché pour l'annonce ${announcement.id}`);
      } catch (matchingError) {
        console.error("Error triggering matching:", matchingError);
        // Ne pas faire échouer la création pour un problème de matching
      }
    }

    // Notification de succès
    await db.notification.create({
      data: {
        userId: user.id,
        type: "ANNOUNCEMENT",
        title: "Annonce créée avec succès",
        message: `Votre annonce "${announcement.title}" a été publiée`,
        priority: "MEDIUM",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Annonce créée avec succès",
        announcement: {
          id: announcement.id,
          title: announcement.title,
          type: announcement.type,
          status: announcement.status,
          basePrice: announcement.basePrice,
          createdAt: announcement.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Erreur création annonce commerçant:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données d'annonce invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
