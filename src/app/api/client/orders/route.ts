import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { OrderManagementService } from "@/features/orders/services/order-management.service";

const createDeliveryOrderSchema = z.object({
  announcementId: z.string(),
  notes: z.string().optional(),
});

const createServiceOrderSchema = z.object({
  serviceId: z.string(),
  scheduledDate: z.string().transform((str) => new Date(str)),
  duration: z.number().min(15).max(480), // 15 minutes à 8 heures
  location: z.string(),
  notes: z.string().optional(),
});

const updateOrderSchema = z.object({
  orderId: z.string(),
  type: z.enum(["DELIVERY", "SERVICE"]),
  status: z.string(),
  reason: z.string().optional(),
  message: z.string().optional(),
});

const orderFiltersSchema = z.object({
  type: z.enum(["DELIVERY", "SERVICE"]).optional(),
  status: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET - Récupérer les commandes du client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = orderFiltersSchema.parse({
      type: searchParams.get("type"),
      status: searchParams.get("status"),
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
    });

    const orders = await OrderManagementService.getClientOrders(
      client.id,
      filters,
    );

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error getting client orders:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 },
    );
  }
}

/**
 * POST - Créer une nouvelle commande
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const orderType = searchParams.get("type");
    const body = await request.json();

    let order;

    switch (orderType) {
      case "delivery":
        // Créer une commande de livraison
        const deliveryData = createDeliveryOrderSchema.parse(body);
        order = await OrderManagementService.createDeliveryOrder({
          ...deliveryData,
          clientId: client.id,
        });
        break;

      case "service":
        // Créer une commande de service
        const serviceData = createServiceOrderSchema.parse(body);
        order = await OrderManagementService.createServiceOrder({
          ...serviceData,
          clientId: client.id,
        });
        break;

      default:
        return NextResponse.json(
          { error: "Type de commande non spécifié (delivery ou service)" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: "Commande créée avec succès",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Mettre à jour une commande
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client non trouvé" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { orderId, type, status, reason, message } =
      updateOrderSchema.parse(body);

    // Vérifier que la commande appartient au client
    if (type === "DELIVERY") {
      const delivery = await prisma.delivery.findFirst({
        where: { id: orderId, clientId: client.id },
      });
      if (!delivery) {
        return NextResponse.json(
          { error: "Livraison non trouvée" },
          { status: 404 },
        );
      }
    } else {
      const booking = await prisma.booking.findFirst({
        where: { id: orderId, clientId: client.id },
      });
      if (!booking) {
        return NextResponse.json(
          { error: "Réservation non trouvée" },
          { status: 404 },
        );
      }
    }

    // Mettre à jour le statut
    await OrderManagementService.updateOrderStatus(orderId, type, status, {
      reason,
      message,
    });

    return NextResponse.json({
      success: true,
      message: "Commande mise à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating order:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la commande" },
      { status: 500 },
    );
  }
}
