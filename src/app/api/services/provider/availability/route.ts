import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for creating availability slots
const createAvailabilitySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceEndDate: z.string().datetime().optional(),
  maxConcurrentBookings: z.number().int().positive().default(1),
  notes: z.string().max(500).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "ALL"]).default("ALL"),
  sortBy: z.enum(["date"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
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
      startDate,
      endDate,
      recurrence,
      sortBy,
      sortOrder,
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Prisma.ProviderAvailabilityWhereInput = {};
    
    // Filter by service provider ID if not admin
    if (serviceProviderId) {
      whereClause.serviceProviderId = serviceProviderId;
    }

    // Apply additional filters
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

    if (recurrence !== "ALL") {
      whereClause.recurrence = recurrence;
    }

    // Define sorting options
    const orderBy: Prisma.ProviderAvailabilityOrderByWithRelationInput = {};
    if (sortBy === "date") {
      orderBy.startDate = sortOrder;
    }

    // Fetch availability slots with pagination, filtering, and sorting
    const [availabilities, totalCount] = await Promise.all([
      prisma.providerAvailability.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        include: {
          serviceProvider: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.providerAvailability.count({ where: whereClause }),
    ]);

    // Prepare response with pagination metadata
    return NextResponse.json({
      data: availabilities,
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
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
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

    // Only service providers can create availability
    if (session.user.role !== "SERVICE_PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only service providers can create availability" },
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
    } else if (session.user.role === "ADMIN") {
      // Admin must specify a service provider ID in the request
      const body = await req.json();
      if (!body.serviceProviderId) {
        return NextResponse.json(
          { error: "Service provider ID is required for admins" },
          { status: 400 }
        );
      }
      
      // Verify the service provider exists
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { id: body.serviceProviderId },
      });
      
      if (!serviceProvider) {
        return NextResponse.json(
          { error: "Service provider not found" },
          { status: 404 }
        );
      }
      
      serviceProviderId = body.serviceProviderId;
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createAvailabilitySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Convert dates to Date objects
    const startDate = new Date(validatedData.data.startDate);
    const endDate = new Date(validatedData.data.endDate);
    const recurrenceEndDate = validatedData.data.recurrenceEndDate
      ? new Date(validatedData.data.recurrenceEndDate)
      : null;

    // Validate date ranges
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    if (
      validatedData.data.recurrence !== "NONE" &&
      !recurrenceEndDate
    ) {
      return NextResponse.json(
        { error: "Recurrence end date is required for recurring availability" },
        { status: 400 }
      );
    }

    if (
      recurrenceEndDate &&
      recurrenceEndDate <= endDate
    ) {
      return NextResponse.json(
        { error: "Recurrence end date must be after the end date" },
        { status: 400 }
      );
    }

    // Check for overlapping availability
    const overlappingAvailability = await prisma.providerAvailability.findFirst({
      where: {
        serviceProviderId,
        AND: [
          {
            startDate: {
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
            },
          },
        ],
      },
    });

    if (overlappingAvailability) {
      return NextResponse.json(
        { error: "This time slot overlaps with existing availability" },
        { status: 400 }
      );
    }

    // Create availability within a transaction
    const availabilityResult = await prisma.$transaction(async (tx) => {
      // Create the availability
      const newAvailability = await tx.providerAvailability.create({
        data: {
          serviceProviderId: serviceProviderId as string,
          startDate,
          endDate,
          recurrence: validatedData.data.recurrence,
          recurrenceEndDate,
          maxConcurrentBookings: validatedData.data.maxConcurrentBookings,
          notes: validatedData.data.notes,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_AVAILABILITY",
          entityType: "PROVIDER_AVAILABILITY",
          entityId: newAvailability.id,
          details: `Created availability from ${startDate.toISOString()} to ${endDate.toISOString()}`,
        },
      });

      return newAvailability;
    });

    return NextResponse.json({
      data: availabilityResult,
      message: "Availability created successfully",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating availability:", error);
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    );
  }
} 