import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating reviews
const createReviewSchema = z.object({
  productId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  deliveryId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(1000),
  isAnonymous: z.boolean().default(false),
});

// At least one of these must be provided
createReviewSchema.refine(
  (data) => data.productId || data.serviceId || data.deliveryId, 
  {
    message: "At least one of productId, serviceId, or deliveryId must be provided",
    path: ["target"]
  }
);

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  deliveryId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  sortBy: z.enum(["createdAt", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
      productId,
      serviceId,
      deliveryId,
      userId,
      minRating,
      maxRating,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build review filter
    const whereClause = {};

    if (productId) {
      whereClause.productId = productId;
    }

    if (serviceId) {
      whereClause.serviceId = serviceId;
    }

    if (deliveryId) {
      whereClause.deliveryId = deliveryId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (minRating !== undefined) {
      whereClause.rating = {
        ...whereClause.rating,
        gte: minRating
      };
    }

    if (maxRating !== undefined) {
      whereClause.rating = {
        ...whereClause.rating,
        lte: maxRating
      };
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
          productId: true,
          serviceId: true,
          deliveryId: true,
          rating: true,
          title: true,
          content: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: whereClause })
    ]);

    // Process reviews to respect anonymity
    const processedReviews = reviews.map(review => {
      if (review.isAnonymous) {
        return {
          ...review,
          user: {
            id: null,
            name: "Anonymous User",
            image: null
          }
        };
      }
      return review;
    });

    // Return reviews with metadata
    return NextResponse.json({
      success: true,
      data: {
        reviews: processedReviews,
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
    console.error("Error fetching reviews:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch reviews"
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

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createReviewSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid review data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { 
      productId, 
      serviceId, 
      deliveryId, 
      rating, 
      title, 
      content, 
      isAnonymous 
    } = validatedData.data;

    // Verify the user has access to leave this review
    // For products, user should have purchased the product
    if (productId) {
      const purchase = await prisma.order.findFirst({
        where: {
          userId: session.user.id,
          status: "DELIVERED",
          orderItems: {
            some: {
              productId
            }
          }
        }
      });

      if (!purchase) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You must purchase this product before reviewing it"
          }
        }, { status: 403 });
      }
    }

    // For services, user should have booked the service
    if (serviceId) {
      const booking = await prisma.booking.findFirst({
        where: {
          userId: session.user.id,
          serviceId,
          status: "COMPLETED"
        }
      });

      if (!booking) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You must complete a booking for this service before reviewing it"
          }
        }, { status: 403 });
      }
    }

    // For deliveries, user should be associated with the delivery
    if (deliveryId) {
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          order: {
            userId: session.user.id
          },
          status: "DELIVERED"
        }
      });

      if (!delivery) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only review deliveries for your orders that have been delivered"
          }
        }, { status: 403 });
      }
    }

    // Check if user already reviewed this item
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          { productId: productId || undefined },
          { serviceId: serviceId || undefined },
          { deliveryId: deliveryId || undefined }
        ]
      }
    });

    if (existingReview) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "You have already reviewed this item"
        }
      }, { status: 409 });
    }

    // Create the review in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the review
      const review = await tx.review.create({
        data: {
          userId: session.user.id,
          productId,
          serviceId,
          deliveryId,
          rating,
          title,
          content,
          isAnonymous
        }
      });

      // Update average rating for the associated entity
      if (productId) {
        const productReviews = await tx.review.aggregate({
          where: { productId },
          _avg: { rating: true },
          _count: true
        });

        await tx.product.update({
          where: { id: productId },
          data: {
            averageRating: productReviews._avg.rating || rating,
            reviewCount: productReviews._count
          }
        });
      }

      if (serviceId) {
        const serviceReviews = await tx.review.aggregate({
          where: { serviceId },
          _avg: { rating: true },
          _count: true
        });

        await tx.service.update({
          where: { id: serviceId },
          data: {
            averageRating: serviceReviews._avg.rating || rating,
            reviewCount: serviceReviews._count
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_REVIEW",
          entityType: "REVIEW",
          entityId: review.id,
          details: `Review created for ${productId ? 'product' : serviceId ? 'service' : 'delivery'} with rating: ${rating}`
        }
      });

      return review;
    });

    // Return success response with review data
    return NextResponse.json({
      success: true,
      data: result,
      message: "Review created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create review"
      }
    }, { status: 500 });
  }
} 