import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PromotionSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BUY_X_GET_Y"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().min(1).optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  targetAudience: z.enum([
    "ALL",
    "NEW_CUSTOMERS",
    "RETURNING_CUSTOMERS",
    "VIP",
  ]),
  applicableProducts: z.array(z.string()).optional(),
  excludedProducts: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

// GET - Récupérer les promotions merchant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Construire les filtres
    const where: any = {
      merchantId: session.user.id,
    };

    if (status && status !== "all") {
      if (status === "active") {
        where.isActive = true;
        where.startDate = { lte: new Date() };
        where.endDate = { gte: new Date() };
      } else if (status === "upcoming") {
        where.isActive = true;
        where.startDate = { gt: new Date() };
      } else if (status === "expired") {
        where.OR = [{ isActive: false }, { endDate: { lt: new Date() } }];
      }
    }

    if (type && type !== "all") {
      where.type = type;
    }

    // Récupérer les promotions avec pagination
    const [promotions, total] = await Promise.all([
      prisma.merchantPromotion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          merchant: {
            select: {
              businessName: true,
            },
          },
          usageHistory: {
            select: {
              id: true,
              usedAt: true,
              orderId: true,
            },
          },
        },
      }),
      prisma.merchantPromotion.count({ where }),
    ]);

    // Calculer les statistiques d'usage pour chaque promotion
    const promotionsWithStats = promotions.map((promotion) => ({
      ...promotion,
      usageCount: promotion.usageHistory.length,
      stats: {
        totalUsage: promotion.usageHistory.length,
        totalRevenue: 0, // À calculer selon la logique métier
        conversionRate: 0,
        averageOrderValue: 0,
      },
    }));

    return NextResponse.json({
      promotions: promotionsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des promotions:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// POST - Créer une nouvelle promotion
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = PromotionSchema.parse(body);

    // Vérifier que le merchant existe
    const merchantProfile = await prisma.merchantProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!merchantProfile) {
      return NextResponse.json(
        { error: "Profil merchant non trouvé" },
        { status: 404 },
      );
    }

    // Vérifications de validation métier
    if (validatedData.endDate <= validatedData.startDate) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début" },
        { status: 400 },
      );
    }

    if (validatedData.type === "PERCENTAGE" && validatedData.value > 100) {
      return NextResponse.json(
        { error: "Le pourcentage ne peut pas dépasser 100%" },
        { status: 400 },
      );
    }

    // Générer un code unique pour la promotion
    const promotionCode = `PROMO${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    // Créer la promotion
    const promotion = await prisma.merchantPromotion.create({
      data: {
        merchantId: merchantProfile.id,
        title: validatedData.title,
        description: validatedData.description,
        code: promotionCode,
        type: validatedData.type,
        value: validatedData.value,
        minOrderAmount: validatedData.minOrderAmount,
        maxDiscount: validatedData.maxDiscount,
        usageLimit: validatedData.usageLimit,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        targetAudience: validatedData.targetAudience,
        applicableProducts: validatedData.applicableProducts || [],
        excludedProducts: validatedData.excludedProducts || [],
        isActive: validatedData.isActive,
        usageCount: 0,
      },
      include: {
        merchant: {
          select: {
            businessName: true,
          },
        },
      },
    });

    // Créer une notification pour informer de la nouvelle promotion
    await prisma.notification.create({
      data: {
        type: "PROMOTION_CREATED",
        title: "Nouvelle promotion créée",
        message: `La promotion "${validatedData.title}" a été créée avec succès`,
        data: {
          promotionId: promotion.id,
          promotionCode: promotionCode,
          merchantId: merchantProfile.id,
        },
        priority: "LOW",
      },
    });

    return NextResponse.json(
      {
        message: "Promotion créée avec succès",
        promotion: {
          ...promotion,
          usageCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erreur lors de la création de la promotion:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
