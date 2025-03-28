import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for nearby search request
const nearbySearchSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().positive().default(10), // Default 10 km
  limit: z.number().positive().default(20),
  vehicleType: z.enum([
    "CAR", "VAN", "TRUCK", "MOTORCYCLE", "BICYCLE", "SCOOTER", "OTHER"
  ]).optional(),
  categoryId: z.string().optional()
});

// Function to calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Type for announcement with distance property
type AnnouncementWithDistance = Awaited<ReturnType<typeof prisma.announcement.findFirst>> & {
  distance: number;
};

interface LocationQuery {
  lat?: string;
  lng?: string;
  radius?: string;
  page?: string;
  limit?: string;
  vehicleType?: string;
}

// GET: Get nearby announcements
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query: LocationQuery = {
      lat: searchParams.get("lat") || undefined,
      lng: searchParams.get("lng") || undefined,
      radius: searchParams.get("radius") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      vehicleType: searchParams.get("vehicleType") || undefined
    };

    // Validate required parameters
    if (!query.lat || !query.lng) {
      return NextResponse.json({ error: "Les paramètres lat et lng sont requis" }, { status: 400 });
    }

    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Coordonnées invalides" }, { status: 400 });
    }

    const radius = query.radius ? parseFloat(query.radius) : 10; // Default 10 km
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const skip = (page - 1) * limit;

    // Build whereClause
    const whereClause: any = {
      status: "ACTIVE",
    };

    if (query.vehicleType) {
      whereClause.vehicleType = query.vehicleType;
    }

    // Find advertisements with service areas near the given coordinates
    const advertisementsWithServiceAreas = await prisma.driverAdvertisement.findMany({
      where: whereClause,
      include: {
        serviceAreas: true,
        availability: true,
        category: true,
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Filter advertisements based on proximity to the given coordinates
    const nearbyAdvertisements = advertisementsWithServiceAreas.filter(ad => {
      return ad.serviceAreas.some(area => {
        if (!area.latitude || !area.longitude) return false;
        
        // Calculate distance between points using the Haversine formula
        const distance = calculateDistance(
          lat,
          lng,
          area.latitude,
          area.longitude
        );
        
        return distance <= radius;
      });
    });

    // Sort by closest service area
    nearbyAdvertisements.sort((a, b) => {
      const aMinDistance = Math.min(
        ...a.serviceAreas
          .filter(area => area.latitude && area.longitude)
          .map(area => calculateDistance(lat, lng, area.latitude!, area.longitude!))
      );
      
      const bMinDistance = Math.min(
        ...b.serviceAreas
          .filter(area => area.latitude && area.longitude)
          .map(area => calculateDistance(lat, lng, area.latitude!, area.longitude!))
      );
      
      return aMinDistance - bMinDistance;
    });

    // Apply pagination
    const paginatedResults = nearbyAdvertisements.slice(skip, skip + limit);
    const totalCount = nearbyAdvertisements.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: paginatedResults,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in nearby search:", error);
    return NextResponse.json(
      { error: "Une erreur s'est produite lors de la recherche" },
      { status: 500 }
    );
  }
}

// POST: Search nearby announcements with more complex filters
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const {
      location,
      radius = 10,
      limit = 20,
      filters = {}
    } = body;

    // Validate location
    if (!location?.latitude || !location?.longitude) {
      return NextResponse.json(
        { error: "Localisation requise (latitude et longitude)" },
        { status: 400 }
      );
    }

    // Build query filters
    const where: {
      status: string;
      vehicleType?: string;
      categoryId?: string;
      pricing?: {
        basePrice?: {
          lte?: number;
          gte?: number;
        };
      };
      tags?: {
        hasSome?: string[];
      };
    } = {
      status: "ACTIVE"
    };

    // Add optional filters
    if (filters.vehicleType) {
      where.vehicleType = filters.vehicleType;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.maxPrice) {
      where.pricing = {
        basePrice: {
          lte: filters.maxPrice
        }
      };
    }

    if (filters.minPrice) {
      where.pricing = {
        ...(where.pricing || {}),
        basePrice: {
          ...(where.pricing?.basePrice || {}),
          gte: filters.minPrice
        }
      };
    }

    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    // Fetch announcements
    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                rating: true
              }
            }
          }
        },
        category: true,
        serviceArea: true,
        _count: {
          select: {
            interestedUsers: true,
            responses: true
          }
        }
      }
    });

    // Calculate distance for each announcement and filter based on radius
    const nearbyAnnouncements = announcements
      .filter((announcement) => {
        if (!announcement.location?.latitude || !announcement.location?.longitude) {
          return false;
        }
        
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          announcement.location.latitude,
          announcement.location.longitude
        );
        
        // Add distance property to the announcement
        (announcement as AnnouncementWithDistance).distance = distance;
        
        // Filter based on radius and announcement's maxDistance
        return (
          distance <= radius && 
          (announcement.maxDistance ? distance <= announcement.maxDistance : true)
        );
      })
      .sort((a, b) => {
        // Sort by distance by default, but could be modified based on filters.sortBy
        if (filters.sortBy === "price") {
          return (a.pricing?.basePrice || 0) - (b.pricing?.basePrice || 0);
        } else if (filters.sortBy === "rating") {
          return ((b.driver.user.rating || 0) - (a.driver.user.rating || 0));
        }
        return (a as AnnouncementWithDistance).distance - (b as AnnouncementWithDistance).distance;
      })
      .slice(0, limit);

    return NextResponse.json({
      data: nearbyAnnouncements,
      meta: {
        count: nearbyAnnouncements.length,
        radius,
        location,
        filters
      }
    });
  } catch (error) {
    console.error("Erreur lors de la recherche d'annonces à proximité:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche d'annonces à proximité" },
      { status: 500 }
    );
  }
} 