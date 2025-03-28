import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(["product", "service", "delivery", "all"]).default("all"),
  sortBy: z.enum(["createdAt", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found"
        }
      }, { status: 404 });
    }

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
      type,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build review filter
    const whereClause: Prisma.ReviewWhereInput = {
      userId
    };

    // Filter by review type if specified
    if (type === "product") {
      whereClause.productId = { not: null };
    } else if (type === "service") {
      whereClause.serviceId = { not: null };
    } else if (type === "delivery") {
      whereClause.deliveryId = { not: null };
    }

    // Fetch reviews with pagination and filtering
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        orderBy: {
          [sortBy]: sortOrder
        },
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true
            }
          },
          service: {
            select: {
              id: true,
              title: true,
              type: true
            }
          },
          delivery: {
            select: {
              id: true,
              status: true,
              deliveryDate: true
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: whereClause })
    ]);

    // Process reviews to include type information
    const processedReviews = reviews.map(review => {
      let reviewType = null;
      let reviewTarget = null;

      if (review.product) {
        reviewType = "product";
        reviewTarget = review.product;
      } else if (review.service) {
        reviewType = "service";
        reviewTarget = review.service;
      } else if (review.delivery) {
        reviewType = "delivery";
        reviewTarget = review.delivery;
      }

      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        isAnonymous: review.isAnonymous,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        type: reviewType,
        target: reviewTarget
      };
    });

    // Return reviews with user info and metadata
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          image: user.image
        },
        reviews: processedReviews,
        meta: {
          pagination: {
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
          },
          summary: {
            totalReviews: totalCount
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch user reviews"
      }
    }, { status: 500 });
  }
} 