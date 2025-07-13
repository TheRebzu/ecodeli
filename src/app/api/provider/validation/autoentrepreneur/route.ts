import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { providerAutoentrepreneurSchema } from "@/features/provider/schemas/provider-validation.schema";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: currentUser.id },
      select: {
        id: true,
        legalStatus: true,
        vatNumber: true,
        insuranceProvider: true,
        insurancePolicy: true,
        insuranceExpiry: true,
        insuranceDocument: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error fetching autoentrepreneur data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = providerAutoentrepreneurSchema.parse(body);

    const provider = await prisma.provider.update({
      where: { userId: currentUser.id },
      data: {
        legalStatus: validatedData.legalStatus,
        vatNumber: validatedData.vatNumber,
        insuranceProvider: validatedData.insuranceProvider,
        insurancePolicy: validatedData.insurancePolicy,
        insuranceExpiry: validatedData.insuranceExpiry
          ? new Date(validatedData.insuranceExpiry)
          : null,
        insuranceDocument: validatedData.insuranceDocument,
      },
      select: {
        id: true,
        legalStatus: true,
        vatNumber: true,
        insuranceProvider: true,
        insurancePolicy: true,
        insuranceExpiry: true,
        insuranceDocument: true,
      },
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error updating autoentrepreneur data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
