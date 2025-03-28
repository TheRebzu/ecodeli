import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  city: z.string().optional(),
  postalCode: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// GET: List all sites or filter by city/postal code
export async function GET(req: NextRequest) {
  try {
    // Authentication is not required for site listings
    // But we'll check session to provide personalized data if available
    const session = await getServerSession(authOptions);
    
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      city: searchParams.get("city"),
      postalCode: searchParams.get("postalCode"),
      isActive: searchParams.get("isActive"),
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { city, postalCode, isActive, page, limit } = validatedParams.data;
    const skip = (page - 1) * limit;

    // Build query
    const whereClause: {
      city?: string;
      postalCode?: string;
      isActive?: boolean;
    } = {};

    if (city) {
      whereClause.city = city;
    }

    if (postalCode) {
      whereClause.postalCode = postalCode;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    // Fetch warehouses
    const [warehouses, totalCount] = await Promise.all([
      prisma.warehouse.findMany({
        where: whereClause,
        include: {
          openingHours: true,
        },
        orderBy: {
          name: "asc",
        },
        skip,
        take: limit,
      }),
      prisma.warehouse.count({
        where: whereClause,
      }),
    ]);

    // Add favorite status if user is logged in
    let enhancedWarehouses = warehouses;
    if (session?.user) {
      const favoriteWarehouses = await prisma.userFavorite.findMany({
        where: {
          userId: session.user.id,
          warehouseId: {
            in: warehouses.map((w) => w.id),
          },
        },
      });

      enhancedWarehouses = warehouses.map((warehouse) => ({
        ...warehouse,
        isFavorite: favoriteWarehouses.some((fav) => fav.warehouseId === warehouse.id),
      }));
    }

    return NextResponse.json({
      data: enhancedWarehouses,
      meta: {
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    );
  }
} 