import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for updating availability
const updateAvailabilitySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
  recurrenceEndDate: z.string().datetime().optional(),
  maxConcurrentBookings: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
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

    const availabilityId = params.id;
    if (!availabilityId) {
      return NextResponse.json(
        { error: "Availability ID is required" },
        { status: 400 }
      );
    }

    // Get the availability with related data
    const availability = await prisma.providerAvailability.findUnique({
      where: { id: availabilityId },
      include: {
        serviceProvider: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!availability) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === "SERVICE_PROVIDER") {
      // Check if the availability belongs to this provider
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!serviceProvider || availability.serviceProviderId !== serviceProvider.id) {
        return NextResponse.json(
          { error: "You don't have permission to view this availability" },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only service providers and admins can view availability" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: availability,
    });
  } catch (error: unknown) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
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

    const availabilityId = params.id;
    if (!availabilityId) {
      return NextResponse.json(
        { error: "Availability ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateAvailabilitySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Get the existing availability
    const existingAvailability = await prisma.providerAvailability.findUnique({
      where: { id: availabilityId },
      include: {
        serviceProvider: true,
      },
    });

    if (!existingAvailability) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === "SERVICE_PROVIDER") {
      // Check if the availability belongs to this provider
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!serviceProvider || existingAvailability.serviceProviderId !== serviceProvider.id) {
        return NextResponse.json(
          { error: "You don't have permission to update this availability" },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only service providers and admins can update availability" },
        { status: 403 }
      );
    }

    // Convert dates to Date objects if provided
    const updateData: Prisma.ProviderAvailabilityUpdateInput = {};
    
    if (validatedData.data.startDate) {
      updateData.startDate = new Date(validatedData.data.startDate);
    }
    
    if (validatedData.data.endDate) {
      updateData.endDate = new Date(validatedData.data.endDate);
    }
    
    if (validatedData.data.recurrenceEndDate) {
      updateData.recurrenceEndDate = new Date(validatedData.data.recurrenceEndDate);
    }
    
    if (validatedData.data.recurrence) {
      updateData.recurrence = validatedData.data.recurrence;
    }
    
    if (validatedData.data.maxConcurrentBookings) {
      updateData.maxConcurrentBookings = validatedData.data.maxConcurrentBookings;
    }
    
    if (validatedData.data.notes !== undefined) {
      updateData.notes = validatedData.data.notes;
    }

    // Validate date ranges if updating dates
    const startDate = updateData.startDate || existingAvailability.startDate;
    const endDate = updateData.endDate || existingAvailability.endDate;
    const recurrenceEndDate = updateData.recurrenceEndDate !== undefined
      ? (updateData.recurrenceEndDate as Date)
      : existingAvailability.recurrenceEndDate;
    const recurrence = updateData.recurrence || existingAvailability.recurrence;

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    if (
      recurrence !== "NONE" &&
      !recurrenceEndDate
    ) {
      return NextResponse.json(
        { error: "Recurrence end date is required for recurring availability" },
        { status: 400 }
      );
    }

    if (
      recurrenceEndDate &&
      recurrenceEndDate <= endDate
    ) {
      return NextResponse.json(
        { error: "Recurrence end date must be after the end date" },
        { status: 400 }
      );
    }

    // Check for overlapping availability if dates are changed
    if (updateData.startDate || updateData.endDate) {
      const overlappingAvailability = await prisma.providerAvailability.findFirst({
        where: {
          serviceProviderId: existingAvailability.serviceProviderId,
          id: { not: availabilityId },
          AND: [
            {
              startDate: {
                lte: endDate,
              },
            },
            {
              endDate: {
                gte: startDate,
              },
            },
          ],
        },
      });

      if (overlappingAvailability) {
        return NextResponse.json(
          { error: "This time slot overlaps with existing availability" },
          { status: 400 }
        );
      }
    }

    // Process update within a transaction
    const updateResult = await prisma.$transaction(async (tx) => {
      // Update the availability
      const updatedAvailability = await tx.providerAvailability.update({
        where: { id: availabilityId },
        data: updateData,
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_AVAILABILITY",
          entityType: "PROVIDER_AVAILABILITY",
          entityId: availabilityId,
          details: `Updated availability for ${existingAvailability.serviceProvider.user?.name || 'provider'}`,
        },
      });

      return updatedAvailability;
    });

    return NextResponse.json({
      data: updateResult,
      message: "Availability updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const availabilityId = params.id;
    if (!availabilityId) {
      return NextResponse.json(
        { error: "Availability ID is required" },
        { status: 400 }
      );
    }

    // Get the availability with related data
    const availability = await prisma.providerAvailability.findUnique({
      where: { id: availabilityId },
      include: {
        serviceProvider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!availability) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === "SERVICE_PROVIDER") {
      // Check if the availability belongs to this provider
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!serviceProvider || availability.serviceProviderId !== serviceProvider.id) {
        return NextResponse.json(
          { error: "You don't have permission to delete this availability" },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only service providers and admins can delete availability" },
        { status: 403 }
      );
    }

    // Check if there are any services scheduled during this availability
    const scheduledServices = await prisma.service.count({
      where: {
        serviceProviderId: availability.serviceProviderId,
        AND: [
          {
            startDate: {
              lte: availability.endDate,
            },
          },
          {
            endDate: {
              gte: availability.startDate,
            },
          },
        ],
      },
    });

    if (scheduledServices > 0) {
      return NextResponse.json(
        { error: "Cannot delete availability with scheduled services" },
        { status: 400 }
      );
    }

    // Process deletion within a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the availability
      await tx.providerAvailability.delete({
        where: { id: availabilityId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_AVAILABILITY",
          entityType: "PROVIDER_AVAILABILITY",
          entityId: availabilityId,
          details: `Deleted availability for ${availability.serviceProvider.user?.name || 'provider'}`,
        },
      });
    });

    return NextResponse.json({
      message: "Availability deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting availability:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
} 