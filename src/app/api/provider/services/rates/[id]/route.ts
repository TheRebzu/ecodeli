import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      serviceName,
      basePrice,
      hourlyRate,
      minimumDuration,
      maximumDuration,
      isActive,
    } = body;

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: currentUser.id },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Verify the service belongs to the current user's provider
    const existingService = await prisma.service.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
    });

    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Update the service
    const updatedService = await prisma.service.update({
      where: { id: id },
      data: {
        name: serviceName || existingService.name,
        basePrice: basePrice || existingService.basePrice,
        duration: minimumDuration || existingService.duration,
        isActive: isActive !== undefined ? isActive : existingService.isActive,
      },
    });

    // Transform back to rate format
    const updatedRate = {
      id: updatedService.id,
      serviceName: updatedService.name,
      basePrice: updatedService.basePrice,
      hourlyRate:
        hourlyRate ||
        (updatedService.duration && updatedService.duration > 0
          ? updatedService.basePrice / (updatedService.duration / 60)
          : 0),
      currency: "EUR",
      minimumDuration: updatedService.duration,
      maximumDuration: maximumDuration || (updatedService.duration ? updatedService.duration * 2 : 480),
      isActive: updatedService.isActive,
      specialRates: [],
    };

    return NextResponse.json(updatedRate);
  } catch (error) {
    console.error("Error updating rate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: currentUser.id },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Verify the service belongs to the current user's provider
    const existingService = await prisma.service.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
    });

    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Delete the service
    await prisma.service.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Rate deleted successfully" });
  } catch (error) {
    console.error("Error deleting rate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
