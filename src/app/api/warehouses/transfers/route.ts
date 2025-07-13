import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { warehouseManagementService } from "@/features/warehouses/services/warehouse-management.service";
import { z } from "zod";

const createTransferSchema = z.object({
  announcementId: z.string(),
  toWarehouseId: z.string(),
  transferType: z.enum(["INCOMING", "OUTGOING", "INTER_WAREHOUSE", "STORAGE"]),
  estimatedArrival: z
    .string()
    .datetime()
    .transform((str) => new Date(str)),
  notes: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

const transferQuerySchema = z.object({
  status: z
    .enum(["PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED"])
    .optional(),
  warehouseId: z.string().optional(),
  announcementId: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20)),
});

/**
 * GET /api/warehouses/transfers
 * Récupérer les transferts d'entrepôt (filtrage par rôle)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = transferQuerySchema.parse(Object.fromEntries(searchParams));

    // Construire les filtres selon le rôle
    const whereClause: any = {};

    if (query.status) whereClause.status = query.status;
    if (query.warehouseId) whereClause.toWarehouseId = query.warehouseId;
    if (query.announcementId) whereClause.announcementId = query.announcementId;

    // Restriction selon le rôle utilisateur
    if (session.user.role === "CLIENT" || session.user.role === "MERCHANT") {
      // Les clients/commerçants ne voient que leurs propres transferts
      whereClause.announcement = {
        authorId: session.user.id,
      };
    } else if (session.user.role === "DELIVERER") {
      // Les livreurs voient les transferts de leurs livraisons
      whereClause.announcement = {
        delivererId: session.user.id,
      };
    }
    // Les admins voient tout

    const transfers = await db.warehouseTransfer.findMany({
      where: whereClause,
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            type: true,
            pickupAddress: true,
            deliveryAddress: true,
            author: {
              select: {
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        toWarehouse: {
          select: { id: true, name: true, address: true, city: true },
        },
        fromWarehouse: {
          select: { id: true, name: true, address: true, city: true },
        },
        packageLocation: {
          select: {
            zone: true,
            shelf: true,
            position: true,
            status: true,
            arrivalDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Compter le total pour la pagination
    const total = await db.warehouseTransfer.count({ where: whereClause });

    return NextResponse.json({
      transfers,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page < Math.ceil(total / query.limit),
        hasPrev: query.page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching warehouse transfers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/warehouses/transfers
 * Créer un nouveau transfert vers entrepôt
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTransferSchema.parse(body);

    // Vérifier que l'utilisateur a accès à cette annonce
    const announcement = await db.announcement.findUnique({
      where: { id: validatedData.announcementId },
      include: { author: true },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce introuvable" },
        { status: 404 },
      );
    }

    // Vérification des permissions
    const hasAccess =
      session.user.role === "ADMIN" ||
      announcement.authorId === session.user.id ||
      announcement.delivererId === session.user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Créer le transfert
    const transfer =
      await warehouseManagementService.createWarehouseTransfer(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: transfer,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating warehouse transfer:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
