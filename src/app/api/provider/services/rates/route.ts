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

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // For now, return services as rates since we don't have a separate rates table
    const services = await prisma.service.findMany({
      where: { providerId: provider.id },
      select: {
        id: true,
        name: true,
        basePrice: true,
        duration: true,
        isActive: true,
        type: true,
        description: true,
      },
    });

    // Transform services to match rates interface
    const rates = services.map((service: {
      id: string;
      name: string;
      basePrice: number;
      duration: number | null;
      isActive: boolean;
      type: string;
      description: string;
    }) => ({
      id: service.id,
      serviceName: service.name,
      basePrice: service.basePrice,
      hourlyRate:
        service.duration && service.duration > 0 ? service.basePrice / (service.duration / 60) : 0,
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

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Create a new service that represents this rate
    const newService = await prisma.service.create({
      data: {
        providerId: provider.id, // Use the provider's id, not the user's id
        name: serviceName,
        description: `Service tarifé à ${basePrice}€`,
        type: "OTHER", // Required field
        basePrice: basePrice,
        duration: minimumDuration || 30,
        isActive: true,
      },
    });

    // Transform back to rate format
    const newRate = {
      id: newService.id,
      serviceName: newService.name,
      basePrice: newService.basePrice,
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
