import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { SubscriptionService } from "@/features/payments/services/subscription.service";
import { z } from "zod";

const createSubscriptionSchema = z.object({
  planId: z.enum(["STARTER", "PREMIUM"]),
  paymentMethodId: z.string(),
});

const updateSubscriptionSchema = z.object({
  planId: z.enum(["FREE", "STARTER", "PREMIUM"]),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await SubscriptionService.getUserSubscription(user.id);
    const availablePlans = SubscriptionService.getAvailablePlans();

    // Extract usage stats from subscription if available
    const usage = subscription?.usage || null;

    return NextResponse.json({
      subscription,
      availablePlans,
      usage,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug logs pour identifier le problème
    console.log("🔍 Subscription POST - User info:", {
      id: user.id,
      email: user.email,
      role: user.role,
      type: typeof user.role,
      isClient: user.role === "CLIENT",
    });

    if (user.role !== "CLIENT") {
      return NextResponse.json(
        {
          error: `Only clients can create subscriptions. Current role: ${user.role}`,
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createSubscriptionSchema.parse(body);

    const subscription = await SubscriptionService.createSubscription(
      user.id,
      validatedData,
    );

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating subscription:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Only clients can update subscriptions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateSubscriptionSchema.parse(body);

    const subscription = await SubscriptionService.updateSubscription(
      user.id,
      validatedData.planId,
    );

    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating subscription:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Only clients can cancel subscriptions" },
        { status: 403 },
      );
    }

    const result = await SubscriptionService.cancelSubscription(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
