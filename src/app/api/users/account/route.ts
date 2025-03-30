import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

// Schema for account deletion confirmation
const accountDeletionSchema = z.object({
  password: z.string().min(1, "Password is required for confirmation"),
  reason: z.string().optional(),
  feedback: z.string().optional(),
  confirmPhrase: z.literal("DELETE MY ACCOUNT"),
});

export async function DELETE(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = accountDeletionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Fetch current user to verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        password: true,
        role: true,
        email: true
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      validatedData.data.password,
      user.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    // Check if user has active deliveries or services
    if (user.role === "DELIVERY_PERSON") {
      const activeDeliveries = await prisma.delivery.count({
        where: {
          deliveryPerson: { userId: user.id },
          status: {
            in: ["ACCEPTED", "PICKUP_IN_PROGRESS", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
      });

      if (activeDeliveries > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete account with active deliveries. Please complete or cancel all active deliveries first.",
            activeDeliveries,
          },
          { status: 409 }
        );
      }
    } else if (user.role === "CUSTOMER") {
      const pendingDeliveries = await prisma.delivery.count({
        where: {
          customer: { userId: user.id },
          status: {
            in: ["PENDING", "ACCEPTED", "PICKUP_IN_PROGRESS", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
      });

      if (pendingDeliveries > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete account with pending deliveries. Please wait for all deliveries to complete or cancel them.",
            pendingDeliveries,
          },
          { status: 409 }
        );
      }
    }

    // Begin transaction to handle account deletion
    return await prisma.$transaction(async (tx) => {
      // Store account deletion reason for analytics
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ACCOUNT_DELETION_REQUEST",
          entityType: "USER",
          entityId: user.id,
          details: JSON.stringify({
            reason: validatedData.data.reason || "Not provided",
            feedback: validatedData.data.feedback || "Not provided",
          }),
        },
      });

      // Soft delete approach - mark user as deleted and anonymize personal data
      await tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          email: `deleted-${Date.now()}-${user.email}`, // Make email unique to allow re-registration
          name: "Deleted User",
          phone: null,
          image: null,
          address: null,
          city: null,
          postalCode: null,
          country: null,
          profileImage: null,
          password: null, // Remove password to prevent login
          verificationToken: null,
          resetPasswordToken: null,
          mfaSecret: null,
          mfaBackupCodes: [],
          settings: null,
        },
      });

      // Remove all sessions (log out from all devices)
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json({
        message: "Account successfully deleted",
      });
    });
  } catch (error: unknown) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
} 