import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  parentId: z.string().optional(),
  includeProducts: z.enum(["true", "false"]).default("false"),
  sortBy: z.enum(["name", "createdAt", "productCount"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
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
      parentId,
      includeProducts,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Prisma.CategoryWhereInput = {};

    // Apply filters
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (parentId) {
      whereClause.parentId = parentId;
    } else {
      // If no parentId is provided, show only root categories
      whereClause.parentId = null;
    }

    // Define sorting options
    const orderBy: Prisma.CategoryOrderByWithRelationInput = {};
    
    if (sortBy === "productCount") {
      // For sorting by product count, we need to include _count
      orderBy._count = { products: sortOrder };
    } else {
      orderBy[sortBy as keyof Prisma.CategoryOrderByWithRelationInput] = sortOrder;
    }

    // Determine what to include in the response
    const include: Prisma.CategoryInclude = {
      _count: {
        select: {
          products: true,
          children: true
        }
      },
      children: {
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          _count: {
            select: {
              products: true
            }
          }
        }
      }
    };

    // Include products if requested
    if (includeProducts === "true") {
      include.products = {
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          isAvailable: true,
          media: {
            where: { isFeatured: true },
            take: 1,
            select: {
              id: true,
              url: true,
              alt: true
            }
          }
        }
      };
    }

    // Fetch categories with pagination, filtering, and sorting
    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where: whereClause,
        include,
        orderBy,
        skip,
        take: limit
      }),
      prisma.category.count({ where: whereClause })
    ]);

    // Prepare response with pagination metadata
    return NextResponse.json({
      success: true,
      data: categories,
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
    console.error("Error fetching categories:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch categories"
      }
    }, { status: 500 });
  }
} 