import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  deliveryId: z.string().optional(),
  trackingNumber: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  isPublic: z.enum(["true", "false", "all"]).optional().default("all"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sort: z.enum(["timestamp", "status"]).optional().default("timestamp"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user (optional for public tracking)
    const session = await getServerSession(authOptions);
    
    // Parse and validate query parameters
    const url = new URL(req.url);
    const validatedParams = queryParamsSchema.parse({
      deliveryId: url.searchParams.get("deliveryId"),
      trackingNumber: url.searchParams.get("trackingNumber"),
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 10,
      isPublic: url.searchParams.get("isPublic") || "all",
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
      sort: url.searchParams.get("sort") || "timestamp",
      order: url.searchParams.get("order") || "desc",
    });

    // Either deliveryId or trackingNumber must be provided
    if (!validatedParams.deliveryId && !validatedParams.trackingNumber) {
      return NextResponse.json(
        { error: "Either deliveryId or trackingNumber is required" },
        { status: 400 }
      );
    }

    // If tracking by number, first find the delivery
    let deliveryId = validatedParams.deliveryId;
    if (!deliveryId && validatedParams.trackingNumber) {
      const delivery = await prisma.delivery.findUnique({
        where: { trackingNumber: validatedParams.trackingNumber },
      });

      if (!delivery) {
        return NextResponse.json(
          { error: "Delivery not found" },
          { status: 404 }
        );
      }

      deliveryId = delivery.id;
    }

    // Build where clause
    const whereClause: Prisma.TrackingUpdateWhereInput = {
      deliveryId,
    };

    // Date range filtering
    if (validatedParams.startDate || validatedParams.endDate) {
      whereClause.timestamp = {};

      if (validatedParams.startDate) {
        whereClause.timestamp.gte = new Date(validatedParams.startDate);
      }

      if (validatedParams.endDate) {
        whereClause.timestamp.lte = new Date(validatedParams.endDate);
      }
    }

    // Public/private filtering for authorized users
    if (session?.user && validatedParams.isPublic !== "all") {
      whereClause.isPublic = validatedParams.isPublic === "true";
    } else {
      // Without a session, show only public updates
      whereClause.isPublic = true;
    }

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Sorting
    const orderBy: Prisma.TrackingUpdateOrderByWithRelationInput = {
      [validatedParams.sort]: validatedParams.order,
    };

    // Query updates with pagination
    const [updates, totalCount] = await Promise.all([
      prisma.trackingUpdate.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: validatedParams.limit,
      }),
      prisma.trackingUpdate.count({ where: whereClause }),
    ]);

    // Get delivery details
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId! },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        estimatedDelivery: true,
        actualDelivery: true,
        recipientName: true,
      },
    });

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPrevPage = validatedParams.page > 1;

    return NextResponse.json({
      delivery,
      updates,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching tracking updates:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch tracking updates" },
      { status: 500 }
    );
  }
} 