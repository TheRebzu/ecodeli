import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for adding insurance to a package
const addInsuranceSchema = z.object({
  deliveryId: z.string(),
  planId: z.string(),
  declaredValue: z.number().positive(),
  items: z.array(
    z.object({
      name: z.string(),
      value: z.number().positive(),
      category: z.string(),
    })
  ).optional(),
  additionalNotes: z.string().optional(),
});

// GET: Retrieve available insurance options
export async function GET() {
  try {
    // Insurance plans - in a production app, these would likely be stored in the database
    const insurancePlans = [
      {
        id: "basic",
        name: "Basic Protection",
        coveragePercentage: 80,
        pricePercentage: 2,
        description: "Basic insurance covering 80% of declared value",
        minDeclaredValue: 10,
        maxDeclaredValue: 1000,
        deductible: 15,
        restrictions: ["Fragile items have reduced coverage", "Electronics limited to €500"],
      },
      {
        id: "standard",
        name: "Standard Protection",
        coveragePercentage: 90,
        pricePercentage: 3.5,
        description: "Standard insurance covering 90% of declared value",
        minDeclaredValue: 10,
        maxDeclaredValue: 2500,
        deductible: 10,
        restrictions: ["Electronics limited to €1000"],
      },
      {
        id: "premium",
        name: "Premium Protection",
        coveragePercentage: 100,
        pricePercentage: 5,
        description: "Full coverage insurance with no deductible",
        minDeclaredValue: 10,
        maxDeclaredValue: 5000,
        deductible: 0,
        restrictions: [],
      },
      {
        id: "electronics",
        name: "Electronics Protection",
        coveragePercentage: 100,
        pricePercentage: 6,
        description: "Specialized coverage for electronic devices",
        minDeclaredValue: 50,
        maxDeclaredValue: 3000,
        deductible: 25,
        restrictions: ["Only covers electronic devices"],
        specializedFor: "electronics",
      },
    ];

    return NextResponse.json({
      data: insurancePlans,
    });
  } catch (error: unknown) {
    console.error("Error fetching insurance plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance plans" },
      { status: 500 }
    );
  }
}

// POST: Add insurance to a package
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = addInsuranceSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { deliveryId, planId, declaredValue, items, additionalNotes } = validatedBody.data;

    // Verify delivery exists and belongs to the user
    const delivery = await prisma.delivery.findUnique({
      where: {
        id: deliveryId,
        userId: session.user.id,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found or unauthorized to add insurance" },
        { status: 404 }
      );
    }

    // Check if delivery already has insurance
    const existingInsurance = await prisma.insurance.findFirst({
      where: {
        deliveryId,
      },
    });

    if (existingInsurance) {
      return NextResponse.json(
        { error: "Delivery already has insurance" },
        { status: 400 }
      );
    }

    // Create insurance entry
    const insurance = await prisma.insurance.create({
      data: {
        deliveryId,
        planId,
        declaredValue,
        items: items || [],
        additionalNotes: additionalNotes || "",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      data: insurance,
    });
  } catch (error: unknown) {
    console.error("Error adding insurance:", error);
    return NextResponse.json(
      { error: "Failed to add insurance" },
      { status: 500 }
    );
  }
} 