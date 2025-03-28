import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { NotificationType } from "@prisma/client";

// Schema for reserve box request
const reserveBoxSchema = z.object({
  boxId: z.string(),
  startDate: z.string(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  duration: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
  notes: z.string().optional(),
  deliveryId: z.string().optional(),
  generateAccessCode: z.boolean().optional().default(true),
});

// POST: Reserve a storage box
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = reserveBoxSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const {
      boxId,
      startDate,
      endDate,
      duration,
      notes,
      deliveryId,
      generateAccessCode,
    } = validatedBody.data;

    // Check if the box exists and is available
    const box = await prisma.storageBox.findUnique({
      where: {
        id: boxId,
        isOccupied: false,
      },
      include: {
        warehouse: true,
      },
    });

    if (!box) {
      return NextResponse.json(
        { error: "Storage box not found or already occupied" },
        { status: 404 }
      );
    }

    // Get customer ID from user
    const customer = await prisma.customer.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    // Calculate end date if not provided based on duration
    const calculatedEndDate = endDate ? new Date(endDate) : new Date(startDate);
    if (!endDate) {
      switch (duration) {
        case "HOURLY":
          calculatedEndDate.setHours(calculatedEndDate.getHours() + 1);
          break;
        case "DAILY":
          calculatedEndDate.setDate(calculatedEndDate.getDate() + 1);
          break;
        case "WEEKLY":
          calculatedEndDate.setDate(calculatedEndDate.getDate() + 7);
          break;
        case "MONTHLY":
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
          break;
      }
    }

    // Generate random access code if requested
    const accessCode = generateAccessCode
      ? Math.floor(10000 + Math.random() * 90000).toString()
      : null;

    // Reserve the box
    await prisma.storageBox.update({
      where: {
        id: boxId,
      },
      data: {
        isOccupied: true,
        customerId: customer.id,
        deliveryId: deliveryId || null,
        checkInDate: new Date(startDate),
        checkOutDate: calculatedEndDate,
        accessCode: accessCode,
      },
    });

    // Create a reservation record
    const reservation = await prisma.reservation.create({
      data: {
        boxId,
        customerId: customer.id,
        startDate: new Date(startDate),
        endDate: calculatedEndDate,
        status: "ACTIVE",
        duration,
        notes: notes || "",
        deliveryId: deliveryId || null,
        accessCode: accessCode,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Storage Box Reserved",
        message: `Your storage box at ${box.warehouse.name} has been reserved from ${new Date(startDate).toLocaleDateString()} to ${calculatedEndDate.toLocaleDateString()}.`,
        type: NotificationType.INFO,
        actionUrl: `/storage/reservations/${reservation.id}`,
      },
    });

    return NextResponse.json({
      data: {
        reservation,
        box: {
          id: box.id,
          size: box.size,
          warehouse: {
            id: box.warehouse.id,
            name: box.warehouse.name,
            address: box.warehouse.address,
            city: box.warehouse.city,
            postalCode: box.warehouse.postalCode,
          },
        },
        accessCode,
        checkInDate: new Date(startDate),
        checkOutDate: calculatedEndDate,
      },
    });
  } catch (error: unknown) {
    console.error("Error reserving storage box:", error);
    return NextResponse.json(
      { error: "Failed to reserve storage box" },
      { status: 500 }
    );
  }
} 