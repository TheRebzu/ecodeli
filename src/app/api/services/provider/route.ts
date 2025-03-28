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
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ALL"]).default("ALL"),
  hasCustomer: z.enum(["true", "false", "all"]).default("all"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(["date", "status", "price"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only service providers can access this endpoint
    if (session.user.role !== "SERVICE_PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only service providers can access this endpoint" },
        { status: 403 }
      );
    }

    // Get service provider ID
    let serviceProviderId: string | null = null;
    
    if (session.user.role === "SERVICE_PROVIDER") {
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!serviceProvider) {
        return NextResponse.json(
          { error: "Service provider profile not found" },
          { status: 404 }
        );
      }
      
      serviceProviderId = serviceProvider.id;
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
      status,
      hasCustomer,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Prisma.ServiceWhereInput = {};
    
    // Filter by service provider ID if not admin
    if (serviceProviderId) {
      whereClause.serviceProviderId = serviceProviderId;
    }

    // Apply additional filters
    if (status !== "ALL") {
      whereClause.status = status;
    }

    if (hasCustomer === "true") {
      whereClause.customerId = { not: null };
    } else if (hasCustomer === "false") {
      whereClause.customerId = null;
    }

    if (startDate) {
      whereClause.startDate = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      whereClause.endDate = {
        lte: new Date(endDate),
      };
    }

    // Define sorting options
    const orderBy: Prisma.ServiceOrderByWithRelationInput = {};
    if (sortBy === "date") {
      orderBy.startDate = sortOrder;
    } else if (sortBy === "status") {
      orderBy.status = sortOrder;
    } else if (sortBy === "price") {
      orderBy.price = sortOrder;
    }

    // Fetch services with pagination, filtering, and sorting
    const [services, totalCount] = await Promise.all([
      prisma.service.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          reviews: {
            select: {
              id: true,
              rating: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.service.count({ where: whereClause }),
    ]);

    // Calculate average ratings for services
    const servicesWithRatings = services.map(service => {
      const reviews = service.reviews || [];
      const averageRating = reviews.length > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
        : null;
      
      return {
        ...service,
        averageRating,
        totalReviews: reviews.length,
      };
    });

    // Prepare response with pagination metadata
    return NextResponse.json({
      data: servicesWithRatings,
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
    console.error("Error fetching provider services:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider services" },
      { status: 500 }
    );
  }
} 