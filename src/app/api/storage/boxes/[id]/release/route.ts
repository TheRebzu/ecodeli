import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DeliveryStatus, NotificationType } from "@prisma/client";

// Schema for release box request
const releaseBoxSchema = z.object({
  accessCode: z.string().min(6).max(6).optional(),
  notes: z.string().optional(),
  updateDeliveryStatus: z.boolean().optional().default(false),
  newDeliveryStatus: z.enum([
    "PICKED_UP",
    "DELIVERED",
    "CANCELLED"
  ]).optional(),
});

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

    const boxId = params.id;

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = releaseBoxSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { accessCode, notes, updateDeliveryStatus, newDeliveryStatus } = validatedBody.data;

    // Start a transaction
    return await prisma.$transaction(async (tx) => {
      // Get the box to check if it's occupied and by whom
      const box = await tx.storageBox.findUnique({
        where: { id: boxId },
        include: {
          warehouse: true,
          customer: {
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          },
        },
      });

      if (!box) {
        return NextResponse.json(
          { error: "Storage box not found" },
          { status: 404 }
        );
      }

      if (!box.isOccupied) {
        return NextResponse.json(
          { error: "Storage box is not currently occupied" },
          { status: 400 }
        );
      }

      // Check access rights
      const isAdmin = session.user.role === "ADMIN";
      const isDeliveryPerson = session.user.role === "DELIVERY_PERSON";
      
      // Get customer ID if user is a customer
      let customerId = null;
      if (session.user.role === "CUSTOMER") {
        const customer = await tx.customer.findUnique({
          where: { userId: session.user.id },
          select: { id: true }
        });
        customerId = customer?.id;
      }
      
      const isBoxOwner = box.customerId && box.customerId === customerId;

      // Customers can only release their own boxes, others need proper permissions
      if (!isAdmin && !isDeliveryPerson && !isBoxOwner) {
        return NextResponse.json(
          { error: "You don't have permission to release this box" },
          { status: 403 }
        );
      }

      // If regular customer or delivery person, verify access code
      if (!isAdmin && accessCode !== box.accessCode) {
        return NextResponse.json(
          { error: "Invalid access code" },
          { status: 403 }
        );
      }

      // Check if there's a delivery that needs updating
      const deliveryId = box.deliveryId;
      
      // Update the box status
      const updatedBox = await tx.storageBox.update({
        where: { id: boxId },
        data: {
          isOccupied: false,
          customerId: null,
          deliveryId: null,
          notes: notes || null,
          lastUsed: new Date(),
          checkOutDate: new Date(),
        },
      });

      // Update warehouse available boxes count
      await tx.warehouse.update({
        where: { id: box.warehouseId },
        data: {
          availableBoxes: box.warehouse.availableBoxes + 1,
        },
      });

      // Create an audit log entry
      await tx.auditLog.create({
        data: {
          entityType: "STORAGE_BOX",
          entityId: boxId,
          action: "RELEASE",
          userId: session.user.id,
          details: `Box ${box.boxNumber} at ${box.warehouse.name} released by ${session.user.name || session.user.email}`,
        },
      });

      // If there's an associated delivery and flag is set, update its status
      if (deliveryId && updateDeliveryStatus && newDeliveryStatus) {
        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: newDeliveryStatus as DeliveryStatus,
          },
        });
      }

      // If the box was occupied by a customer, notify them
      if (box.customerId && box.customer?.userId && box.customer.userId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: box.customer.userId,
            type: NotificationType.INFO,
            title: "Storage Box Released",
            message: `Your storage box #${box.boxNumber} at ${box.warehouse.name} has been released.`,
            isRead: false,
          },
        });
      }

      return NextResponse.json({
        data: {
          id: updatedBox.id,
          boxNumber: updatedBox.boxNumber,
          size: updatedBox.size,
          warehouse: {
            id: box.warehouse.id,
            name: box.warehouse.name,
          },
        },
        message: "Storage box released successfully",
      });
    });
  } catch (error: unknown) {
    console.error("Error releasing storage box:", error);
    return NextResponse.json(
      { error: "Failed to release storage box" },
      { status: 500 }
    );
  }
} 