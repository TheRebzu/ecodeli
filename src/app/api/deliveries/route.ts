import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for delivery creation
const createDeliverySchema = z.object({
  origin: z.string().min(1, { message: "Adresse d'origine requise" }),
  destination: z.string().min(1, { message: "Adresse de destination requise" }),
  recipientName: z.string().min(1, { message: "Nom du destinataire requis" }),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().positive(),
    weight: z.number().positive().optional(),
    dimensions: z.string().optional(),
  })).min(1, { message: "Au moins un article requis" }),
  packageSize: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
  packageWeight: z.number().positive(),
  deliveryInstructions: z.string().optional(),
  requestedDeliveryDate: z.string().optional(), // Expected format: ISO string
  isExpress: z.boolean().default(false),
  isFragile: z.boolean().default(false),
  merchantId: z.string().optional(),
});

// GET: List deliveries
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query: any = {};
    const userId = session.user.id;

    if (session.user.role === "CUSTOMER") {
      // Customers can only see their own deliveries
      const customer = await prisma.customer.findUnique({
        where: { userId }
      });
      
      if (!customer) {
        return NextResponse.json({ error: "Profil client non trouvé" }, { status: 404 });
      }
      
      query.customerId = customer.id;
    } else if (session.user.role === "MERCHANT") {
      // Merchants can only see deliveries related to them
      const merchant = await prisma.merchant.findUnique({
        where: { userId }
      });
      
      if (!merchant) {
        return NextResponse.json({ error: "Profil commerçant non trouvé" }, { status: 404 });
      }
      
      query.merchantId = merchant.id;
    } else if (session.user.role === "DELIVERY_PERSON") {
      // Delivery persons can see deliveries assigned to them
      const deliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { userId }
      });
      
      if (!deliveryPerson) {
        return NextResponse.json({ error: "Profil livreur non trouvé" }, { status: 404 });
      }
      
      query.deliveryPersonId = deliveryPerson.id;
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where: query,
        include: {
          customer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          },
          merchant: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          },
          deliveryPerson: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          },
          trackingUpdates: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 5
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where: query })
    ]);

    return NextResponse.json({
      deliveries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des livraisons:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des livraisons" },
      { status: 500 }
    );
  }
}

// POST: Create a new delivery
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createDeliverySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      origin,
      destination,
      recipientName,
      recipientPhone,
      recipientEmail,
      items,
      packageSize,
      packageWeight,
      deliveryInstructions,
      requestedDeliveryDate,
      isExpress,
      isFragile,
      merchantId,
    } = validation.data;

    // Determine the customer ID based on the current user
    let customerId;
    
    if (session.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!customer) {
        return NextResponse.json({ error: "Profil client non trouvé" }, { status: 404 });
      }
      
      customerId = customer.id;
    } else if (session.user.role === "MERCHANT" && !merchantId) {
      // If user is a merchant and no merchantId was provided, use their own
      const merchant = await prisma.merchant.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!merchant) {
        return NextResponse.json({ error: "Profil commerçant non trouvé" }, { status: 404 });
      }
    } else if (session.user.role !== "ADMIN" && !customerId) {
      return NextResponse.json(
        { error: "ID client requis pour créer une livraison" },
        { status: 400 }
      );
    }

    // Generate tracking number
    const trackingNumber = generateTrackingNumber();

    // Calculate estimated delivery date if not provided
    const estimatedDeliveryDate = requestedDeliveryDate 
      ? new Date(requestedDeliveryDate)
      : calculateEstimatedDeliveryDate(isExpress);

    // Calculate price based on package size, weight, and express option
    const price = calculateDeliveryPrice(packageSize, packageWeight, isExpress);
    
    // Create the delivery
    const delivery = await prisma.delivery.create({
      data: {
        origin,
        destination,
        recipientName,
        recipientPhone: recipientPhone || null,
        recipientEmail: recipientEmail || null,
        packageDetails: {
          items,
          packageSize,
          packageWeight,
          isFragile
        },
        deliveryInstructions: deliveryInstructions || null,
        estimatedDeliveryDate,
        isExpress,
        status: "PENDING",
        trackingNumber,
        price,
        customer: { 
          connect: { id: customerId } 
        },
        ...(merchantId && { merchant: { connect: { id: merchantId } } }),
        trackingUpdates: {
          create: {
            status: "PENDING",
            location: origin,
            description: "Livraison créée",
            timestamp: new Date(),
          }
        }
      }
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la livraison" },
      { status: 500 }
    );
  }
}

// Helper function to generate a tracking number
function generateTrackingNumber() {
  const prefix = "ECO";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
}

// Helper function to calculate estimated delivery date
function calculateEstimatedDeliveryDate(isExpress: boolean) {
  const date = new Date();
  // Add days based on express or standard delivery
  date.setDate(date.getDate() + (isExpress ? 1 : 3));
  return date;
}

// Helper function to calculate delivery price
function calculateDeliveryPrice(packageSize: string, weight: number, isExpress: boolean) {
  let basePrice = 0;
  
  // Base price according to package size
  switch (packageSize) {
    case "SMALL":
      basePrice = 5.99;
      break;
    case "MEDIUM":
      basePrice = 8.99;
      break;
    case "LARGE":
      basePrice = 12.99;
      break;
    case "EXTRA_LARGE":
      basePrice = 19.99;
      break;
    default:
      basePrice = 8.99;
  }
  
  // Add weight factor
  const weightFactor = Math.max(1, Math.ceil(weight / 5));
  const weightPrice = basePrice * 0.1 * (weightFactor - 1);
  
  // Express delivery adds 50% to the price
  const expressMultiplier = isExpress ? 1.5 : 1;
  
  return Number(((basePrice + weightPrice) * expressMultiplier).toFixed(2));
} 