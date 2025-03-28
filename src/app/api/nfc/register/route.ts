import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating the request body
const registerCardSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required"),
  deliveryPersonId: z.string().min(1, "Delivery person ID is required"),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can register new NFC cards
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can register new cards." },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const validatedData = registerCardSchema.parse(body);

    // Check if the card number already exists
    const existingCard = await prisma.nFCCard.findUnique({
      where: { cardNumber: validatedData.cardNumber },
    });

    if (existingCard) {
      return NextResponse.json(
        { error: "A card with this number already exists" },
        { status: 409 }
      );
    }

    // Check if the delivery person exists
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: validatedData.deliveryPersonId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Delivery person not found" },
        { status: 404 }
      );
    }

    // Create the new NFC card
    const card = await prisma.nFCCard.create({
      data: {
        cardNumber: validatedData.cardNumber,
        isActive: validatedData.isActive,
        activationDate: new Date(),
        deliveryPersonId: validatedData.deliveryPersonId,
      },
      include: {
        deliveryPerson: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "NFC_CARD",
        entityId: card.id,
        details: `Registered NFC card ${card.cardNumber} for delivery person ${deliveryPerson.user.name}`,
      },
    });

    // Create a notification for the delivery person
    await prisma.notification.create({
      data: {
        userId: deliveryPerson.userId,
        title: "New NFC Card Registered",
        message: `A new NFC card has been registered to your account with number: ${card.cardNumber}`,
        type: "INFO",
        actionUrl: "/dashboard/cards",
      },
    });

    return NextResponse.json({
      data: card,
      message: "NFC card registered successfully",
    });
  } catch (error: unknown) {
    console.error("Error registering NFC card:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to register NFC card" },
      { status: 500 }
    );
  }
} 