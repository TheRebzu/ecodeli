import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for applying a shipping option
const applyShippingOptionSchema = z.object({
  deliveryId: z.string(),
  optionId: z.string(),
  specialInstructions: z.string().optional(),
});

// GET: Retrieve available shipping options
export async function GET() {
  try {
    // Shipping options - in a production app, these would likely be stored in the database
    const shippingOptions = [
      {
        id: "express",
        name: "Express Delivery",
        description: "Guaranteed delivery within 24 hours",
        priceMultiplier: 1.5,
        baseFee: 5,
        estimatedTimeReduction: 0.5, // Reduces delivery time by 50%
        availableTimes: ["08:00-12:00", "12:00-16:00", "16:00-20:00"],
        restrictions: ["Not available on Sundays", "Maximum package weight: 15kg"],
        icon: "bolt",
      },
      {
        id: "sameday",
        name: "Same Day Delivery",
        description: "Delivery on the same day for orders placed before 12:00",
        priceMultiplier: 2,
        baseFee: 8,
        estimatedTimeReduction: 0.8, // Reduces delivery time by 80%
        availableTimes: ["14:00-18:00", "18:00-22:00"],
        restrictions: ["Only available in major cities", "Orders must be placed before 12:00"],
        icon: "clock",
      },
      {
        id: "timeslot",
        name: "Specific Time Slot",
        description: "Choose a specific 2-hour time slot for your delivery",
        priceMultiplier: 1.3,
        baseFee: 3,
        estimatedTimeReduction: 0,
        availableTimes: ["08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00"],
        restrictions: ["Subject to availability", "Cannot be combined with other priority options"],
        icon: "calendar",
      },
      {
        id: "weekend",
        name: "Weekend Delivery",
        description: "Saturday and Sunday deliveries",
        priceMultiplier: 1.4,
        baseFee: 4,
        estimatedTimeReduction: 0,
        availableTimes: ["10:00-14:00", "14:00-18:00"],
        restrictions: ["Only available on Saturdays and Sundays"],
        icon: "weekend",
      },
      {
        id: "green",
        name: "Eco-Friendly Delivery",
        description: "Carbon-neutral delivery using electric vehicles or bikes",
        priceMultiplier: 1.1,
        baseFee: 2,
        estimatedTimeReduction: -0.2, // May take longer than standard
        availableTimes: ["All day"],
        restrictions: ["Limited to urban areas", "Maximum package weight: 10kg"],
        icon: "leaf",
      },
    ];

    return NextResponse.json({
      data: shippingOptions,
    });
  } catch (error: unknown) {
    console.error("Error fetching shipping options:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping options" },
      { status: 500 }
    );
  }
}

// POST: Apply a shipping option to a delivery
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = applyShippingOptionSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { deliveryId, optionId, specialInstructions } = validatedBody.data;

    // Verify delivery exists and belongs to the user
    const delivery = await prisma.delivery.findUnique({
      where: {
        id: deliveryId,
        userId: session.user.id,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if delivery is in a state where shipping options can be applied
    if (delivery.status !== "PENDING" && delivery.status !== "PROCESSING") {
      return NextResponse.json(
        { error: "Shipping options can only be applied to pending or processing deliveries" },
        { status: 400 }
      );
    }

    // Calculate additional cost based on the option
    const options = {
      express: { multiplier: 1.5, baseFee: 5 },
      sameday: { multiplier: 2, baseFee: 8 },
      timeslot: { multiplier: 1.3, baseFee: 3 },
      weekend: { multiplier: 1.4, baseFee: 4 },
      green: { multiplier: 1.1, baseFee: 2 },
    };

    const selectedOption = options[optionId as keyof typeof options];
    
    if (!selectedOption) {
      return NextResponse.json(
        { error: "Invalid shipping option" },
        { status: 400 }
      );
    }

    const baseCost = delivery.price || 0;
    const additionalCost = (baseCost * selectedOption.multiplier) - baseCost + selectedOption.baseFee;

    // Apply shipping option to delivery
    const updatedDelivery = await prisma.delivery.update({
      where: {
        id: deliveryId,
      },
      data: {
        shippingOption: optionId,
        specialInstructions: specialInstructions || delivery.specialInstructions,
        price: baseCost + additionalCost,
        // Update other fields as needed (e.g., estimated delivery time)
      },
    });

    return NextResponse.json({
      data: {
        delivery: updatedDelivery,
        additionalCost,
        totalCost: baseCost + additionalCost,
      },
    });
  } catch (error: unknown) {
    console.error("Error applying shipping option:", error);
    return NextResponse.json(
      { error: "Failed to apply shipping option" },
      { status: 500 }
    );
  }
} 