import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for booking confirmation
const confirmBookingSchema = z.object({
  confirmationMessage: z.string().max(500).optional(),
  confirmedPrice: z.number().nonnegative().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceId = params.id;
    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = confirmBookingSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Get the service with related data
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        serviceProvider: true,
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to confirm this booking
    if (session.user.role === "SERVICE_PROVIDER") {
      // Check if the service belongs to this provider
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!serviceProvider || service.serviceProviderId !== serviceProvider.id) {
        return NextResponse.json(
          { error: "You don't have permission to confirm this booking" },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only service providers and admins can confirm bookings" },
        { status: 403 }
      );
    }

    // Check if the service is pending
    if (service.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending bookings can be confirmed" },
        { status: 400 }
      );
    }

    // Check if the service has a customer
    if (!service.customerId) {
      return NextResponse.json(
        { error: "This service has not been booked yet" },
        { status: 400 }
      );
    }

    // Process confirmation within a transaction
    const confirmationResult = await prisma.$transaction(async (tx) => {
      // Update the service status
      const updatedService = await tx.service.update({
        where: { id: serviceId },
        data: {
          status: "CONFIRMED",
          price: validatedData.data.confirmedPrice || service.price,
          providerNotes: validatedData.data.confirmationMessage,
        },
      });

      // Create audit log for the confirmation
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CONFIRM_BOOKING",
          entityType: "SERVICE",
          entityId: serviceId,
          details: `Booking confirmed for service: ${service.title}`,
        },
      });

      // Create notification for the customer
      if (service.customer?.user?.id) {
        await tx.notification.create({
          data: {
            userId: service.customer.user.id,
            type: "SUCCESS",
            title: "Booking Confirmed",
            message: `Your booking for "${service.title}" has been confirmed.`,
            isRead: false,
          },
        });
      }

      return updatedService;
    });

    return NextResponse.json({
      data: confirmationResult,
      message: "Booking confirmed successfully",
    });
  } catch (error: unknown) {
    console.error("Error confirming booking:", error);
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    );
  }
} 