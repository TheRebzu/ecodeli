import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { SubscriptionPlan } from "@prisma/client";

// Schema for subscription creation
const createSubscriptionSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  autoRenew: z.boolean().default(true),
  paymentMethodId: z.string().optional(),
});

// Schema for subscription update
const updateSubscriptionSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan).optional(),
  autoRenew: z.boolean().optional(),
  paymentMethodId: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  userId: z.string().optional(),
});

// POST: Subscribe to a plan
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = createSubscriptionSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { plan, autoRenew, paymentMethodId } = validatedBody.data;

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 }
      );
    }

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        plan,
        autoRenew,
        paymentMethodId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      data: subscription,
    });
  } catch (error: unknown) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

// GET: Fetch subscription details and benefits
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      userId: searchParams.get("userId") || session.user.id,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { userId } = validatedParams.data;

    // Check if user is admin or requesting their own subscription
    if (userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized to view this subscription" },
        { status: 403 }
      );
    }

    // Get user subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Get benefits based on subscription plan
    const planBenefits = getPlanBenefits(subscription.plan);

    return NextResponse.json({
      data: {
        subscription,
        benefits: planBenefits,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// PUT: Update subscription
export async function PUT(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = updateSubscriptionSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const updateData = validatedBody.data;

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Process plan upgrade/downgrade if requested
    if (updateData.plan && updateData.plan !== subscription.plan) {
      // Here you would handle billing logic for plan changes
      // For now, we'll just update the plan
    }

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      data: updatedSubscription,
    });
  } catch (error: unknown) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// Helper function to get benefits based on subscription plan
function getPlanBenefits(plan: SubscriptionPlan) {
  switch (plan) {
    case "FREE":
      return {
        maxDeliveries: 5,
        discountPercentage: 0,
        prioritySupport: false,
        advancedFeatures: false,
        maxWeight: 10, // in kg
        description: "Basic plan with limited features",
      };
    case "STARTER":
      return {
        maxDeliveries: 20,
        discountPercentage: 5,
        prioritySupport: false,
        advancedFeatures: true,
        maxWeight: 20, // in kg
        description: "Intermediate plan with more deliveries and features",
      };
    case "PREMIUM":
      return {
        maxDeliveries: 100,
        discountPercentage: 15,
        prioritySupport: true,
        advancedFeatures: true,
        maxWeight: 30, // in kg
        description: "Premium plan with maximum benefits and priority support",
      };
    default:
      return {
        maxDeliveries: 0,
        discountPercentage: 0,
        prioritySupport: false,
        advancedFeatures: false,
        maxWeight: 0,
        description: "Unknown plan",
      };
  }
} 