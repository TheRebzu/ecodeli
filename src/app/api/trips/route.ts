import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { VehicleType } from "@prisma/client";

// Schema for creating a trip
const createTripSchema = z.object({
  startLocation: z.object({
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  endLocation: z.object({
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  waypoints: z.array(
    z.object({
      address: z.string(),
      city: z.string(),
      postalCode: z.string(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    })
  ).optional(),
  scheduledDate: z.string(), // ISO date string
  estimatedDepartureTime: z.string(), // ISO time string
  estimatedArrivalTime: z.string(), // ISO time string
  vehicleType: z.nativeEnum(VehicleType),
  availableSpace: z.number().int().positive(),
  maxWeight: z.number().positive(),
  additionalNotes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number().int().min(0).max(6)).optional(), // 0-6, 0 is Sunday
});

// Schema for query parameters
const queryParamsSchema = z.object({
  startCity: z.string().optional(),
  endCity: z.string().optional(),
  date: z.string().optional(), // ISO date string
  vehicleType: z.nativeEnum(VehicleType).optional(),
  minSpace: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// POST: Create a planned trip
export async function POST(req: NextRequest) {
  try {
    // Authenticate user and check if the user is a delivery person
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERY_PERSON") {
      return NextResponse.json(
        { error: "Only delivery persons can create trips" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = createTripSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const {
      startLocation,
      endLocation,
      waypoints,
      scheduledDate,
      estimatedDepartureTime,
      estimatedArrivalTime,
      vehicleType,
      availableSpace,
      maxWeight,
      additionalNotes,
      isRecurring,
      recurringDays,
    } = validatedBody.data;

    // Get delivery person ID
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Delivery person profile not found" },
        { status: 404 }
      );
    }

    // Create the trip
    const trip = await prisma.plannedTrip.create({
      data: {
        deliveryPersonId: deliveryPerson.id,
        startLocation: startLocation,
        endLocation: endLocation,
        waypoints: waypoints || [],
        scheduledDate: new Date(scheduledDate),
        estimatedDepartureTime,
        estimatedArrivalTime,
        vehicleType,
        availableSpace,
        maxWeight,
        additionalNotes: additionalNotes || "",
        status: "SCHEDULED",
        isRecurring,
        recurringDays: isRecurring ? recurringDays || [] : [],
      },
    });

    return NextResponse.json({
      data: trip,
    });
  } catch (error: unknown) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}

// GET: List available trips with filtering
export async function GET(req: NextRequest) {
  try {
    // Authentication is not required for viewing trips
    // We don't actually use the session in this endpoint yet
    await getServerSession(authOptions);

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      startCity: searchParams.get("startCity"),
      endCity: searchParams.get("endCity"),
      date: searchParams.get("date"),
      vehicleType: searchParams.get("vehicleType"),
      minSpace: searchParams.get("minSpace"),
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { startCity, endCity, date, vehicleType, minSpace, page, limit } = validatedParams.data;
    const skip = (page - 1) * limit;

    // Build query
    const whereClause: {
      status: string;
      "startLocation.city"?: string;
      "endLocation.city"?: string;
      scheduledDate?: Date;
      vehicleType?: VehicleType;
      availableSpace?: {
        gte: number;
      };
    } = {
      status: "SCHEDULED",
    };

    if (startCity) {
      whereClause["startLocation.city"] = startCity;
    }

    if (endCity) {
      whereClause["endLocation.city"] = endCity;
    }

    if (date) {
      whereClause.scheduledDate = new Date(date);
    }

    if (vehicleType) {
      whereClause.vehicleType = vehicleType;
    }

    if (minSpace) {
      whereClause.availableSpace = {
        gte: minSpace,
      };
    }

    // Fetch trips with pagination
    const [trips, totalCount] = await Promise.all([
      prisma.plannedTrip.findMany({
        where: whereClause,
        include: {
          deliveryPerson: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  rating: true,
                },
              },
            },
          },
        },
        orderBy: {
          scheduledDate: "asc",
        },
        skip,
        take: limit,
      }),
      prisma.plannedTrip.count({
        where: whereClause,
      }),
    ]);

    // Process trips to remove sensitive information
    const processedTrips = trips.map((trip) => ({
      ...trip,
      deliveryPerson: {
        ...trip.deliveryPerson,
        user: {
          ...trip.deliveryPerson.user,
          // Do not include other sensitive info
        },
      },
    }));

    return NextResponse.json({
      data: processedTrips,
      meta: {
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        },
        filters: {
          startCity,
          endCity,
          date,
          vehicleType,
          minSpace,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
} 