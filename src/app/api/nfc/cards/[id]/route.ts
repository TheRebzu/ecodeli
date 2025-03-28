import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating PATCH request body
const updateCardSchema = z.object({
  isActive: z.boolean().optional(),
  deliveryPersonId: z.string().optional(),
  deactivationDate: z.string().datetime().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins, delivery persons, and merchants can access NFC cards
    if (!["ADMIN", "DELIVERY_PERSON", "MERCHANT"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 }
      );
    }

    const cardId = params.id;

    // Fetch the NFC card
    const card = await prisma.nFCCard.findUnique({
      where: { id: cardId },
      include: {
        deliveryPerson: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "NFC card not found" },
        { status: 404 }
      );
    }

    // If user is a delivery person, check if they have access to this card
    if (
      session.user.role === "DELIVERY_PERSON" &&
      card.deliveryPerson?.user?.id !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Access denied. This card doesn't belong to you." },
        { status: 403 }
      );
    }

    // Fetch recent transactions for this card
    const transactions = await prisma.nFCTransaction.findMany({
      where: { cardNumber: card.cardNumber },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    return NextResponse.json({
      data: {
        ...card,
        transactions,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching NFC card:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFC card" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update NFC cards
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can update NFC cards." },
        { status: 403 }
      );
    }

    const cardId = params.id;

    // Fetch the card to check if it exists
    const existingCard = await prisma.nFCCard.findUnique({
      where: { id: cardId },
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: "NFC card not found" },
        { status: 404 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const validatedData = updateCardSchema.parse(body);

    // If changing delivery person, verify the new one exists
    if (validatedData.deliveryPersonId) {
      const deliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { id: validatedData.deliveryPersonId },
      });

      if (!deliveryPerson) {
        return NextResponse.json(
          { error: "Delivery person not found" },
          { status: 404 }
        );
      }
    }

    // Handle deactivation
    if (
      existingCard.isActive &&
      validatedData.isActive === false &&
      !validatedData.deactivationDate
    ) {
      validatedData.deactivationDate = new Date().toISOString();
    }

    // Update the NFC card
    const updatedCard = await prisma.nFCCard.update({
      where: { id: cardId },
      data: validatedData,
      include: {
        deliveryPerson: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
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
        action: "UPDATE",
        entityType: "NFC_CARD",
        entityId: cardId,
        details: `Updated NFC card with number ${updatedCard.cardNumber}`,
      },
    });

    return NextResponse.json({
      data: updatedCard,
      message: "NFC card updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating NFC card:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update NFC card" },
      { status: 500 }
    );
  }
} 