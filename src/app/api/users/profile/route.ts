import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for profile update
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  language: z.string().length(2).optional(),
  settings: z.record(z.any()).optional(),
});

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        isVerified: true,
        language: true,
        settings: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch role-specific data
    let roleData = null;
    if (user.role === "CUSTOMER") {
      roleData = await prisma.customer.findUnique({
        where: { userId: user.id },
        select: {
          subscriptionPlan: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
          loyaltyPoints: true,
          loyaltyTier: true,
        },
      });
    } else if (user.role === "DELIVERY_PERSON") {
      roleData = await prisma.deliveryPerson.findUnique({
        where: { userId: user.id },
        select: {
          activeStatus: true,
          currentLocation: true,
          rating: true,
          completedDeliveries: true,
        },
      });
    } else if (user.role === "MERCHANT") {
      roleData = await prisma.merchant.findUnique({
        where: { userId: user.id },
        select: {
          storeName: true,
          businessType: true,
          rating: true,
        },
      });
    }

    return NextResponse.json({
      data: {
        ...user,
        roleSpecificData: roleData,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateProfileSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: validatedData.data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        isVerified: true,
        language: true,
        settings: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // Create audit log for the profile update
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PROFILE",
        entityType: "USER",
        entityId: session.user.id,
        details: "User profile updated",
      },
    });

    return NextResponse.json({
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
} 