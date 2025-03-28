import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a response
const createResponseSchema = z.object({
  message: z.string().min(1, { message: "Le message ne peut pas être vide" }).max(1000, { message: "Le message ne peut pas dépasser 1000 caractères" }),
  phoneNumber: z.string().optional(),
  preferredContactMethod: z.enum(["EMAIL", "PHONE"]).optional(),
  details: z.object({
    pickupLocation: z.string().optional(),
    deliveryLocation: z.string().optional(),
    packageDetails: z.string().optional(),
    scheduledDate: z.string().optional(),
    additionalInformation: z.string().optional()
  }).optional()
});

// Schema for updating a response
const updateResponseSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]),
  message: z.string().optional()
});

// POST: Create a response to an advertisement
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const advertisementId = params.id;
    
    // Check if advertisement exists
    const advertisement = await prisma.driverAdvertisement.findUnique({
      where: { id: advertisementId },
      include: { driver: true }
    });
    
    if (!advertisement) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }
    
    // Check if advertisement is active
    if (advertisement.status !== "ACTIVE") {
      return NextResponse.json({ error: "Cette annonce n'est pas active" }, { status: 400 });
    }
    
    // Ensure user is not the driver of the advertisement
    if (advertisement.driver.userId === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas répondre à votre propre annonce" }, { status: 400 });
    }
    
    // Find user's customer profile
    const customerProfile = await prisma.customer.findFirst({
      where: { userId: session.user.id }
    });
    
    if (!customerProfile) {
      return NextResponse.json({ error: "Profil client non trouvé" }, { status: 400 });
    }
    
    // Parse and validate request
    const body = await req.json();
    const validation = createResponseSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { message, phoneNumber, preferredContactMethod, details } = validation.data;
    
    // Check if user already responded to this advertisement
    const existingResponse = await prisma.adResponse.findFirst({
      where: {
        advertisementId,
        customerId: customerProfile.id
      }
    });
    
    if (existingResponse) {
      return NextResponse.json({ error: "Vous avez déjà répondu à cette annonce" }, { status: 400 });
    }
    
    // Create the response
    const response = await prisma.adResponse.create({
      data: {
        message,
        phoneNumber,
        preferredContactMethod,
        details,
        status: "PENDING",
        advertisement: { connect: { id: advertisementId } },
        customer: { connect: { id: customerProfile.id } }
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });
    
    // Optionally, send notification to the driver (would be implemented elsewhere)
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la réponse:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la réponse" },
      { status: 500 }
    );
  }
}

// GET: Get all responses for an advertisement (only for the owner or admin)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const advertisementId = params.id;
    
    // Get the advertisement to check ownership
    const advertisement = await prisma.driverAdvertisement.findUnique({
      where: { id: advertisementId },
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
    
    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || undefined;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build query filters
    const whereClause: {
      advertisementId: string;
      status?: string;
    } = { advertisementId };
    if (status) {
      whereClause.status = status;
    }
    
    // Get responses with pagination
    const [responses, totalCount] = await Promise.all([
      prisma.adResponse.findMany({
        where: whereClause,
        include: {
          customer: {
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
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.adResponse.count({ where: whereClause })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      data: responses,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des réponses:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des réponses" },
      { status: 500 }
    );
  }
}

// PATCH: Update response status (for driver/admin to accept or reject, or for customer to cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const advertisementId = params.id;
    
    // Parse response ID from query params
    const { searchParams } = new URL(req.url);
    const responseId = searchParams.get("responseId");
    
    if (!responseId) {
      return NextResponse.json({ error: "ID de réponse requis" }, { status: 400 });
    }
    
    // Get the response with related data
    const response = await prisma.adResponse.findUnique({
      where: { id: responseId },
      include: {
        advertisement: {
          include: { driver: true }
        },
        customer: true
      }
    });
    
    if (!response || response.advertisementId !== advertisementId) {
      return NextResponse.json({ error: "Réponse non trouvée" }, { status: 404 });
    }
    
    // Check authorization
    const isDriver = response.advertisement.driver.userId === session.user.id;
    const isCustomer = response.customer.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    
    if (!isDriver && !isCustomer && !isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
    
    // Parse and validate request
    const body = await req.json();
    const validation = updateResponseSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { status, message } = validation.data;
    
    // Check if the user has permission to update to this status
    // Customers can only CANCEL
    // Drivers can ACCEPT or REJECT
    if (isCustomer && status !== "CANCELLED") {
      return NextResponse.json({
        error: "Vous pouvez seulement annuler votre propre réponse"
      }, { status: 403 });
    }
    
    if (isDriver && !["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({
        error: "Vous pouvez seulement accepter ou rejeter une réponse"
      }, { status: 403 });
    }
    
    // Update the response
    const updateData: {
      status: string;
      message?: string;
    } = { status };
    if (message) updateData.message = message;
    
    const updatedResponse = await prisma.adResponse.update({
      where: { id: responseId },
      data: updateData,
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        advertisement: {
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Optionally, send notification based on status change (would be implemented elsewhere)
    
    return NextResponse.json(updatedResponse);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la réponse:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la réponse" },
      { status: 500 }
    );
  }
} 