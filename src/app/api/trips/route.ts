import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { VehicleType } from "@prisma/client";

/**
 * @swagger
 * /trips:
 *   post:
 *     tags:
 *       - trips
 *     summary: Create a new planned trip
 *     description: Create a new planned trip as a delivery person
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Trip information to create
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTripRequest'
 *     responses:
 *       200:
 *         description: Trip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Trip'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only delivery persons can create trips
 *       404:
 *         description: Delivery person profile not found
 *       500:
 *         description: Internal server error
 */

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

/**
 * @swagger
 * /trips:
 *   get:
 *     tags:
 *       - trips
 *     summary: Retrieve all trips
 *     description: Get all planned trips with filtering options
 *     parameters:
 *       - name: startCity
 *         in: query
 *         description: Filter by starting city
 *         schema:
 *           type: string
 *       - name: endCity
 *         in: query
 *         description: Filter by destination city
 *         schema:
 *           type: string
 *       - name: date
 *         in: query
 *         description: Filter by date (ISO format)
 *         schema:
 *           type: string
 *           format: date
 *       - name: vehicleType
 *         in: query
 *         description: Filter by vehicle type
 *         schema:
 *           type: string
 *           enum: [CAR, BIKE, SCOOTER, VAN, TRUCK, PUBLIC_TRANSPORT, WALK]
 *       - name: minSpace
 *         in: query
 *         description: Filter by minimum available space
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid query parameters
 */

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
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
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

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       required:
 *         - address
 *         - city
 *         - postalCode
 *         - coordinates
 *       properties:
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         postalCode:
 *           type: string
 *         coordinates:
 *           type: object
 *           required:
 *             - lat
 *             - lng
 *           properties:
 *             lat:
 *               type: number
 *               format: double
 *             lng:
 *               type: number
 *               format: double
 *
 *     CreateTripRequest:
 *       type: object
 *       required:
 *         - startLocation
 *         - endLocation
 *         - scheduledDate
 *         - estimatedDepartureTime
 *         - estimatedArrivalTime
 *         - vehicleType
 *         - availableSpace
 *         - maxWeight
 *       properties:
 *         startLocation:
 *           $ref: '#/components/schemas/Location'
 *         endLocation:
 *           $ref: '#/components/schemas/Location'
 *         waypoints:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Location'
 *         scheduledDate:
 *           type: string
 *           format: date
 *         estimatedDepartureTime:
 *           type: string
 *           format: time
 *         estimatedArrivalTime:
 *           type: string
 *           format: time
 *         vehicleType:
 *           type: string
 *           enum: [CAR, BIKE, SCOOTER, VAN, TRUCK, PUBLIC_TRANSPORT, WALK]
 *         availableSpace:
 *           type: integer
 *           minimum: 1
 *         maxWeight:
 *           type: number
 *           minimum: 0
 *         additionalNotes:
 *           type: string
 *         isRecurring:
 *           type: boolean
 *           default: false
 *         recurringDays:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 0
 *             maximum: 6
 *
 *     DeliveryPerson:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             image:
 *               type: string
 *             rating:
 *               type: number
 *               format: double
 *         transportType:
 *           type: string
 *           enum: [CAR, BIKE, SCOOTER, VAN, TRUCK, PUBLIC_TRANSPORT, WALK]
 *         status:
 *           type: string
 *           enum: [AVAILABLE, BUSY, OFFLINE]
 *
 *     Trip:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         deliveryPersonId:
 *           type: string
 *         startLocation:
 *           $ref: '#/components/schemas/Location'
 *         endLocation:
 *           $ref: '#/components/schemas/Location'
 *         waypoints:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Location'
 *         scheduledDate:
 *           type: string
 *           format: date-time
 *         estimatedDepartureTime:
 *           type: string
 *         estimatedArrivalTime:
 *           type: string
 *         vehicleType:
 *           type: string
 *           enum: [CAR, BIKE, SCOOTER, VAN, TRUCK, PUBLIC_TRANSPORT, WALK]
 *         availableSpace:
 *           type: integer
 *         maxWeight:
 *           type: number
 *         additionalNotes:
 *           type: string
 *         status:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         isRecurring:
 *           type: boolean
 *         recurringDays:
 *           type: array
 *           items:
 *             type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         deliveryPerson:
 *           $ref: '#/components/schemas/DeliveryPerson'
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         pages:
 *           type: integer
 */ 