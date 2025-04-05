import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { AnnouncementService } from "@/lib/services/client/announcement.service";
import { auth } from "@/auth";

// Schema for updating an advertisement
const updateDriverAdSchema = z.object({
  title: z.string().min(3, { message: "Le titre doit contenir au moins 3 caractères" }).optional(),
  description: z.string().min(10, { message: "La description doit contenir au moins 10 caractères" }).optional(),
  vehicleType: z.enum([
    "CAR", "VAN", "TRUCK", "MOTORCYCLE", "BICYCLE", "SCOOTER", "OTHER"
  ]).optional(),
  serviceArea: z.array(z.object({
    id: z.string().optional(), // For updating existing entries
    city: z.string(),
    postalCode: z.string(),
    country: z.string().default("France")
  })).optional(),
  availability: z.array(z.object({
    id: z.string().optional(), // For updating existing entries
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  })).optional(),
  pricing: z.object({
    basePrice: z.number().positive(),
    pricePerKm: z.number().nonnegative(),
    minimumDistance: z.number().nonnegative().default(0),
    specialRates: z.array(z.object({
      conditionType: z.enum(["DISTANCE", "WEIGHT", "SIZE", "TIME", "DAY", "OTHER"]),
      condition: z.string(),
      price: z.number().positive()
    })).optional()
  }).optional(),
  maxDistance: z.number().positive({ message: "La distance maximale doit être positive" }).optional(),
  specializations: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
  contactPreference: z.enum(["EMAIL", "PHONE", "BOTH"]).optional(),
  customContactInfo: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string()
  }).optional()
});

// GET: Retrieve a specific announcement
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const result = await AnnouncementService.getAnnouncementById(
      params.id,
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific announcement
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await AnnouncementService.deleteAnnouncement(
      session.user.id,
      params.id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH: Update a specific announcement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    
    // Ensure the ID in the path is used
    data.id = params.id;

    const result = await AnnouncementService.updateAnnouncement(
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET: Get a specific advertisement
export async function GET_OLD(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Fetch the advertisement with related data
    const advertisement = await prisma.driverAdvertisement.findUnique({
      where: { id },
      include: {
        category: true,
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true
              }
            }
          }
        },
        serviceArea: true,
        availability: true,
        interestedUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        responses: {
          select: {
            id: true,
            message: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Limit the number of responses
        }
      }
    });
    
    if (!advertisement) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }

    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    // Hide sensitive info if not the owner or admin
    if (!session || !session.user || 
        (advertisement.driver.userId !== session.user.id && 
         session.user.role !== "ADMIN")) {
      
      // Remove sensitive information for public view
      const { responses, ...publicData } = advertisement;
      
      // Only include the count of responses for public view
      return NextResponse.json({
        ...publicData,
        responseCount: responses.length
      });
    }
    
    // Return full data to owner or admin
    return NextResponse.json(advertisement);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'annonce:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'annonce" },
      { status: 500 }
    );
  }
}

// PATCH: Update an advertisement
export async function PATCH_OLD(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const id = params.id;
    
    // Get the advertisement to check ownership
    const advertisement = await prisma.driverAdvertisement.findUnique({
      where: { id },
      include: { driver: true }
    });
    
    if (!advertisement) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }
    
    // Check if user is the owner or admin
    const isOwner = advertisement.driver.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
    
    // Parse and validate request
    const body = await req.json();
    const validation = updateDriverAdSchema.safeParse(body);
    
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
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    
    // Add simple fields if provided
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (pricing) updateData.pricing = pricing;
    if (maxDistance) updateData.maxDistance = maxDistance;
    if (specializations) updateData.specializations = specializations;
    if (requirements) updateData.requirements = requirements;
    if (tags) updateData.tags = tags;
    if (status) updateData.status = status;
    if (contactPreference) updateData.contactPreference = contactPreference;
    if (customContactInfo !== undefined) updateData.customContactInfo = customContactInfo;
    if (location) updateData.location = location;
    
    // Handle category connection if provided
    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    }
    
    // Update the advertisement
    await prisma.driverAdvertisement.update({
      where: { id },
      data: updateData
    });
    
    // Handle service areas if provided
    if (serviceArea && serviceArea.length > 0) {
      // Delete existing service areas
      await prisma.adServiceArea.deleteMany({
        where: { advertisementId: id }
      });
      
      // Create new service areas
      await prisma.adServiceArea.createMany({
        data: serviceArea.map(area => ({
          advertisementId: id,
          city: area.city,
          postalCode: area.postalCode,
          country: area.country
        }))
      });
    }
    
    // Handle availability if provided
    if (availability && availability.length > 0) {
      // Delete existing availability slots
      await prisma.adAvailability.deleteMany({
        where: { advertisementId: id }
      });
      
      // Create new availability slots
      await prisma.adAvailability.createMany({
        data: availability.map(slot => ({
          advertisementId: id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      });
    }
    
    // Return updated advertisement with relations
    const fullUpdatedAdvertisement = await prisma.driverAdvertisement.findUnique({
      where: { id },
      include: {
        category: true,
        driver: {
          include: {
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        },
        serviceArea: true,
        availability: true
      }
    });
    
    return NextResponse.json(fullUpdatedAdvertisement);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'annonce:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'annonce" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an advertisement
export async function DELETE_OLD(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const id = params.id;
    
    // Get the advertisement to check ownership
    const advertisement = await prisma.driverAdvertisement.findUnique({
      where: { id },
      include: { driver: true }
    });
    
    if (!advertisement) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }
    
    // Check if user is the owner or admin
    const isOwner = advertisement.driver.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
    
    // Delete related records first
    await Promise.all([
      prisma.adServiceArea.deleteMany({ where: { advertisementId: id } }),
      prisma.adAvailability.deleteMany({ where: { advertisementId: id } }),
      prisma.adResponse.deleteMany({ where: { advertisementId: id } }),
      prisma.interest.deleteMany({ where: { advertisementId: id } })
    ]);
    
    // Delete the advertisement
    await prisma.driverAdvertisement.delete({ where: { id } });
    
    return NextResponse.json({
      message: "Annonce supprimée avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'annonce:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'annonce" },
      { status: 500 }
    );
  }
} 