import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { client: true },
    });

    if (!user?.client) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const type = searchParams.get("type");
    const read = searchParams.get("read");

    const where: any = { userId: session.user.id };

    if (type && type !== "all") {
      where.type = type;
    }

    if (read === "true") {
      where.readAt = { not: null };
    } else if (read === "false") {
      where.readAt = null;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        delivery: {
          select: {
            id: true,
            announcement: {
              select: { title: true },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    const unreadCount = await db.notification.count({
      where: {
        userId: session.user.id,
        readAt: null,
      },
    });

    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        isRead: !!notification.readAt,
        createdAt: notification.createdAt.toISOString(),
        expiresAt: notification.expiresAt?.toISOString(),
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        metadata: {
          deliveryId: notification.delivery?.id,
          announcementId: notification.delivery?.announcement?.title,
          paymentId: notification.payment?.id,
          amount: notification.payment?.amount,
        },
      })),
      unreadCount,
      pagination: {
        page,
        limit,
        total: await db.notification.count({ where }),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des notifications" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      message,
      priority = "normal",
      actionUrl,
      actionLabel,
      expiresAt,
    } = body;

    const notification = await db.notification.create({
      data: {
        userId: session.user.id,
        type,
        title,
        message,
        priority,
        actionUrl,
        actionLabel,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(
      {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          isRead: false,
          createdAt: notification.createdAt.toISOString(),
          expiresAt: notification.expiresAt?.toISOString(),
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la notification" },
      { status: 500 },
    );
  }
}
