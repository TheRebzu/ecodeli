import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a delivery issue
const createIssueSchema = z.object({
  type: z.enum([
    "ADDRESS_ISSUE", 
    "DAMAGED_PACKAGE", 
    "RECIPIENT_UNAVAILABLE", 
    "WRONG_ITEM",
    "LOST_PACKAGE",
    "DELAYED_DELIVERY",
    "OTHER"
  ]),
  description: z.string().min(1, { message: "Description requise" }),
  location: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  photos: z.array(z.string()).optional(), // Array of Base64 encoded photos or URLs
});

// GET: Get issues for a delivery
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = params.id;
    
    // Check if the delivery exists and get authorization info
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        merchant: true,
        deliveryPerson: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    // Verify user authorization - only involved parties or admin can view issues
    const userId = session.user.id;
    const isAuthorized =
      session.user.role === "ADMIN" ||
      (delivery.customer?.userId === userId) ||
      (delivery.merchant?.userId === userId) ||
      (delivery.deliveryPerson?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Get issues with related information
    const issues = await prisma.deliveryIssue.findMany({
      where: { deliveryId: id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("Erreur lors de la récupération des problèmes de livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des problèmes de livraison" },
      { status: 500 }
    );
  }
}

// POST: Create a new issue for a delivery
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = params.id;
    
    // Check if the delivery exists and get authorization info
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        merchant: true,
        deliveryPerson: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    // Verify user authorization - only involved parties or admin can report issues
    const userId = session.user.id;
    const isAuthorized =
      session.user.role === "ADMIN" ||
      (delivery.customer?.userId === userId) ||
      (delivery.merchant?.userId === userId) ||
      (delivery.deliveryPerson?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const validation = createIssueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, description, location, severity, photos } = validation.data;

    // Create the issue
    const issue = await prisma.deliveryIssue.create({
      data: {
        deliveryId: id,
        type,
        description,
        location: location || "",
        severity,
        status: "OPEN",
        reporterId: userId,
        photos: photos || []
      }
    });

    // Add a tracking update to reflect the issue
    await prisma.trackingUpdate.create({
      data: {
        deliveryId: id,
        status: delivery.status,
        location: location || "",
        description: `Problème signalé: ${description}`,
        timestamp: new Date()
      }
    });

    // If issue is critical or high severity, mark delivery as failed if in progress
    if (
      (severity === "CRITICAL" || severity === "HIGH") &&
      ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(delivery.status)
    ) {
      await prisma.delivery.update({
        where: { id },
        data: {
          status: "FAILED",
          trackingUpdates: {
            create: {
              status: "FAILED",
              description: `Livraison échouée - ${type}: ${description}`,
              timestamp: new Date()
            }
          }
        }
      });
    }

    // Notify all involved parties about the issue
    const notificationRecipients = [];
    
    // Always notify admin
    const admins = await prisma.admin.findMany({
      select: { userId: true }
    });
    
    notificationRecipients.push(
      ...admins.map(admin => admin.userId),
      // Include other involved parties (except the reporter)
      ...[
        delivery.customer?.userId,
        delivery.merchant?.userId,
        delivery.deliveryPerson?.userId
      ].filter(id => id && id !== userId)
    );
    
    // Create notifications
    for (const recipientId of notificationRecipients) {
      if (recipientId) {
        await prisma.notification.create({
          data: {
            userId: recipientId,
            type: "DELIVERY_ISSUE",
            title: `Problème de livraison - ${severity}`,
            content: `Problème signalé pour la livraison #${delivery.trackingNumber}: ${description}`,
            isRead: false,
            metadata: { deliveryId: id, issueId: issue.id }
          }
        });
      }
    }

    return NextResponse.json({
      message: "Problème signalé avec succès",
      issue
    });
  } catch (error) {
    console.error("Erreur lors du signalement du problème:", error);
    return NextResponse.json(
      { error: "Erreur lors du signalement du problème" },
      { status: 500 }
    );
  }
} 