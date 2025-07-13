import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const settingsSchema = z.object({
  notifications: z.object({
    pushEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    soundEnabled: z.boolean(),
    matchThreshold: z.number().min(50).max(100),
    maxDistance: z.number().min(1).max(20),
    minPrice: z.number().min(5).max(100),
  }),
  privacy: z.object({
    locationSharing: z.boolean(),
    profileVisibility: z.boolean(),
  }),
  delivery: z.object({
    autoAccept: z.boolean(),
    maxDeliveriesPerDay: z.number().min(1).max(20),
    preferredVehicleType: z.string(),
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  language: z.string(),
  timezone: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer not found" },
        { status: 404 },
      );
    }

    // Récupérer les paramètres depuis la base de données
    // Pour l'instant, retourner des paramètres par défaut
    const settings = {
      notifications: {
        pushEnabled: true,
        emailEnabled: false,
        soundEnabled: true,
        matchThreshold: 70,
        maxDistance: 5,
        minPrice: 10,
      },
      privacy: {
        locationSharing: true,
        profileVisibility: true,
      },
      delivery: {
        autoAccept: false,
        maxDeliveriesPerDay: 10,
        preferredVehicleType: deliverer.vehicleType || "CAR",
        workingHours: {
          start: "08:00",
          end: "18:00",
        },
      },
      language: "fr",
      timezone: "Europe/Paris",
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching deliverer settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedSettings = settingsSchema.parse(body);

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer not found" },
        { status: 404 },
      );
    }

    // Mettre à jour les paramètres dans la base de données
    // Pour l'instant, on met à jour seulement le type de véhicule
    await prisma.deliverer.update({
      where: { userId: session.user.id },
      data: {
        vehicleType: validatedSettings.delivery.preferredVehicleType,
      },
    });

    // TODO: Créer une table DelivererSettings pour stocker tous les paramètres
    // await prisma.delivererSettings.upsert({
    //   where: { delivererId: deliverer.id },
    //   update: { settings: validatedSettings },
    //   create: { delivererId: deliverer.id, settings: validatedSettings }
    // });

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: validatedSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating deliverer settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
