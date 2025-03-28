import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BoxSize, Prisma, UserRole } from "@prisma/client";

// Schema for creating a storage box
const createStorageBoxSchema = z.object({
  boxNumber: z.string().min(1).max(50),
  size: z.nativeEnum(BoxSize),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  accessCode: z.string().optional()
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  size: z.nativeEnum(BoxSize).optional(),
  isOccupied: z.coerce.boolean().optional(),
  sortBy: z.enum(["boxNumber", "size", "isOccupied", "checkInDate"]).default("boxNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view storage boxes"
        }
      }, { status: 401 });
    }

    const { id } = params;

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id }
    });

    if (!warehouse) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Warehouse not found"
        }
      }, { status: 404 });
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
      size,
      isOccupied,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereClause: Prisma.StorageBoxWhereInput = { warehouseId: id };

    // Filter by size
    if (size) {
      whereClause.size = size;
    }

    // Filter by occupied status
    if (isOccupied !== undefined) {
      whereClause.isOccupied = isOccupied;
    }

    // Determine sorting
    const orderBy: Prisma.StorageBoxOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Count total matching boxes for pagination
    const totalCount = await prisma.storageBox.count({
      where: whereClause
    });

    // Fetch storage boxes
    const storageBoxes = await prisma.storageBox.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        delivery: {
          select: {
            id: true,
            trackingNumber: true,
            status: true
          }
        }
      }
    });

    // Return list with pagination metadata
    return NextResponse.json({
      success: true,
      data: {
        storageBoxes,
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
    console.error("Error fetching storage boxes:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch storage boxes"
      }
    }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to create a storage box"
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
          message: "Only administrators can create storage boxes"
        }
      }, { status: 403 });
    }

    const { id } = params;

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id }
    });

    if (!warehouse) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Warehouse not found"
        }
      }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createStorageBoxSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid storage box data provided",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    // Check if box number already exists in this warehouse
    const existingBox = await prisma.storageBox.findFirst({
      where: {
        warehouseId: id,
        boxNumber: validatedData.data.boxNumber
      }
    });

    if (existingBox) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A box with this number already exists in this warehouse"
        }
      }, { status: 409 });
    }

    // Create the storage box
    const storageBox = await prisma.storageBox.create({
      data: {
        ...validatedData.data,
        warehouseId: id,
        isOccupied: false
      }
    });

    // Update available boxes count in warehouse
    await prisma.warehouse.update({
      where: { id },
      data: {
        availableBoxes: {
          increment: 1
        }
      }
    });

    // Create an audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "STORAGE_BOX",
        entityId: storageBox.id,
        description: `Created storage box ${storageBox.boxNumber} in warehouse ${warehouse.name}`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        storageBox
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating storage box:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create storage box"
      }
    }, { status: 500 });
  }
} 