import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for creating a review
const createReviewSchema = z.object({
  serviceId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(false),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  serviceId: z.string().optional(),
  serviceProviderId: z.string().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  sortBy: z.enum(["date", "rating"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedQuery.error.format() },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      serviceId,
      serviceProviderId,
      minRating,
      maxRating,
      sortBy,
      sortOrder,
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Prisma.ReviewWhereInput = {};
    
    // Apply filters
    if (serviceId) {
      whereClause.serviceId = serviceId;
    }
    
    if (serviceProviderId) {
      whereClause.service = {
        serviceProviderId,
      };
    }
    
    if (minRating) {
      whereClause.rating = whereClause.rating || {};
      whereClause.rating.gte = minRating;
    }
    
    if (maxRating) {
      whereClause.rating = whereClause.rating || {};
      whereClause.rating.lte = maxRating;
    }

    // Define sorting options
    const orderBy: Prisma.ReviewOrderByWithRelationInput = {};
    if (sortBy === "date") {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === "rating") {
      orderBy.rating = sortOrder;
    }

    // Fetch reviews with pagination, filtering, and sorting
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              type: true,
              serviceProvider: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    // If author's review is anonymous, remove their data
    const processedReviews = reviews.map(review => {
      // Checking a flag to determine if review is anonymous
      // Assuming we store this as metadata or in another way
      const isAnonymous = review.isVerified === false; // Using isVerified as a proxy for anonymity
      
      if (isAnonymous) {
        return {
          ...review,
          author: {
            id: null,
            name: "Anonymous User",
            image: null,
          },
        };
      }
      return review;
    });

    // Prepare response with pagination metadata
    return NextResponse.json({
      data: processedReviews,
      meta: {
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only customers can submit reviews
    if (session.user.role !== "CUSTOMER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only customers can submit reviews" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createReviewSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Check if the service exists and is completed
    const service = await prisma.service.findUnique({
      where: { id: validatedData.data.serviceId },
      include: {
        serviceProvider: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    if (service.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "You can only review completed services" },
        { status: 400 }
      );
    }

    // Get customer ID
    const customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!customer && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    // Check if the customer booked this service
    if (session.user.role === "CUSTOMER" && service.customerId !== customer?.id) {
      return NextResponse.json(
        { error: "You can only review services you've booked" },
        { status: 403 }
      );
    }

    // Check if customer already submitted a review for this service
    const existingReview = await prisma.review.findFirst({
      where: {
        serviceId: service.id,
        authorId: customer?.id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already submitted a review for this service" },
        { status: 400 }
      );
    }

    // Process review submission within a transaction
    const reviewResult = await prisma.$transaction(async (tx) => {
      // Create the review
      const newReview = await tx.review.create({
        data: {
          serviceId: service.id,
          authorId: customer?.id,
          rating: validatedData.data.rating,
          comment: validatedData.data.comment,
          isVerified: !validatedData.data.isAnonymous, // Using isVerified as inverse of isAnonymous
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_REVIEW",
          entityType: "REVIEW",
          entityId: newReview.id,
          details: `Submitted a ${validatedData.data.rating}-star review for service: ${service.title}`,
        },
      });

      // Create notification for the service provider
      if (service.serviceProvider?.userId) {
        await tx.notification.create({
          data: {
            userId: service.serviceProvider.userId,
            type: "INFO",
            title: "New Service Review",
            message: `You've received a ${validatedData.data.rating}-star review for "${service.title}".`,
            isRead: false,
          },
        });
      }

      return newReview;
    });

    return NextResponse.json({
      data: reviewResult,
      message: "Review submitted successfully",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
} 