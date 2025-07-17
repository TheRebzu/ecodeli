import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

const opportunitiesFiltersSchema = z.object({
  page: z
    .string()
    .nullable()
    .transform((val) => (val ? parseInt(val) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .nullable()
    .transform((val) => (val ? parseInt(val) : 20))
    .pipe(z.number().min(1).max(50)),
  maxDistance: z
    .string()
    .nullable()
    .transform((val) => (val ? parseInt(val) : 50))
    .pipe(z.number().min(1).max(100)),
  minPrice: z
    .string()
    .nullable()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(0).optional()),
  maxPrice: z
    .string()
    .nullable()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(0).optional()),
  type: z.string().nullable().optional(),
  urgentOnly: z
    .string()
    .nullable()
    .transform((val) => val === "true")
    .pipe(z.boolean()),
  sortBy: z
    .string()
    .nullable()
    .transform((val) => val || "createdAt")
    .pipe(z.enum(["distance", "price", "createdAt"])),
  sortOrder: z
    .string()
    .nullable()
    .transform((val) => val || "desc")
    .pipe(z.enum(["asc", "desc"])),
});

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user || user.role !== "DELIVERER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || `${DEFAULT_PAGE}`);
    const limit = parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`);
    const type = searchParams.get("type");
    const minPrice = searchParams.get("minPrice")
      ? parseFloat(searchParams.get("minPrice")!)
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? parseFloat(searchParams.get("maxPrice")!)
      : undefined;
    const urgentOnly = searchParams.get("urgentOnly") === "true";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Préparer le filtre principal
    const where: any = {
      status: "ACTIVE",
      delivererId: null,
    };
    if (type) where.type = type;
    if (urgentOnly) where.isUrgent = true;
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = minPrice;
      if (maxPrice) where.basePrice.lte = maxPrice;
    }

    // Compter le total pour la pagination
    const total = await db.announcement.count({ where });

    // Récupérer les opportunités paginées
    const opportunities = await db.announcement.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, name: true, profile: true } },
      },
    });

    // Pour chaque opportunité, récupérer le statut de paiement
    const opportunitiesWithPayment = await Promise.all(
      opportunities.map(async (opportunity) => {
        const payment = await db.payment.findFirst({
          where: {
            announcementId: opportunity.id,
            type: "DELIVERY",
          },
          select: { status: true },
        });
        return {
          ...opportunity,
          payment: payment ? { status: payment.status } : null,
        };
      })
    );

    // (Optionnel) Matching géographique :
    // Si vous avez les coordonnées du livreur et des annonces, calculez la distance ici
    // const deliverer = await db.deliverer.findUnique({ where: { userId: user.id } })
    // const delivererCoords = deliverer?.coordinates
    // ...

    // Statistiques pour le front
    const urgentCount = await db.announcement.count({
      where: { ...where, isUrgent: true },
    });
    const averagePrice =
      total > 0
        ? (
            await db.announcement.aggregate({
              where,
              _avg: { basePrice: true },
            })
          )._avg.basePrice || 0
        : 0;

    return NextResponse.json({
      opportunities: opportunitiesWithPayment,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      stats: {
        totalOpportunities: total,
        urgentCount,
        averagePrice,
      },
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
