import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema pour créer une route
const createRouteSchema = z.object({
  name: z.string().min(1, "Le nom de la route est requis"),
  description: z.string().optional(),
  startAddress: z.string().min(1, "L'adresse de départ est requise"),
  startLatitude: z.number(),
  startLongitude: z.number(),
  endAddress: z.string().min(1, "L'adresse d'arrivée est requise"),
  endLatitude: z.number(),
  endLongitude: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(), // DAILY, WEEKLY, MONTHLY
  maxPackages: z.number().min(1).default(5),
  maxWeight: z.number().min(0).optional(),
  maxVolume: z.number().min(0).optional(),
  vehicleType: z.string().default("CAR"),
  isActive: z.boolean().default(true),
  autoAccept: z.boolean().default(false),
  maxDetour: z.number().min(0).default(5.0),
  acceptedTypes: z.array(z.string()).default([]),
});

// Schema pour filtres
const routesFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  isActive: z.coerce.boolean().optional(),
  isRecurring: z.coerce.boolean().optional(),
  sortBy: z.enum(["createdAt", "startDate", "title"]).default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const routeSchema = z.object({
  startLocation: z
    .string()
    .min(5, "Le point de départ doit faire au moins 5 caractères"),
  endLocation: z
    .string()
    .min(5, "La destination doit faire au moins 5 caractères"),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide"),
  daysOfWeek: z.array(z.string()).min(1, "Sélectionnez au moins un jour"),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "WALKING"]),
  maxDistance: z.number().min(1).max(50),
  minPrice: z.number().min(5).max(100),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer not found" },
        { status: 404 },
      );
    }

    const routes = await prisma.delivererRoute.findMany({
      where: { delivererId: deliverer.id },
      orderBy: { createdAt: "desc" },
    });

    // Formater les données pour le front-end
    const formattedRoutes = routes.map((route) => ({
      id: route.id,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      startTime: route.startTime,
      endTime: route.endTime,
      daysOfWeek: route.daysOfWeek,
      vehicleType: route.vehicleType,
      maxDistance: route.maxDistance,
      minPrice: route.minPrice,
      isActive: route.isActive,
      createdAt: route.createdAt.toISOString(),
    }));

    return NextResponse.json({ routes: formattedRoutes });
  } catch (error) {
    console.error("Error fetching deliverer routes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedRoute = routeSchema.parse(body);

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer not found" },
        { status: 404 },
      );
    }

    // Créer le trajet
    const route = await prisma.delivererRoute.create({
      data: {
        delivererId: deliverer.id,
        startLocation: validatedRoute.startLocation,
        endLocation: validatedRoute.endLocation,
        startTime: validatedRoute.startTime,
        endTime: validatedRoute.endTime,
        daysOfWeek: validatedRoute.daysOfWeek,
        vehicleType: validatedRoute.vehicleType,
        maxDistance: validatedRoute.maxDistance,
        minPrice: validatedRoute.minPrice,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Route created successfully",
        route: {
          id: route.id,
          startLocation: route.startLocation,
          endLocation: route.endLocation,
          startTime: route.startTime,
          endTime: route.endTime,
          daysOfWeek: route.daysOfWeek,
          vehicleType: route.vehicleType,
          maxDistance: route.maxDistance,
          minPrice: route.minPrice,
          isActive: route.isActive,
          createdAt: route.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating deliverer route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
