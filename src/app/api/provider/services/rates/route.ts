import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // For now, return services as rates since we don't have a separate rates table
    const services = await prisma.service.findMany({
      where: { providerId: userId },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        isActive: true,
        category: true,
        description: true,
      },
    });

    // Transform services to match rates interface
    const rates = services.map((service) => ({
      id: service.id,
      serviceName: service.name,
      basePrice: service.price,
      hourlyRate:
        service.duration > 0 ? service.price / (service.duration / 60) : 0,
      currency: "EUR",
      minimumDuration: service.duration || 30,
      maximumDuration: service.duration ? service.duration * 2 : 480,
      isActive: service.isActive,
      specialRates: [],
    }));

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Error fetching rates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, serviceName, basePrice, hourlyRate, minimumDuration } =
      body;

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!serviceName || !basePrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create a new service that represents this rate
    const newService = await prisma.service.create({
      data: {
        providerId: userId,
        name: serviceName,
        description: `Service tarifé à ${basePrice}€`,
        category: "OTHER",
        price: basePrice,
        duration: minimumDuration || 30,
        isActive: true,
      },
    });

    // Transform back to rate format
    const newRate = {
      id: newService.id,
      serviceName: newService.name,
      basePrice: newService.price,
      hourlyRate: hourlyRate || 0,
      currency: "EUR",
      minimumDuration: newService.duration,
      maximumDuration: newService.duration * 2,
      isActive: newService.isActive,
      specialRates: [],
    };

    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    console.error("Error creating rate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
