import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for driver advertisement creation
const createDriverAdSchema = z.object({
  title: z.string().min(3, { message: "Le titre doit contenir au moins 3 caractères" }),
  description: z.string().min(10, { message: "La description doit contenir au moins 10 caractères" }),
  vehicleType: z.enum([
    "CAR", "VAN", "TRUCK", "MOTORCYCLE", "BICYCLE", "SCOOTER", "OTHER"
  ]),
  serviceArea: z.array(z.object({
    city: z.string(),
    postalCode: z.string(),
    country: z.string().default("France")
  })).min(1, { message: "Au moins une zone de service est requise" }),
  availability: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  })).min(1, { message: "Au moins une plage de disponibilité est requise" }),
  pricing: z.object({
    basePrice: z.number().positive(),
    pricePerKm: z.number().nonnegative(),
    minimumDistance: z.number().nonnegative().default(0),
    specialRates: z.array(z.object({
      conditionType: z.enum(["DISTANCE", "WEIGHT", "SIZE", "TIME", "DAY", "OTHER"]),
      condition: z.string(),
      price: z.number().positive()
    })).optional()
  }),
  maxDistance: z.number().positive({ message: "La distance maximale doit être positive" }),
  specializations: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).default("ACTIVE"),
  contactPreference: z.enum(["EMAIL", "PHONE", "BOTH"]).default("BOTH"),
  customContactInfo: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string()
  })
});

// GET: List advertisements
export async function GET(req: NextRequest) {
  try {
    // Public endpoint: no authentication required for basic listing
    const { searchParams } = new URL(req.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const vehicleType = searchParams.get("vehicleType");
    const city = searchParams.get("city");
    const postalCode = searchParams.get("postalCode");
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status") || "ACTIVE"; // Default to active listings
    
    // Build query
    const query: {
      status: string;
      vehicleType?: string;
      categoryId?: string;
      serviceArea?: {
        some: {
          city?: string;
          postalCode?: string;
        };
      };
    } = {
      status,
      ...(vehicleType && { vehicleType }),
      ...(categoryId && { categoryId })
    };
    
    // If city or postal code is provided, filter by service area
    if (city || postalCode) {
      query.serviceArea = {
        some: {
          ...(city && { city }),
          ...(postalCode && { postalCode })
        }
      };
    }
    
    // Fetch and count advertisements
    const [advertisements, total] = await Promise.all([
      prisma.driverAdvertisement.findMany({
        where: query,
        include: {
          category: true,
          driver: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          serviceArea: true,
          availability: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.driverAdvertisement.count({ where: query })
    ]);
    
    // Format response with pagination
    return NextResponse.json({
      advertisements,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des annonces:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des annonces" },
      { status: 500 }
    );
  }
}

// POST: Create a new advertisement
export async function POST(req: NextRequest) {
  try {
    // Authentication required for creating
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Only drivers can create advertisements
    if (session.user.role !== "DELIVERY_PERSON" && session.user.role !== "ADMIN") {
      return NextResponse.json({ 
        error: "Seuls les livreurs peuvent créer des annonces" 
      }, { status: 403 });
    }
    
    // Parse and validate request
    const body = await req.json();
    const validation = createDriverAdSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const {
      title,
      description,
      vehicleType,
      serviceArea,
      availability,
      pricing,
      maxDistance,
      specializations,
      requirements,
      categoryId,
      tags,
      status,
      contactPreference,
      customContactInfo,
      location
    } = validation.data;
    
    // Get driver profile from user
    const driverId = await prisma.deliveryPerson.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    if (!driverId && session.user.role !== "ADMIN") {
      return NextResponse.json({ 
        error: "Profil de livreur non trouvé" 
      }, { status: 404 });
    }
    
    // Create advertisement
    const advertisement = await prisma.driverAdvertisement.create({
      data: {
        title,
        description,
        vehicleType,
        pricing,
        maxDistance,
        specializations: specializations || [],
        requirements: requirements || [],
        tags: tags || [],
        status,
        contactPreference,
        customContactInfo,
        location,
        driver: {
          connect: { id: driverId?.id }
        },
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        // Create service areas
        serviceArea: {
          createMany: {
            data: serviceArea.map(area => ({
              city: area.city,
              postalCode: area.postalCode,
              country: area.country
            }))
          }
        },
        // Create availability slots
        availability: {
          createMany: {
            data: availability.map(slot => ({
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime
            }))
          }
        }
      }
    });
    
    return NextResponse.json(advertisement, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'annonce:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'annonce" },
      { status: 500 }
    );
  }
} 