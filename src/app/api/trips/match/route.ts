import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for finding matches
const matchTripsSchema = z.object({
  announcementId: z.string().optional(),
  origin: z.object({
    city: z.string(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  destination: z.object({
    city: z.string(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  date: z.string().optional(), // ISO date string
  packageSize: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]).optional(),
  packageWeight: z.number().positive().optional(),
  isUrgent: z.boolean().optional(),
});

// POST: Find matching trips for an announcement or delivery
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = matchTripsSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const {
      announcementId,
      origin,
      destination,
      date,
      packageSize,
      packageWeight,
      isUrgent,
    } = validatedBody.data;

    // If announcementId is provided, get announcement details
    let announcement;
    if (announcementId) {
      announcement = await prisma.announcement.findUnique({
        where: {
          id: announcementId,
        },
      });

      if (!announcement) {
        return NextResponse.json(
          { error: "Announcement not found" },
          { status: 404 }
        );
      }
    }

    // Determine search parameters
    const searchOrigin = announcement?.pickupLocation?.city || origin.city;
    const searchDestination = announcement?.dropoffLocation?.city || destination.city;
    const searchDate = announcement?.pickupDate || date;
    const searchPackageSize = announcement?.packageSize || packageSize;
    const searchPackageWeight = announcement?.packageWeight || packageWeight;

    // Define a date range (if date is provided)
    let dateStart, dateEnd;
    if (searchDate) {
      const parsedDate = new Date(searchDate);
      dateStart = new Date(parsedDate);
      dateStart.setHours(0, 0, 0, 0);
      
      dateEnd = new Date(parsedDate);
      dateEnd.setHours(23, 59, 59, 999);
    }

    // Build query for finding matching trips
    const whereClause: {
      status: string;
      "startLocation.city": string;
      "endLocation.city": string;
      scheduledDate?: {
        gte: Date;
        lte: Date;
      };
      availableSpace?: {
        gte: number;
      };
      maxWeight?: {
        gte: number;
      };
    } = {
      status: "SCHEDULED",
      "startLocation.city": searchOrigin,
      "endLocation.city": searchDestination,
    };

    // Add date range if provided
    if (dateStart && dateEnd) {
      whereClause.scheduledDate = {
        gte: dateStart,
        lte: dateEnd,
      };
    }

    // Add space requirement based on package size
    if (searchPackageSize) {
      let requiredSpace = 1; // Default for small
      
      switch (searchPackageSize) {
        case "MEDIUM":
          requiredSpace = 2;
          break;
        case "LARGE":
          requiredSpace = 3;
          break;
        case "EXTRA_LARGE":
          requiredSpace = 4;
          break;
      }
      
      whereClause.availableSpace = {
        gte: requiredSpace,
      };
    }

    // Add weight requirement if provided
    if (searchPackageWeight) {
      whereClause.maxWeight = {
        gte: searchPackageWeight,
      };
    }

    // Find matching trips
    const matchingTrips = await prisma.plannedTrip.findMany({
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
      orderBy: [
        {
          scheduledDate: "asc",
        },
        {
          availableSpace: "desc",
        },
      ],
      take: 20, // Limit to top 20 matches
    });

    // Calculate matching score for each trip
    const matchesWithScore = matchingTrips.map(trip => {
      let score = 100; // Start with perfect score
      
      // Reduce score based on date difference (if date is provided)
      if (searchDate && trip.scheduledDate) {
        const requestDate = new Date(searchDate);
        const tripDate = new Date(trip.scheduledDate);
        const dateDiff = Math.abs(tripDate.getTime() - requestDate.getTime());
        const dateDiffHours = dateDiff / (1000 * 60 * 60);
        
        if (dateDiffHours > 0) {
          score -= Math.min(30, dateDiffHours * 2); // Lose up to 30 points for date difference
        }
      }
      
      // Prioritize trips with higher ratings
      if (trip.deliveryPerson.user.rating) {
        const rating = trip.deliveryPerson.user.rating;
        if (rating < 4) {
          score -= (4 - rating) * 10; // Lose points for ratings below 4
        }
      } else {
        score -= 10; // No rating means -10 points
      }
      
      // Urgent deliveries prefer express vehicles
      if (isUrgent && trip.vehicleType !== "CAR" && trip.vehicleType !== "SCOOTER") {
        score -= 15;
      }
      
      return {
        ...trip,
        matchScore: Math.max(0, Math.round(score)),
      };
    });
    
    // Sort by match score
    matchesWithScore.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      data: matchesWithScore,
      meta: {
        totalMatches: matchesWithScore.length,
        searchCriteria: {
          origin: searchOrigin,
          destination: searchDestination,
          date: searchDate,
          packageSize: searchPackageSize,
          packageWeight: searchPackageWeight,
          isUrgent,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error finding matching trips:", error);
    return NextResponse.json(
      { error: "Failed to find matching trips" },
      { status: 500 }
    );
  }
} 