import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole, Prisma } from "@prisma/client";

// Schema for creating a warehouse
const createWarehouseSchema = z.object({
  name: z.string().min(3).max(100),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(2).max(20),
  country: z.string().min(2).max(100),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  capacity: z.number().int().positive(),
  contactPhone: z.string().optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  city: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "city", "capacity", "availableBoxes"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view warehouses"
        }
      }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Invalid query parameters",
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const {
      page,
      limit,
      search,
      city,
      isActive,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereClause: Prisma.WarehouseWhereInput = {};

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { postalCode: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by city
    if (city) {
      whereClause.city = { contains: city, mode: "insensitive" };
    }

    // Filter by active status
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    // Determine sorting
    const orderBy: Prisma.WarehouseOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Count total matching warehouses for pagination
    const totalCount = await prisma.warehouse.count({
      where: whereClause
    });

    // Fetch warehouses
    const warehouses = await prisma.warehouse.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        openingHours: true,
        _count: {
          select: {
            storageBoxes: true
          }
        }
      }
    });

    // Format response data
    const formattedWarehouses = warehouses.map(warehouse => ({
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      postalCode: warehouse.postalCode,
      country: warehouse.country,
      coordinates: warehouse.coordinates,
      isActive: warehouse.isActive,
      capacity: warehouse.capacity,
      availableBoxes: warehouse.availableBoxes,
      contactPhone: warehouse.contactPhone,
      openingHours: warehouse.openingHours,
      boxCount: warehouse._count.storageBoxes
    }));

    // Return list with pagination metadata
    return NextResponse.json({
      success: true,
      data: {
        warehouses: formattedWarehouses,
        meta: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch warehouses"
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to create a warehouse"
        }
      }, { status: 401 });
    }

    // Check admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can create warehouses"
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createWarehouseSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid warehouse data provided",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const {
      name,
      address,
      city,
      postalCode,
      country,
      coordinates,
      capacity,
      contactPhone
    } = validatedData.data;

    // Create the warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        address,
        city,
        postalCode,
        country,
        coordinates,
        capacity,
        availableBoxes: capacity, // Initially all boxes are available
        contactPhone,
        isActive: true
      }
    });

    // Create an audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "WAREHOUSE",
        entityId: warehouse.id,
        description: `Created warehouse: ${name}`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        warehouse
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create warehouse"
      }
    }, { status: 500 });
  }
} 