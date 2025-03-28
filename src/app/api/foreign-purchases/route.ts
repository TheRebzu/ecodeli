import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ForeignPurchaseStatus, Prisma, UserRole } from "@prisma/client";
import slugify from "slugify";

// Schema for creating a foreign purchase request
const createForeignPurchaseSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  sourceUrl: z.string().url().max(500),
  countryId: z.string().uuid(),
  estimatedPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  shippingPreference: z.enum(["STANDARD", "EXPRESS", "ECONOMY"]),
  customRequirements: z.string().max(500).optional(),
  mediaIds: z.array(z.string().uuid()).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  countryId: z.string().uuid().optional(),
  status: z.nativeEnum(ForeignPurchaseStatus).optional(),
  sortBy: z.enum(["createdAt", "estimatedPrice", "title", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  userId: z.string().uuid().optional(),
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
          message: "You must be logged in to view foreign purchase requests"
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
      countryId,
      status,
      sortBy,
      sortOrder,
      userId
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereClause: Prisma.ForeignPurchaseRequestWhereInput = {};

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sourceUrl: { contains: search, mode: "insensitive" } },
        { customRequirements: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by country
    if (countryId) {
      whereClause.countryId = countryId;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by user permissions
    // Regular users can only see their own requests
    // Admins can see all requests
    // Purchasing agents can see requests assigned to them or unassigned ones
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!userFromDb) {
      return NextResponse.json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      }, { status: 404 });
    }

    // If specific user ID is provided and user is an admin, filter by that user
    if (userId && userFromDb.role === UserRole.ADMIN) {
      whereClause.userId = userId;
    } else if (userFromDb.role === UserRole.USER) {
      // Regular users can only see their own requests
      whereClause.userId = userFromDb.id;
    } else if (userFromDb.role === UserRole.PURCHASING_AGENT) {
      // Purchasing agents can see requests assigned to them or unassigned ones
      whereClause.OR = [
        { assignedAgentId: userFromDb.id },
        { 
          assignedAgentId: null,
          status: {
            in: ["PENDING", "APPROVED"]
          }
        }
      ];
    }
    // Admins can see all requests, so no additional filters needed

    // Determine sorting
    const orderBy: Prisma.ForeignPurchaseRequestOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Count total matching requests for pagination
    const totalCount = await prisma.foreignPurchaseRequest.count({
      where: whereClause
    });

    // Fetch foreign purchase requests
    const foreignPurchases = await prisma.foreignPurchaseRequest.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        sourceUrl: true,
        estimatedPrice: true,
        quantity: true,
        status: true,
        shippingPreference: true,
        createdAt: true,
        updatedAt: true,
        customRequirements: true,
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagUrl: true,
            currencyCode: true,
            currencySymbol: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            alt: true
          }
        },
        statusUpdates: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1,
          select: {
            status: true,
            notes: true,
            createdAt: true
          }
        }
      }
    });

    // Return list with pagination metadata
    return NextResponse.json({
      success: true,
      data: {
        foreignPurchases,
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
    console.error("Error fetching foreign purchase requests:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch foreign purchase requests"
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
          message: "You must be logged in to create a foreign purchase request"
        }
      }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const validatedBody = createForeignPurchaseSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid request data",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const {
      title,
      description,
      sourceUrl,
      countryId,
      estimatedPrice,
      quantity,
      shippingPreference,
      customRequirements,
      mediaIds
    } = validatedBody.data;

    // Verify if the country exists and supports foreign purchases
    const country = await prisma.country.findUnique({
      where: { 
        id: countryId,
        supportsForeignPurchase: true,
        isActive: true
      }
    });

    if (!country) {
      return NextResponse.json({
        success: false,
        error: {
          code: "COUNTRY_NOT_FOUND",
          message: "Selected country does not exist or does not support foreign purchases"
        }
      }, { status: 404 });
    }

    // Verify that media items belong to the user if provided
    if (mediaIds && mediaIds.length > 0) {
      const mediaCount = await prisma.media.count({
        where: {
          id: { in: mediaIds },
          userId: session.user.id
        }
      });

      if (mediaCount !== mediaIds.length) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_MEDIA",
            message: "One or more media items do not exist or do not belong to you"
          }
        }, { status: 400 });
      }
    }

    // Create foreign purchase request with transaction to ensure all related records are created
    const result = await prisma.$transaction(async (tx) => {
      // Create the foreign purchase request
      const purchaseRequest = await tx.foreignPurchaseRequest.create({
        data: {
          title,
          slug: slugify(title, { lower: true, strict: true }),
          description,
          sourceUrl,
          countryId,
          estimatedPrice,
          quantity,
          shippingPreference,
          customRequirements,
          userId: session.user.id,
          status: ForeignPurchaseStatus.PENDING
        }
      });

      // Link media items if provided
      if (mediaIds && mediaIds.length > 0) {
        await tx.foreignPurchaseRequestMedia.createMany({
          data: mediaIds.map(mediaId => ({
            foreignPurchaseRequestId: purchaseRequest.id,
            mediaId
          }))
        });
      }

      // Create initial status update record
      await tx.foreignPurchaseStatusUpdate.create({
        data: {
          foreignPurchaseRequestId: purchaseRequest.id,
          status: ForeignPurchaseStatus.PENDING,
          notes: "Request submitted",
          userId: session.user.id
        }
      });

      // Create notification for admins about new request
      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true }
      });

      await tx.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: "New Foreign Purchase Request",
          message: `New foreign purchase request created: ${title}`,
          type: "FOREIGN_PURCHASE",
          referenceId: purchaseRequest.id
        }))
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "FOREIGN_PURCHASE",
          entityId: purchaseRequest.id,
          userId: session.user.id,
          details: {
            title,
            countryId,
            estimatedPrice,
            quantity
          }
        }
      });

      return purchaseRequest;
    });

    // Fetch complete created request with related data
    const createdRequest = await prisma.foreignPurchaseRequest.findUnique({
      where: { id: result.id },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagUrl: true,
            currencyCode: true,
            currencySymbol: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            alt: true
          }
        },
        statusUpdates: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1,
          select: {
            status: true,
            notes: true,
            createdAt: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: createdRequest
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating foreign purchase request:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create foreign purchase request"
      }
    }, { status: 500 });
  }
} 