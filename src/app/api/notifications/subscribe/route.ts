import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema for push notification subscription
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  deviceType: z.enum(["web", "android", "ios"]).default("web"),
  deviceName: z.string().optional(),
});

export type PushSubscription = z.infer<typeof subscriptionSchema>;

// POST: Subscribe to push notifications
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const subscription = subscriptionSchema.parse(body);

    // Store subscription in database (example implementation)
    // Note: You would typically need to add a PushSubscription model to your Prisma schema
    // This is a placeholder implementation - you'll need to modify your schema
    /*
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: session.user.id,
          endpoint: subscription.endpoint,
        },
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceType: subscription.deviceType,
        deviceName: subscription.deviceName,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceType: subscription.deviceType,
        deviceName: subscription.deviceName,
      },
    });
    */

    // Until you've updated your schema, return a placeholder success response
    return NextResponse.json({ 
      success: true,
      message: "Subscription received. Note: To fully implement this endpoint, add a PushSubscription model to your Prisma schema.",
      subscription: {
        endpoint: subscription.endpoint,
        deviceType: subscription.deviceType,
        deviceName: subscription.deviceName || "Unknown device"
      }
    });
  } catch (error: unknown) {
    console.error("Error subscribing to push notifications:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid subscription data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
} 