import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier que l'annonce existe
    const existingAnnouncement = await db.announcement.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      basePrice,
      pickupAddress,
      deliveryAddress,
      pickupDate,
      deliveryDate,
      isUrgent,
      isFlexibleDate,
      preferredTimeSlot,
      specialInstructions,
      internalNotes,
    } = body;

    const updatedAnnouncement = await db.announcement.update({
      where: { id },
      data: {
        title,
        description,
        type,
        basePrice: parseFloat(basePrice),
        pickupAddress,
        deliveryAddress,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        isUrgent: isUrgent || false,
        isFlexibleDate: isFlexibleDate || false,
        preferredTimeSlot,
        specialInstructions,
        internalNotes,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Announcement updated successfully",
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier que l'annonce existe
    const announcement = await db.announcement.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 },
      );
    }

    // Supprimer l'annonce (cascade automatique via Prisma)
    await db.announcement.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
