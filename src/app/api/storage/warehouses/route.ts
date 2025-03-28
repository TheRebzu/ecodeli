import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  isActive: z.enum(["true", "false", "all"]).optional().default("true"),
  city: z.string().optional(),
  hasAvailableBoxes: z.enum(["true", "false", "all"]).optional().default("all"),
  search: z.string().optional(),
  sortBy: z.enum(["name", "city", "availableBoxes", "capacity"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const validatedParams = queryParamsSchema.parse({
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 10,
      isActive: url.searchParams.get("isActive") || "true",
      city: url.searchParams.get("city"),
      hasAvailableBoxes: url.searchParams.get("hasAvailableBoxes") || "all",
      search: url.searchParams.get("search"),
      sortBy: url.searchParams.get("sortBy") || "name",
      sortOrder: url.searchParams.get("sortOrder") || "asc",
    });

    // Build filter conditions
    const whereClause: Prisma.WarehouseWhereInput = {};

    // Filter by active status
    if (validatedParams.isActive !== "all") {
      whereClause.isActive = validatedParams.isActive === "true";
    }

    // Filter by city
    if (validatedParams.city) {
      whereClause.city = {
        contains: validatedParams.city,
        mode: 'insensitive',
      };
    }

    // Filter by available boxes
    if (validatedParams.hasAvailableBoxes !== "all") {
      if (validatedParams.hasAvailableBoxes === "true") {
        whereClause.availableBoxes = { gt: 0 };
      } else {
        whereClause.availableBoxes = { equals: 0 };
      }
    }

    // Handle search query
    if (validatedParams.search) {
      whereClause.OR = [
        {
          name: {
            contains: validatedParams.search,
            mode: 'insensitive',
          },
        },
        {
          address: {
            contains: validatedParams.search,
            mode: 'insensitive',
          },
        },
        {
          city: {
            contains: validatedParams.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Calculate pagination values
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Prepare sort options
    const orderBy: Prisma.WarehouseOrderByWithRelationInput = {
      [validatedParams.sortBy]: validatedParams.sortOrder,
    };

    // Fetch warehouses with pagination
    const [warehouses, totalCount] = await Promise.all([
      prisma.warehouse.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: validatedParams.limit,
        include: {
          openingHours: true,
          _count: {
            select: {
              storageBoxes: true,
              nfcTerminals: true,
            },
          },
        },
      }),
      prisma.warehouse.count({ where: whereClause }),
    ]);

    // Calculate warehouse usage statistics
    const warehousesWithStats = warehouses.map(warehouse => {
      const usagePercentage = warehouse.capacity > 0 
        ? ((warehouse.capacity - warehouse.availableBoxes) / warehouse.capacity) * 100 
        : 0;
      
      return {
        ...warehouse,
        usagePercentage: Math.round(usagePercentage),
        currentlyOpen: isWarehouseOpen(warehouse.openingHours),
        openingHoursFormatted: formatOpeningHours(warehouse.openingHours),
      };
    });

    // Prepare response with pagination metadata
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPrevPage = validatedParams.page > 1;

    return NextResponse.json({
      data: warehousesWithStats,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching warehouses:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

/**
 * Check if the warehouse is currently open based on its opening hours
 */
function isWarehouseOpen(openingHours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>) {
  if (!openingHours || openingHours.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0-6, 0 is Sunday
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const todayHours = openingHours.find(hours => hours.dayOfWeek === currentDay);
  
  if (!todayHours || todayHours.isClosed) {
    return false;
  }
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
}

/**
 * Format opening hours into a human-readable format
 */
function formatOpeningHours(
  openingHours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>
) {
  if (!openingHours || openingHours.length === 0) {
    return [];
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  return openingHours
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(hours => ({
      day: dayNames[hours.dayOfWeek],
      hours: hours.isClosed ? "Closed" : `${hours.openTime} - ${hours.closeTime}`,
      isClosed: hours.isClosed,
    }));
} 