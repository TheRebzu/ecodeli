import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for cost calculation request
const calculateCostSchema = z.object({
  baseCost: z.number().positive(),
  optionId: z.string(),
  distance: z.number().optional(),
  weight: z.number().optional(),
  isRush: z.boolean().optional(),
});

// GET: Calculate additional cost for a shipping option
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedBody = calculateCostSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { baseCost, optionId, distance, weight, isRush } = validatedBody.data;

    // Option configurations
    const options = {
      express: { 
        multiplier: 1.5, 
        baseFee: 5,
        description: "Guaranteed delivery within 24 hours",
        estimatedTimeReduction: 0.5, // 50% faster
      },
      sameday: { 
        multiplier: 2, 
        baseFee: 8,
        description: "Delivery on the same day for orders placed before 12:00",
        estimatedTimeReduction: 0.8, // 80% faster
      },
      timeslot: { 
        multiplier: 1.3, 
        baseFee: 3,
        description: "Choose a specific 2-hour time slot for your delivery",
        estimatedTimeReduction: 0, // No time reduction
      },
      weekend: { 
        multiplier: 1.4, 
        baseFee: 4,
        description: "Saturday and Sunday deliveries",
        estimatedTimeReduction: 0, // No time reduction
      },
      green: { 
        multiplier: 1.1, 
        baseFee: 2,
        description: "Carbon-neutral delivery using electric vehicles or bikes",
        estimatedTimeReduction: -0.2, // 20% slower
      },
    };

    const selectedOption = options[optionId as keyof typeof options];
    
    if (!selectedOption) {
      return NextResponse.json(
        { error: "Invalid shipping option" },
        { status: 400 }
      );
    }

    // Base calculation
    let additionalCost = (baseCost * selectedOption.multiplier) - baseCost + selectedOption.baseFee;
    
    // Apply modifiers based on distance, weight, and rush
    if (distance && distance > 50) {
      // Add extra fee for long distances
      additionalCost += Math.ceil((distance - 50) / 10) * 0.5;
    }
    
    if (weight && weight > 10) {
      // Add extra fee for heavy packages
      additionalCost += Math.ceil((weight - 10) / 5) * 1.5;
    }
    
    if (isRush) {
      // Add rush fee
      additionalCost *= 1.2;
    }

    // Calculate time impact
    const standardDeliveryTime = distance ? Math.ceil(distance / 30) : 2; // Hours, based on 30km/h average
    const estimatedTime = standardDeliveryTime * (1 - selectedOption.estimatedTimeReduction);

    return NextResponse.json({
      data: {
        baseCost,
        additionalCost,
        totalCost: baseCost + additionalCost,
        option: {
          id: optionId,
          ...selectedOption,
        },
        estimatedDeliveryTime: {
          standard: standardDeliveryTime,
          withOption: Math.max(0.5, estimatedTime), // Minimum 30 minutes
          unit: "hours",
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error calculating shipping cost:", error);
    return NextResponse.json(
      { error: "Failed to calculate shipping cost" },
      { status: 500 }
    );
  }
} 