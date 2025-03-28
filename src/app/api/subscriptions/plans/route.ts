import { NextResponse } from "next/server";

// GET: Fetch all available subscription plans and their benefits
export async function GET() {
  try {
    // Define plans and their benefits
    const plans = {
      FREE: {
        id: "free",
        name: "Free",
        price: 0,
        billingCycle: "monthly",
        features: [
          "Up to 5 deliveries per month",
          "Maximum package weight: 10 kg",
          "Basic customer support",
          "Standard delivery times",
        ],
        maxDeliveries: 5,
        discountPercentage: 0,
        prioritySupport: false,
        advancedFeatures: false,
        maxWeight: 10, // in kg
        description: "Basic plan with limited features",
      },
      STARTER: {
        id: "starter",
        name: "Starter",
        price: 19.99,
        billingCycle: "monthly",
        features: [
          "Up to 20 deliveries per month",
          "Maximum package weight: 20 kg",
          "5% discount on all deliveries",
          "Advanced delivery tracking",
          "Access to priority shipping options",
        ],
        maxDeliveries: 20,
        discountPercentage: 5,
        prioritySupport: false,
        advancedFeatures: true,
        maxWeight: 20, // in kg
        description: "Intermediate plan with more deliveries and features",
      },
      PREMIUM: {
        id: "premium",
        name: "Premium",
        price: 49.99,
        billingCycle: "monthly",
        features: [
          "Up to 100 deliveries per month",
          "Maximum package weight: 30 kg",
          "15% discount on all deliveries",
          "Priority customer support",
          "Advanced analytics and reporting",
          "Dedicated account manager",
          "Customized delivery options",
        ],
        maxDeliveries: 100,
        discountPercentage: 15,
        prioritySupport: true,
        advancedFeatures: true,
        maxWeight: 30, // in kg
        description: "Premium plan with maximum benefits and priority support",
      },
    };

    // Return all plans
    return NextResponse.json({
      data: plans,
    });
  } catch (error: unknown) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
} 