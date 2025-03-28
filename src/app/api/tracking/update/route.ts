import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DeliveryStatus } from "@prisma/client";

// Schema for validating the request body
const createTrackingSchema = z.object({
  deliveryId: z.string().optional(),
  trackingNumber: z.string().optional(),
  status: z.nativeEnum(DeliveryStatus),
  location: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  message: z.string().optional(),
  isPublic: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only delivery personnel, admin, or merchants can create tracking updates
    if (!["ADMIN", "DELIVERY_PERSON", "MERCHANT"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const validatedData = createTrackingSchema.parse(body);

    // Either deliveryId or trackingNumber must be provided
    if (!validatedData.deliveryId && !validatedData.trackingNumber) {
      return NextResponse.json(
        { error: "Either deliveryId or trackingNumber is required" },
        { status: 400 }
      );
    }

    // Get the delivery ID if tracking number was provided
    let deliveryId = validatedData.deliveryId;
    if (!deliveryId && validatedData.trackingNumber) {
      const delivery = await prisma.delivery.findUnique({
        where: { trackingNumber: validatedData.trackingNumber },
      });

      if (!delivery) {
        return NextResponse.json(
          { error: "Delivery not found" },
          { status: 404 }
        );
      }

      deliveryId = delivery.id;
    }

    // Check if user has permission to update this delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId! },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    // Check permissions based on role
    if (session.user.role === "DELIVERY_PERSON") {
      // Get the delivery person ID from their user account
      const deliveryPerson = await prisma.deliveryPerson.findFirst({
        where: { userId: session.user.id },
      });

      if (!deliveryPerson || deliveryPerson.id !== delivery.deliveryPersonId) {
        return NextResponse.json(
          { error: "Access denied. You are not assigned to this delivery." },
          { status: 403 }
        );
      }
    } else if (session.user.role === "MERCHANT") {
      // Check if the merchant owns this delivery
      const merchant = await prisma.merchant.findFirst({
        where: { userId: session.user.id },
      });

      if (!merchant || merchant.id !== delivery.merchantId) {
        return NextResponse.json(
          { error: "Access denied. This delivery does not belong to your business." },
          { status: 403 }
        );
      }
    }

    // Create the tracking update
    const tracking = await prisma.trackingUpdate.create({
      data: {
        deliveryId: deliveryId!,
        status: validatedData.status,
        location: validatedData.location,
        coordinates: validatedData.coordinates,
        message: validatedData.message,
        isPublic: validatedData.isPublic,
        timestamp: new Date(),
        updatedBy: session.user.id,
      },
    });

    // Also update the delivery status
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId! },
      data: { status: validatedData.status },
    });

    // Create delivery history record
    await prisma.deliveryHistory.create({
      data: {
        deliveryId: deliveryId!,
        field: 'status',
        oldValue: delivery.status,
        newValue: validatedData.status,
        changedBy: session.user.id,
        changeReason: validatedData.message || 'Status update via tracking',
      },
    });

    // Create notification for the customer
    await prisma.notification.create({
      data: {
        userId: delivery.customerId,
        title: "Delivery Status Update",
        message: `Your delivery ${delivery.trackingNumber} has been updated to: ${validatedData.status}`,
        type: "DELIVERY_UPDATE",
        actionUrl: `/deliveries/${delivery.id}`,
      },
    });

    // Handle special statuses
    if (validatedData.status === "DELIVERED") {
      // Update delivery with actual delivery date
      await prisma.delivery.update({
        where: { id: deliveryId! },
        data: { actualDelivery: new Date() },
      });
      
      // Additional DELIVERED logic would go here
    }

    return NextResponse.json({
      data: {
        tracking,
        delivery: updatedDelivery,
      },
      message: "Tracking update added successfully",
    });
  } catch (error: unknown) {
    console.error("Error creating tracking update:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create tracking update" },
      { status: 500 }
    );
  }
} 