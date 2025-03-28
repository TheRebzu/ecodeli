import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { NotificationType } from "@prisma/client";

// Schema for reserve box request
const reserveBoxSchema = z.object({
  boxId: z.string(),
  notes: z.string().optional(),
  deliveryId: z.string().optional(),
  duration: z.enum(["SHORT", "MEDIUM", "LONG"]).optional(),
  recipientId: z.string().optional(),
  useExistingCode: z.boolean().optional().default(false),
});

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
        { error: "Invalid request body", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { boxId, notes, deliveryId, duration, recipientId, useExistingCode } = validatedBody.data;

    // Start a transaction since we need to update multiple records
    return await prisma.$transaction(async (tx) => {
      // Get the box to check if it's available
      const box = await tx.storageBox.findUnique({
        where: { id: boxId },
        include: {
          warehouse: true,
        },
      });

      if (!box) {
        return NextResponse.json(
          { error: "Storage box not found" },
          { status: 404 }
        );
      }

      if (box.isOccupied) {
        return NextResponse.json(
          { error: "Storage box is already occupied" },
          { status: 400 }
        );
      }

      // Get customer details for the current user if they are a customer
      let customerId = null;
      if (session.user.role === "CUSTOMER") {
        const customer = await tx.customer.findUnique({
          where: { userId: session.user.id },
          select: { id: true }
        });
        
        if (!customer) {
          return NextResponse.json(
            { error: "Customer profile not found" },
            { status: 404 }
          );
        }
        
        customerId = customer.id;
      }
      
      // For other roles trying to reserve for a specific user
      if (recipientId && session.user.role !== "CUSTOMER") {
        const recipient = await tx.user.findUnique({
          where: { id: recipientId },
        });
        
        if (!recipient) {
          return NextResponse.json(
            { error: "Recipient not found" },
            { status: 404 }
          );
        }
        
        if (recipient.role === "CUSTOMER") {
          const recipientCustomer = await tx.customer.findUnique({
            where: { userId: recipient.id },
            select: { id: true }
          });
          
          if (recipientCustomer) {
            customerId = recipientCustomer.id;
          }
        }
      }

      // Generate a new access code if needed
      const accessCode = useExistingCode && box.accessCode 
        ? box.accessCode 
        : generateRandomAccessCode();

      // Update the warehouse's available boxes count
      await tx.warehouse.update({
        where: { id: box.warehouseId },
        data: {
          availableBoxes: box.warehouse.availableBoxes - 1,
        },
      });

      // Calculate reservation duration
      const now = new Date();
      let checkOutDate: Date | null = null;
      
      if (duration) {
        checkOutDate = new Date(now);
        switch (duration) {
          case "SHORT":
            checkOutDate.setDate(checkOutDate.getDate() + 1); // 1 day
            break;
          case "MEDIUM":
            checkOutDate.setDate(checkOutDate.getDate() + 7); // 1 week
            break;
          case "LONG":
            checkOutDate.setDate(checkOutDate.getDate() + 30); // 1 month
            break;
        }
      }

      // Update the box status
      const updatedBox = await tx.storageBox.update({
        where: { id: boxId },
        data: {
          isOccupied: true,
          customerId: customerId,
          deliveryId: deliveryId || null,
          accessCode,
          checkInDate: now,
          checkOutDate,
          notes: notes || null,
        },
      });

      // Create an audit log entry
      await tx.auditLog.create({
        data: {
          entityType: "STORAGE_BOX",
          entityId: boxId,
          action: "RESERVE",
          userId: session.user.id,
          details: `Box ${box.boxNumber} at ${box.warehouse.name} reserved by ${session.user.name || session.user.email}`,
        },
      });

      // If this is associated with a delivery, update the delivery status
      if (deliveryId) {
        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: "IN_STORAGE",
          },
        });
      }

      // Create a notification for the recipient if different from requester
      if (recipientId && recipientId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: recipientId,
            type: NotificationType.INFO,
            title: "Storage Box Reserved",
            message: `A storage box has been reserved for you at ${box.warehouse.name}. Box number: ${box.boxNumber}. Access code: ${accessCode}`,
            isRead: false,
          },
        });
      }

      // Return the updated box without sensitive information
      return NextResponse.json({
        data: {
          id: updatedBox.id,
          boxNumber: updatedBox.boxNumber,
          size: updatedBox.size,
          accessCode: updatedBox.accessCode,
          warehouse: {
            id: box.warehouse.id,
            name: box.warehouse.name,
            address: box.warehouse.address,
            city: box.warehouse.city,
          },
          checkInDate: updatedBox.checkInDate,
          checkOutDate: updatedBox.checkOutDate,
          notes: updatedBox.notes,
        },
        message: "Storage box reserved successfully",
      });
    });
  } catch (error: unknown) {
    console.error("Error reserving storage box:", error);
    return NextResponse.json(
      { error: "Failed to reserve storage box" },
      { status: 500 }
    );
  }
}

/**
 * Generate a random 6-digit access code
 */
function generateRandomAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
} 