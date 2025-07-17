import { NextRequest, NextResponse } from "next/server";
import {
  createAnnouncementSchema,
  searchAnnouncementsSchema,
} from "@/features/announcements/schemas/announcement.schema";
import { requireRole } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "🔍 [GET /api/client/announcements] Début de la requête - TRANSPORT D'OBJETS UNIQUEMENT",
    );

    const user = await requireRole(request, ["CLIENT"]);

    console.log("✅ Utilisateur authentifié:", user.id, user.role);

    const { searchParams } = new URL(request.url);

    // Validation des paramètres avec le schema
    const params = searchAnnouncementsSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      type: searchParams.get("type"),
      deliveryType: searchParams.get("deliveryType"),
      priceMin: searchParams.get("priceMin"),
      priceMax: searchParams.get("priceMax"),
      city: searchParams.get("city"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      urgent: searchParams.get("urgent"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    console.log("📝 Paramètres de recherche:", params);

    // Construire la clause WHERE pour ANNONCES UNIQUEMENT
    const where: any = { authorId: user.id };

    if (params.status) where.status = (await params).status;
    if (params.type) where.type = (await params).type;
    if (params.urgent !== undefined) where.isUrgent = (await params).urgent;
    if (params.city) {
      where.OR = [
        { pickupAddress: { contains: (await params).city, mode: "insensitive" } },
        { deliveryAddress: { contains: (await params).city, mode: "insensitive" } },
      ];
    }

    // Filtres de prix
    if (params.priceMin || (await params).priceMax) {
      where.basePrice = {};
      if (params.priceMin) where.basePrice.gte = (await params).priceMin;
      if (params.priceMax) where.basePrice.lte = (await params).priceMax;
    }

    // Filtres de date
    if (params.dateFrom || (await params).dateTo) {
      where.pickupDate = {};
      if (params.dateFrom) where.pickupDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.pickupDate.lte = new Date(params.dateTo);
    }

    // Construire l'ordre de tri
    const orderBy: any = {};
    if (params.sortBy === "pickupDate") {
      orderBy.pickupDate = (await params).sortOrder;
    } else if (params.sortBy === "basePrice") {
      orderBy.basePrice = (await params).sortOrder;
    } else if (params.sortBy === "distance") {
      orderBy.distance = (await params).sortOrder;
    } else {
      orderBy.createdAt = (await params).sortOrder;
    }

    try {
      console.log(
        "🔍 Requête base de données avec filtres pour transport d'objets...",
      );

      const [announcements, total] = await Promise.all([
        db.announcement.findMany({
          where,
          include: {
            author: {
              include: {
                profile: {
                  select: { firstName: true, lastName: true, avatar: true },
                },
              },
            },
            attachments: {
              select: {
                id: true,
                url: true,
                filename: true,
                mimeType: true,
                size: true,
              },
            },
            PackageAnnouncement: {
              select: {
                weight: true,
                length: true,
                width: true,
                height: true,
                fragile: true,
                insuredValue: true,
                specialInstructions: true,
              },
            },
            // deliveries: { // Désactivé temporairement car non reconnu par Prisma. Si besoin, régénérez le client Prisma.
            //   select: {
            //     id: true,
            //     status: true,
            //     trackingNumber: true,
            //     deliverer: {
            //       select: {
            //         id: true,
            //         email: true,
            //         profile: {
            //           select: {
            //             firstName: true,
            //             lastName: true,
            //             avatar: true,
            //           },
            //         },
            //       },
            //     },
            //   },
            // },
            _count: {
              select: {
                matches: true,
                reviews: true,
                attachments: true,
                tracking: true,
              },
            },
          },
          orderBy,
          skip: (params.page - 1) * (await params).limit,
          take: (await params).limit,
        }),
        db.announcement.count({ where }),
      ]);

      console.log(
        `✅ Trouvé ${announcements.length} annonces de transport sur ${total} total`,
      );

      const result = {
        announcements: announcements.map((announcement) => ({
          id: announcement.id,
          title: announcement.title,
          description: announcement.description,
          type: announcement.type,
          status: announcement.status,
          basePrice: Number(announcement.basePrice),
          finalPrice: Number(announcement.finalPrice || announcement.basePrice),
          currency: announcement.currency,
          isPriceNegotiable: announcement.isPriceNegotiable,

          // Adresses de transport
          pickupAddress: announcement.pickupAddress,
          deliveryAddress: announcement.deliveryAddress,
          pickupLatitude: announcement.pickupLatitude,
          pickupLongitude: announcement.pickupLongitude,
          deliveryLatitude: announcement.deliveryLatitude,
          deliveryLongitude: announcement.deliveryLongitude,
          distance: announcement.distance,

          // Dates de livraison
          pickupDate: announcement.pickupDate?.toISOString(),
          deliveryDate: announcement.deliveryDate?.toISOString(),
          isFlexibleDate: announcement.isFlexibleDate,

          // Métadonnées
          isUrgent: announcement.isUrgent,
          requiresInsurance: announcement.requiresInsurance,
          allowsPartialDelivery: announcement.allowsPartialDelivery,
          viewCount: announcement.viewCount,
          matchCount: announcement.matchCount,
          estimatedDuration: announcement.estimatedDuration,
          specialInstructions: announcement.specialInstructions,
          customerNotes: announcement.customerNotes,

          // Relations
          packageDetails: announcement.PackageAnnouncement,
          _count: announcement._count,
          delivery: announcement.delivery || null,

          // Timestamps
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
          publishedAt: announcement.publishedAt?.toISOString(),
          expiresAt: announcement.expiresAt?.toISOString(),

          author: {
            id: announcement.author.id,
            name: announcement.author.profile
              ? `${announcement.author.profile.firstName || ""} ${announcement.author.profile.lastName || ""}`.trim()
              : announcement.author.email,
            avatar: announcement.author.profile?.avatar,
          },
        })),
        pagination: {
          page: (await params).page,
          limit: (await params).limit,
          total,
          totalPages: Math.ceil(total / (await params).limit),
          hasNext: (await params).page < Math.ceil(total / (await params).limit),
          hasPrev: (await params).page > 1,
        },
        stats: {
          totalValue: announcements.reduce(
            (sum, a) => sum + Number(a.basePrice),
            0,
          ),
          averagePrice:
            total > 0
              ? announcements.reduce((sum, a) => sum + Number(a.basePrice), 0) /
                total
              : 0,
          byStatus: await db.announcement.groupBy({
            by: ["status"],
            where: { authorId: user.id },
            _count: { status: true },
          }),
          byType: await db.announcement.groupBy({
            by: ["type"],
            where: { authorId: user.id },
            _count: { type: true },
          }),
        },
      };

      return NextResponse.json(result);
    } catch (dbError: any) {
      console.error("❌ Erreur base de données:", dbError);
      return NextResponse.json(
        {
          error: "Database error",
          details: dbError?.message || "Unknown database error",
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("❌ Erreur générale GET announcements:", error);

    // Si c'est une erreur d'authentification, retourner 403
    if (error?.message?.includes("Accès refusé")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔍 [POST /api/client/announcements] Création d'annonce - TRANSPORT D'OBJETS UNIQUEMENT",
    );

    const user = await requireRole(request, ["CLIENT"]);

    console.log("✅ Utilisateur authentifié:", user.id, user.role);

    const body = await request.json();
    console.log("📝 Données reçues:", body);

    try {
      const validatedData = createAnnouncementSchema.parse(body);
      console.log("✅ Données validées avec succès");

      console.log("🔍 Création de l'annonce de transport en base...");

      // Préparer les données selon le type d'annonce
      const announcementData: any = {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        basePrice: validatedData.basePrice,
        currency: validatedData.currency,
        isPriceNegotiable: validatedData.isPriceNegotiable,
        authorId: user.id,

        // Adresses obligatoires
        pickupAddress: validatedData.pickupAddress,
        deliveryAddress: validatedData.deliveryAddress,
        pickupLatitude: validatedData.pickupLatitude,
        pickupLongitude: validatedData.pickupLongitude,
        deliveryLatitude: validatedData.deliveryLatitude,
        deliveryLongitude: validatedData.deliveryLongitude,

        // Dates
        pickupDate: new Date(validatedData.pickupDate),
        deliveryDate: validatedData.deliveryDate
          ? new Date(validatedData.deliveryDate)
          : null,
        isFlexibleDate: validatedData.isFlexibleDate,

        // Options
        isUrgent: validatedData.isUrgent,
        requiresInsurance: validatedData.requiresInsurance,
        allowsPartialDelivery: validatedData.allowsPartialDelivery,

        // Instructions
        specialInstructions: validatedData.specialInstructions,
        customerNotes: validatedData.customerNotes,

        status: "ACTIVE",
        publishedAt: new Date(),

        // Stocker les détails spécifiques selon le type
        packageDetails: validatedData.packageDetails || null,
        shoppingDetails:
          validatedData.shoppingDetails ||
          validatedData.internationalPurchaseDetails ||
          validatedData.cartDropDetails ||
          null,
      };

      const announcement = await db.announcement.create({
        data: announcementData,
        include: {
          author: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
          },
          PackageAnnouncement: {
            select: {
              weight: true,
              length: true,
              width: true,
              height: true,
              fragile: true,
              insuredValue: true,
            },
          },
        },
      });

      console.log(
        "✅ Annonce de transport créée avec succès:",
        announcement.id,
      );

      const result = {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          description: announcement.description,
          type: announcement.type,
          status: announcement.status,
          basePrice: Number(announcement.basePrice),
          currency: announcement.currency,
          isPriceNegotiable: announcement.isPriceNegotiable,
          pickupAddress: announcement.pickupAddress,
          deliveryAddress: announcement.deliveryAddress,
          pickupDate: announcement.pickupDate?.toISOString(),
          deliveryDate: announcement.deliveryDate?.toISOString(),
          isFlexibleDate: announcement.isFlexibleDate,
          isUrgent: announcement.isUrgent,
          requiresInsurance: announcement.requiresInsurance,
          allowsPartialDelivery: announcement.allowsPartialDelivery,
          packageDetails: announcement.PackageAnnouncement,
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
          author: {
            id: announcement.author.id,
            name: announcement.author.profile
              ? `${announcement.author.profile.firstName || ""} ${announcement.author.profile.lastName || ""}`.trim()
              : announcement.author.email,
            avatar: announcement.author.profile?.avatar,
          },
        },
      };

      return NextResponse.json(result, { status: 201 });
    } catch (validationError: any) {
      console.error("❌ Erreur validation/création:", validationError);
      return NextResponse.json(
        {
          error: "Validation or creation error",
          details: validationError?.message || "Validation failed",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("❌ Erreur générale POST announcements:", error);

    // Si c'est une erreur d'authentification, retourner 403
    if (error?.message?.includes("Accès refusé")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
