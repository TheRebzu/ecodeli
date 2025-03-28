import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for product creation
const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(["g", "kg", "lb", "oz"]).optional(),
  quantity: z.number().int().nonnegative(),
  isAvailable: z.boolean().default(true),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  merchantId: z.string().optional(),
  isAvailable: z.enum(["true", "false", "all"]).default("true"),
  sortBy: z.enum(["name", "price", "createdAt", "quantity"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  tags: z.string().optional(), // format: tag1,tag2,tag3
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
      category, 
      minPrice, 
      maxPrice, 
      merchantId, 
      isAvailable, 
      sortBy, 
      sortOrder,
      tags
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Prisma.ProductWhereInput = {};

    // Apply filters
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      whereClause.categoryId = category;
    }

    if (minPrice) {
      whereClause.price = whereClause.price || {};
      whereClause.price.gte = minPrice;
    }

    if (maxPrice) {
      whereClause.price = whereClause.price || {};
      whereClause.price.lte = maxPrice;
    }

    if (merchantId) {
      whereClause.merchantId = merchantId;
    }

    if (isAvailable !== "all") {
      whereClause.isAvailable = isAvailable === "true";
    }

    if (tags) {
      const tagList = tags.split(',');
      whereClause.tags = {
        hasSome: tagList
      };
    }

    // Define sorting options
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Fetch products with pagination, filtering, and sorting
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          merchant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true
            }
          },
          media: {
            select: {
              id: true,
              url: true,
              alt: true,
              isFeatured: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);

    // Prepare response with pagination metadata
    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch products"
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
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    // Check user role (only merchants and admins can create products)
    if (session.user.role !== "MERCHANT" && session.user.role !== "ADMIN") {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only merchants can create products"
        }
      }, { status: 403 });
    }

    // Get merchant linked to the user
    let merchantId = null;
    
    if (session.user.role === "MERCHANT") {
      const merchant = await prisma.merchant.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });

      if (!merchant) {
        return NextResponse.json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Merchant profile not found"
          }
        }, { status: 404 });
      }
      
      merchantId = merchant.id;
    } else if (session.user.role === "ADMIN") {
      // For admins, merchant ID should be provided in the request
      const body = await req.json();
      if (body.merchantId) {
        const merchant = await prisma.merchant.findUnique({
          where: { id: body.merchantId }
        });
        
        if (!merchant) {
          return NextResponse.json({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Merchant not found"
            }
          }, { status: 404 });
        }
        
        merchantId = body.merchantId;
      }
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createProductSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    // Generate slug from product name
    const slug = validatedData.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Create product within a transaction
    const productResult = await prisma.$transaction(async (tx) => {
      // Create the product
      const product = await tx.product.create({
        data: {
          ...validatedData.data,
          slug,
          merchantId,
          // Handle relationships
          ...(validatedData.data.mediaIds && {
            media: {
              connect: validatedData.data.mediaIds.map(id => ({ id }))
            }
          }),
        },
        include: {
          category: true,
          merchant: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          media: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_PRODUCT",
          entityType: "PRODUCT",
          entityId: product.id,
          details: `Product created: ${product.name}`
        }
      });

      return product;
    });

    return NextResponse.json({
      success: true,
      data: productResult,
      message: "Product created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create product"
      }
    }, { status: 500 });
  }
} 