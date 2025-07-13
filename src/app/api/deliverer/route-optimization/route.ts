import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { RouteOptimizationService } from "@/features/routing/services/route-optimization.service";

const optimizeRouteSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  options: z
    .object({
      maxDistance: z.number().optional(),
      maxDuration: z.number().optional(),
      prioritizeEarnings: z.boolean().default(false),
      avoidTolls: z.boolean().default(false),
      vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "WALKING"]).default("CAR"),
      fuelPrice: z.number().default(1.8),
    })
    .optional(),
});

/**
 * POST - Optimiser la route du livreur pour une date donnée
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { date, options } = optimizeRouteSchema.parse(body);

    // Optimiser la route
    const optimizedRoute = await RouteOptimizationService.optimizeRoute(
      deliverer.id,
      date,
      options || {},
    );

    return NextResponse.json({
      success: true,
      message: "Route optimisée avec succès",
      route: optimizedRoute,
    });
  } catch (error) {
    console.error("Error optimizing route:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de l'optimisation de la route" },
      { status: 500 },
    );
  }
}

/**
 * GET - Récupérer les suggestions d'optimisation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    // Obtenir les suggestions d'optimisation
    const suggestions =
      await RouteOptimizationService.getOptimizationSuggestions(deliverer.id);

    // Obtenir les routes récentes pour les statistiques
    const recentRoutes = await prisma.delivererRoute.findMany({
      where: {
        delivererId: deliverer.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculer les statistiques
    const stats = {
      totalRoutes: recentRoutes.length,
      averageEfficiency:
        recentRoutes.length > 0
          ? recentRoutes.reduce(
              (sum, route) => sum + (route.metadata?.efficiency || 0),
              0,
            ) / recentRoutes.length
          : 0,
      totalDistance: recentRoutes.reduce(
        (sum, route) => sum + route.totalDistance,
        0,
      ),
      totalEarnings: recentRoutes.reduce(
        (sum, route) => sum + route.estimatedEarnings,
        0,
      ),
      co2Saved: recentRoutes.reduce(
        (sum, route) => sum + (route.metadata?.co2Savings || 0),
        0,
      ),
    };

    return NextResponse.json({
      success: true,
      suggestions,
      stats,
    });
  } catch (error) {
    console.error("Error getting optimization suggestions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des suggestions" },
      { status: 500 },
    );
  }
}
