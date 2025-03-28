import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Define interface for notification settings
interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  deliveryUpdates: boolean;
  paymentUpdates: boolean;
  accountAlerts: boolean;
  promotions: boolean;
}

// Schema for notification settings update
const notificationSettingsSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
  marketing: z.boolean().default(false),
  deliveryUpdates: z.boolean().default(true),
  paymentUpdates: z.boolean().default(true),
  accountAlerts: z.boolean().default(true),
  promotions: z.boolean().default(false),
});

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's current notification settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract notification settings from user settings or create default
    const settings = user.settings as Record<string, unknown> | null;
    const notificationSettings = (settings?.notifications as NotificationSettings) || {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      deliveryUpdates: true,
      paymentUpdates: true,
      accountAlerts: true,
      promotions: false,
    };

    return NextResponse.json({ data: notificationSettings });
  } catch (error: unknown) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
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
    const validatedData = notificationSettingsSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Fetch user's current settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update notification settings while preserving other settings
    const currentSettings = (user.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      notifications: validatedData.data,
    };

    // Update user settings
    await prisma.user.update({
      where: { id: session.user.id },
      data: { settings: updatedSettings },
    });

    // Create audit log for the settings update
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_NOTIFICATION_SETTINGS",
        entityType: "USER",
        entityId: session.user.id,
        details: "User updated notification preferences",
      },
    });

    return NextResponse.json({
      data: validatedData.data,
      message: "Notification settings updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
} 