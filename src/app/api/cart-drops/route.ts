import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for creating cart drops
const createCartDropSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  isPublic: z.boolean().default(false),
  expireAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  initialItems: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().default(1),
      note: z.string().max(200).optional(),
    })
  ).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  creatorId: z.string().uuid().optional(),
  isPublic: z.enum(["true", "false", "all"]).default("all"),
  sortBy: z.enum(["createdAt", "name", "popularity"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  tag: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Parse and validate query parameters
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
      creatorId,
      isPublic,
      sortBy,
      sortOrder,
      tag
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereClause: Prisma.CartDropWhereInput = {};

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by creator
    if (creatorId) {
      whereClause.creatorId = creatorId;
    }

    // Filter by public/private status
    if (isPublic !== "all") {
      whereClause.isPublic = isPublic === "true";
    }

    // Only show non-expired or active cart drops
    whereClause.OR = [
      { expireAt: { gt: new Date() } },
      { expireAt: null },
    ];

    // Filter by tag if specified
    if (tag) {
      whereClause.tags = {
        has: tag
      };
    }

    // Determine sorting
    let orderBy: Prisma.CartDropOrderByWithRelationInput;
    if (sortBy === "popularity") {
      orderBy = {
        items: {
          _count: sortOrder
        }
      };
    } else {
      orderBy = {
        [sortBy]: sortOrder
      };
    }

    // Get current user session for private cart drops visibility
    const session = await getServerSession(authOptions);
    
    // If user is logged in, they can see their own private cart drops
    if (session?.user) {
      whereClause.OR = [
        { isPublic: true },
        { creatorId: session.user.id }
      ];
    } else {
      // For non-authenticated users, only show public cart drops
      whereClause.isPublic = true;
    }

    // Fetch cart drops with pagination and filtering
    const [cartDrops, totalCount] = await Promise.all([
      prisma.cartDrop.findMany({
        where: whereClause,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
            },
            take: 5, // Preview of first 5 items
          },
          _count: {
            select: {
              items: true,
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.cartDrop.count({ where: whereClause })
    ]);

    // Return cart drops with metadata
    return NextResponse.json({
      success: true,
      data: {
        cartDrops,
        meta: {
          pagination: {
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching cart drops:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch cart drops"
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
          message: "You must be logged in to create a cart drop"
        }
      }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createCartDropSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid cart drop data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { 
      name, 
      description, 
      isPublic, 
      expireAt, 
      tags, 
      initialItems 
    } = validatedData.data;

    // Create cart drop in a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Create the cart drop
      const cartDrop = await tx.cartDrop.create({
        data: {
          name,
          description,
          isPublic,
          expireAt: expireAt ? new Date(expireAt) : null,
          tags: tags || [],
          creatorId: session.user.id,
        }
      });

      // Add initial items if provided
      let items = [];
      if (initialItems && initialItems.length > 0) {
        items = await Promise.all(
          initialItems.map(item => 
            tx.cartDropItem.create({
              data: {
                cartDropId: cartDrop.id,
                productId: item.productId,
                quantity: item.quantity,
                note: item.note,
              }
            })
          )
        );
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_CART_DROP",
          entityType: "CART_DROP",
          entityId: cartDrop.id,
          details: `Created cart drop "${name}" with ${items.length} items`
        }
      });

      return {
        cartDrop,
        items
      };
    });

    // Return success response with created cart drop
    return NextResponse.json({
      success: true,
      data: result,
      message: "Cart drop created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating cart drop:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create cart drop"
      }
    }, { status: 500 });
  }
} 