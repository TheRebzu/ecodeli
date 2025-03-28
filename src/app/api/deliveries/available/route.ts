import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // This endpoint is primarily for delivery persons
    if (session.user.role !== "DELIVERY_PERSON" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    // Get location parameters for proximity filtering
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseInt(searchParams.get("radius") || "25"); // Default 25km radius
    
    // Basic query for available deliveries (not yet assigned)
    const baseQuery = {
      status: "PENDING",
      deliveryPersonId: null,
    };

    // Get delivery person service areas and specializations if the user is a delivery person
    let deliveryPersonData = null;
    if (session.user.role === "DELIVERY_PERSON") {
      deliveryPersonData = await prisma.deliveryPerson.findUnique({
        where: { userId: session.user.id },
        include: {
          serviceAreas: true
        }
      });
      
      if (!deliveryPersonData) {
        return NextResponse.json({ error: "Profil livreur non trouvé" }, { status: 404 });
      }
    }
    
    // Extend query with service areas if applicable
    const query = { ...baseQuery };
    
    // Filter by service areas if delivery person has defined areas and no specific location is provided
    if (deliveryPersonData && deliveryPersonData.serviceAreas.length > 0 && (!lat || !lng)) {
      // Create a list of postal codes from service areas
      const postalCodes = deliveryPersonData.serviceAreas.map(area => area.postalCode);
      
      // We use destination postal code for filtering
      query.OR = [
        { destination: { contains: postalCodes[0] } },
        ...postalCodes.slice(1).map(code => ({ destination: { contains: code } }))
      ];
    }
    
    // Get available deliveries
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where: query,
        include: {
          customer: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true
                }
              }
            }
          },
          merchant: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: [
          { isExpress: 'desc' },
          { createdAt: 'asc' }
        ],
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where: query })
    ]);
    
    // If location coordinates are provided, calculate distance and sort by proximity
    let enrichedDeliveries = deliveries;
    if (lat && lng && lat !== 0 && lng !== 0) {
      // In a real application, you would use geocoding and distance calculation here
      // For now, we'll just add a dummy distance field
      enrichedDeliveries = deliveries.map(delivery => ({
        ...delivery,
        distance: Math.random() * radius, // This is just a placeholder
      }));
      
      // Sort by distance
      enrichedDeliveries.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return NextResponse.json({
      deliveries: enrichedDeliveries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des livraisons disponibles:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des livraisons disponibles" },
      { status: 500 }
    );
  }
} 