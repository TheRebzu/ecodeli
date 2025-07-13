import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

const scheduleQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  week: z
    .string()
    .regex(/^\d{4}-W\d{2}$/)
    .optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

const createOrderSchema = z.object({
  clientId: z.string(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
    }),
  ),
  deliveryAddress: z.string().min(10),
  deliveryZone: z.string().min(5).max(5), // Code postal
  scheduledDate: z.string().datetime(),
  notes: z.string().optional(),
});

/**
 * GET - Récupérer la planification cart-drop
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un commerçant
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        cartDropConfig: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 },
      );
    }

    if (!merchant.cartDropConfig || !merchant.cartDropConfig.isActive) {
      return NextResponse.json(
        {
          error: "Service cart-drop non configuré ou inactif",
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const queryData = scheduleQuerySchema.parse({
      date: searchParams.get("date") || undefined,
      week: searchParams.get("week") || undefined,
      month: searchParams.get("month") || undefined,
    });

    let startDate = new Date();
    let endDate = addDays(new Date(), 7);

    // Déterminer la période selon les paramètres
    if (queryData.date) {
      startDate = startOfDay(new Date(queryData.date));
      endDate = endOfDay(new Date(queryData.date));
    } else if (queryData.week) {
      // Format YYYY-WXX
      const [year, week] = queryData.week.split("-W").map(Number);
      startDate = new Date(year, 0, 1 + (week - 1) * 7);
      endDate = addDays(startDate, 6);
    } else if (queryData.month) {
      // Format YYYY-MM
      const [year, month] = queryData.month.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }

    // Récupérer les commandes pour la période
    const orders = await db.order.findMany({
      where: {
        merchantId: merchant.id,
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        items: true,
        payment: {
          select: {
            status: true,
            amount: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
    });

    // Grouper par créneaux horaires
    const schedule = merchant.cartDropConfig.timeSlots.map((slot: any) => {
      const slotOrders = orders.filter((order) => {
        const orderDate = new Date(order.scheduledDate);
        const orderHour = orderDate.getHours();
        const orderMinute = orderDate.getMinutes();
        const orderTime = `${orderHour.toString().padStart(2, "0")}:${orderMinute.toString().padStart(2, "0")}`;

        return (
          orderDate.getDay() === slot.day &&
          orderTime >= slot.startTime &&
          orderTime <= slot.endTime
        );
      });

      return {
        ...slot,
        dayName: [
          "Dimanche",
          "Lundi",
          "Mardi",
          "Mercredi",
          "Jeudi",
          "Vendredi",
          "Samedi",
        ][slot.day],
        ordersCount: slotOrders.length,
        availableSlots:
          merchant.cartDropConfig.maxOrdersPerSlot - slotOrders.length,
        orders: slotOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          client: {
            name: `${order.client.profile?.firstName || ""} ${order.client.profile?.lastName || ""}`.trim(),
            phone: order.client.profile?.phone,
          },
          itemsCount: order.items.length,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          scheduledDate: order.scheduledDate,
          status: order.status,
          paymentStatus: order.payment?.status,
        })),
      };
    });

    // Statistiques globales
    const stats = {
      totalOrders: orders.length,
      confirmedOrders: orders.filter((o) => o.status === "CONFIRMED").length,
      pendingOrders: orders.filter((o) => o.status === "PENDING").length,
      completedOrders: orders.filter((o) => o.status === "COMPLETED").length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      avgOrderValue:
        orders.length > 0
          ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      schedule,
      stats,
      config: {
        isActive: merchant.cartDropConfig.isActive,
        maxOrdersPerSlot: merchant.cartDropConfig.maxOrdersPerSlot,
        deliveryZones: merchant.cartDropConfig.deliveryZones,
      },
    });
  } catch (error) {
    console.error("Error fetching cart-drop schedule:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres de requête invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST - Créer une nouvelle commande cart-drop
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const orderData = createOrderSchema.parse(body);

    // Vérifier que l'utilisateur est un commerçant
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        cartDropConfig: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 },
      );
    }

    if (!merchant.cartDropConfig || !merchant.cartDropConfig.isActive) {
      return NextResponse.json(
        {
          error: "Service cart-drop non configuré ou inactif",
        },
        { status: 400 },
      );
    }

    // Vérifier que la zone de livraison est autorisée
    const zone = merchant.cartDropConfig.deliveryZones.find(
      (z: any) => z.postalCode === orderData.deliveryZone,
    );

    if (!zone) {
      return NextResponse.json(
        {
          error: "Zone de livraison non autorisée",
        },
        { status: 400 },
      );
    }

    // Vérifier la disponibilité du créneau
    const scheduledDate = new Date(orderData.scheduledDate);
    const dayOfWeek = scheduledDate.getDay();
    const timeString = format(scheduledDate, "HH:mm");

    const availableSlot = merchant.cartDropConfig.timeSlots.find(
      (slot: any) =>
        slot.day === dayOfWeek &&
        timeString >= slot.startTime &&
        timeString <= slot.endTime &&
        slot.isActive,
    );

    if (!availableSlot) {
      return NextResponse.json(
        {
          error: "Créneau horaire non disponible",
        },
        { status: 400 },
      );
    }

    // Vérifier la capacité du créneau
    const existingOrders = await db.order.count({
      where: {
        merchantId: merchant.id,
        scheduledDate: {
          gte: startOfDay(scheduledDate),
          lte: endOfDay(scheduledDate),
        },
      },
    });

    if (existingOrders >= merchant.cartDropConfig.maxOrdersPerSlot) {
      return NextResponse.json(
        {
          error: "Créneau complet, veuillez choisir un autre horaire",
        },
        { status: 400 },
      );
    }

    // Calculer les montants
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const deliveryFee = zone.deliveryFee;
    const totalAmount = subtotal + deliveryFee;

    // Générer un numéro de commande unique
    const orderNumber = `CD-${merchant.id.slice(-6)}-${Date.now()}`;

    // Créer la commande avec les articles
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          merchantId: merchant.id,
          clientId: orderData.clientId,
          orderNumber,
          status: "PENDING",
          totalAmount,
          deliveryFee,
          deliveryAddress: orderData.deliveryAddress,
          scheduledDate,
          notes: orderData.notes,
        },
      });

      // Créer les articles de la commande
      await tx.orderItem.createMany({
        data: orderData.items.map((item) => ({
          orderId: newOrder.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      });

      return newOrder;
    });

    // Notification au client (si nous avons l'info)
    try {
      await db.notification.create({
        data: {
          userId: orderData.clientId,
          type: "ORDER",
          title: "Commande cart-drop confirmée",
          message: `Votre commande ${orderNumber} est programmée pour le ${format(scheduledDate, "dd/MM/yyyy à HH:mm", { locale: fr })}`,
          priority: "HIGH",
        },
      });
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
      // Ne pas faire échouer la commande pour un problème de notification
    }

    return NextResponse.json(
      {
        success: true,
        message: "Commande cart-drop créée avec succès",
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          deliveryFee: order.deliveryFee,
          scheduledDate: order.scheduledDate,
          status: order.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating cart-drop order:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données de commande invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
