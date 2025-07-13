import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schemas de validation
const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().optional(),
});

const distanceRequestSchema = z.object({
  action: z.literal("matrix"),
  origins: z.array(coordinateSchema).min(1).max(25),
  destinations: z.array(coordinateSchema).min(1).max(25),
  mode: z
    .enum(["driving", "walking", "bicycling", "transit"])
    .default("driving"),
  units: z.enum(["metric", "imperial"]).default("metric"),
  language: z.string().default("fr"),
  avoidTolls: z.boolean().default(false),
  avoidHighways: z.boolean().default(false),
});

const routeOptimizationSchema = z.object({
  action: z.literal("optimize"),
  depot: coordinateSchema,
  waypoints: z.array(coordinateSchema).min(1).max(20),
  vehicleCapacity: z.number().positive().optional(),
  maxDistance: z.number().positive().optional(),
  optimize: z.enum(["distance", "duration"]).default("distance"),
});

// Types
interface DistanceResult {
  origin: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  destination: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  distance: {
    text: string;
    value: number; // en metres
  };
  duration: {
    text: string;
    value: number; // en secondes
  };
  status:
    | "OK"
    | "NOT_FOUND"
    | "ZERO_RESULTS"
    | "MAX_WAYPOINTS_EXCEEDED"
    | "INVALID_REQUEST";
}

interface OptimizedRoute {
  orderedWaypoints: Array<{
    originalIndex: number;
    waypoint: any;
    arrivalTime?: string;
    departureTime?: string;
  }>;
  totalDistance: number;
  totalDuration: number;
  estimatedFuel: number;
  summary: {
    totalStops: number;
    efficencyScore: number;
    costSaving: number;
  };
}

class DistanceService {
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  async calculateDistanceMatrix(
    origins: Array<{ latitude: number; longitude: number; name?: string }>,
    destinations: Array<{ latitude: number; longitude: number; name?: string }>,
    mode: string = "driving",
    units: string = "metric",
    language: string = "fr",
    avoidTolls: boolean = false,
    avoidHighways: boolean = false,
  ): Promise<DistanceResult[]> {
    try {
      if (this.GOOGLE_MAPS_API_KEY) {
        return await this.calculateWithGoogle(
          origins,
          destinations,
          mode,
          units,
          language,
          avoidTolls,
          avoidHighways,
        );
      } else {
        console.warn("Google Maps API key not found, using Haversine fallback");
        return await this.calculateWithHaversine(origins, destinations);
      }
    } catch (error) {
      console.error("Distance calculation error:", error);
      return await this.calculateWithHaversine(origins, destinations);
    }
  }

  async optimizeRoute(
    depot: { latitude: number; longitude: number; name?: string },
    waypoints: Array<any>,
    options: any = {},
  ): Promise<OptimizedRoute> {
    try {
      if (this.GOOGLE_MAPS_API_KEY && waypoints.length <= 10) {
        return await this.optimizeWithGoogle(depot, waypoints, options);
      } else {
        return await this.optimizeWithHeuristic(depot, waypoints, options);
      }
    } catch (error) {
      console.error("Route optimization error:", error);
      return await this.optimizeWithHeuristic(depot, waypoints, options);
    }
  }

  private async calculateWithGoogle(
    origins: Array<{ latitude: number; longitude: number; name?: string }>,
    destinations: Array<{ latitude: number; longitude: number; name?: string }>,
    mode: string,
    units: string,
    language: string,
    avoidTolls: boolean,
    avoidHighways: boolean,
  ): Promise<DistanceResult[]> {
    const originsStr = origins
      .map((o) => `${o.latitude},${o.longitude}`)
      .join("|");
    const destinationsStr = destinations
      .map((d) => `${d.latitude},${d.longitude}`)
      .join("|");

    const url = new URL(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
    );
    url.searchParams.set("origins", originsStr);
    url.searchParams.set("destinations", destinationsStr);
    url.searchParams.set("mode", mode);
    url.searchParams.set("units", units);
    url.searchParams.set("language", language);
    url.searchParams.set(
      "avoid",
      [
        ...(avoidTolls ? ["tolls"] : []),
        ...(avoidHighways ? ["highways"] : []),
      ].join("|"),
    );
    url.searchParams.set("key", this.GOOGLE_MAPS_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const results: DistanceResult[] = [];

    data.rows.forEach((row: any, originIndex: number) => {
      row.elements.forEach((element: any, destIndex: number) => {
        results.push({
          origin: origins[originIndex],
          destination: destinations[destIndex],
          distance: element.distance || { text: "N/A", value: 0 },
          duration: element.duration || { text: "N/A", value: 0 },
          status: element.status,
        });
      });
    });

    return results;
  }

  private async calculateWithHaversine(
    origins: Array<{ latitude: number; longitude: number; name?: string }>,
    destinations: Array<{ latitude: number; longitude: number; name?: string }>,
  ): Promise<DistanceResult[]> {
    const results: DistanceResult[] = [];

    for (const origin of origins) {
      for (const destination of destinations) {
        const distance = this.haversineDistance(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude,
        );

        const duration = ((distance / 1000) * 60 * 60) / 50; // 50 km/h moyenne

        results.push({
          origin,
          destination,
          distance: {
            text: `${(distance / 1000).toFixed(1)} km`,
            value: Math.round(distance),
          },
          duration: {
            text: `${Math.round(duration / 60)} min`,
            value: Math.round(duration),
          },
          status: "OK",
        });
      }
    }

    return results;
  }

  private async optimizeWithGoogle(
    depot: any,
    waypoints: Array<any>,
    options: any,
  ): Promise<OptimizedRoute> {
    // Implementation Google Routes API
    const waypointsStr = waypoints
      .map((w) => `${w.latitude},${w.longitude}`)
      .join("|");

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${depot.latitude},${depot.longitude}`);
    url.searchParams.set("destination", `${depot.latitude},${depot.longitude}`);
    url.searchParams.set("waypoints", `optimize:true|${waypointsStr}`);
    url.searchParams.set("key", this.GOOGLE_MAPS_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Google Directions API error: ${data.status}`);
    }

    const route = data.routes[0];
    const orderedWaypoints = route.waypoint_order.map(
      (index: number, i: number) => ({
        originalIndex: index,
        waypoint: waypoints[index],
        arrivalTime: this.estimateArrivalTime(route.legs, i),
        departureTime: this.estimateDepartureTime(route.legs, i),
      }),
    );

    const totalDistance = route.legs.reduce(
      (sum: number, leg: any) => sum + leg.distance.value,
      0,
    );
    const totalDuration = route.legs.reduce(
      (sum: number, leg: any) => sum + leg.duration.value,
      0,
    );

    return {
      orderedWaypoints,
      totalDistance,
      totalDuration,
      estimatedFuel: this.calculateFuelConsumption(totalDistance),
      summary: {
        totalStops: waypoints.length,
        efficencyScore: this.calculateEfficiencyScore(
          waypoints.length,
          totalDistance,
        ),
        costSaving: this.calculateCostSaving(waypoints.length, totalDistance),
      },
    };
  }

  private async optimizeWithHeuristic(
    depot: any,
    waypoints: Array<any>,
    options: any,
  ): Promise<OptimizedRoute> {
    // Algorithme du plus proche voisin
    const unvisited = [...waypoints];
    const orderedWaypoints: Array<{ originalIndex: number; waypoint: any }> =
      [];
    let currentPosition = depot;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Number.MAX_VALUE;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.haversineDistance(
          currentPosition.latitude,
          currentPosition.longitude,
          unvisited[i].latitude,
          unvisited[i].longitude,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearestWaypoint = unvisited.splice(nearestIndex, 1)[0];
      orderedWaypoints.push({
        originalIndex: waypoints.indexOf(nearestWaypoint),
        waypoint: nearestWaypoint,
      });

      currentPosition = nearestWaypoint;
    }

    // Calculer distance totale
    let totalDistance = 0;
    let currentPos = depot;

    for (const stop of orderedWaypoints) {
      totalDistance += this.haversineDistance(
        currentPos.latitude,
        currentPos.longitude,
        stop.waypoint.latitude,
        stop.waypoint.longitude,
      );
      currentPos = stop.waypoint;
    }

    // Retour au depot
    totalDistance += this.haversineDistance(
      currentPos.latitude,
      currentPos.longitude,
      depot.latitude,
      depot.longitude,
    );

    const totalDuration = ((totalDistance / 1000) * 60 * 60) / 50; // 50 km/h moyenne

    return {
      orderedWaypoints,
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.round(totalDuration),
      estimatedFuel: this.calculateFuelConsumption(totalDistance),
      summary: {
        totalStops: waypoints.length,
        efficencyScore: this.calculateEfficiencyScore(
          waypoints.length,
          totalDistance,
        ),
        costSaving: this.calculateCostSaving(waypoints.length, totalDistance),
      },
    };
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Rayon de la Terre en metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private estimateArrivalTime(legs: any[], index: number): string {
    // Simulation - dans une vraie implementation, utiliser les donnees Google
    const now = new Date();
    now.setMinutes(now.getMinutes() + index * 30);
    return now.toISOString();
  }

  private estimateDepartureTime(legs: any[], index: number): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + index * 30 + 15); // 15 min d'arret
    return now.toISOString();
  }

  private calculateFuelConsumption(distance: number): number {
    // 7L/100km en moyenne
    return (distance / 1000) * 0.07;
  }

  private calculateEfficiencyScore(stops: number, distance: number): number {
    // Score base sur distance/arret
    const avgDistancePerStop = distance / stops;
    return Math.min(100, Math.max(0, 100 - (avgDistancePerStop - 5000) / 100));
  }

  private calculateCostSaving(stops: number, distance: number): number {
    // Estimation economies vs trajets individuels
    const individualDistance = stops * 15000; // 15km par trajet moyen
    const saving = Math.max(0, individualDistance - distance);
    return (saving / 1000) * 0.5; // 0.50€/km economise
  }
}

const distanceService = new DistanceService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case "matrix": {
        const validated = distanceRequestSchema.parse(body);
        const results = await distanceService.calculateDistanceMatrix(
          validated.origins,
          validated.destinations,
          validated.mode,
          validated.units,
          validated.language,
          validated.avoidTolls,
          validated.avoidHighways,
        );

        return NextResponse.json({
          success: true,
          data: results,
          count: results.length,
        });
      }

      case "optimize": {
        const validated = routeOptimizationSchema.parse(body);
        const optimizedRoute = await distanceService.optimizeRoute(
          validated.depot,
          validated.waypoints,
          {
            vehicleCapacity: validated.vehicleCapacity,
            maxDistance: validated.maxDistance,
            optimize: validated.optimize,
          },
        );

        return NextResponse.json({
          success: true,
          data: optimizedRoute,
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Action non supportee. Actions disponibles: matrix, optimize",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Distance API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Donnees invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "EcoDeli Distance API",
    version: "1.0",
    actions: {
      matrix: {
        description:
          "Calculer les distances entre plusieurs origines et destinations",
        parameters: [
          "origins[]",
          "destinations[]",
          "mode?",
          "units?",
          "language?",
          "avoidTolls?",
          "avoidHighways?",
        ],
      },
      optimize: {
        description: "Optimiser un itineraire avec multiple arrets",
        parameters: [
          "depot",
          "waypoints[]",
          "vehicleCapacity?",
          "maxDistance?",
          "optimize?",
        ],
      },
    },
    modes: ["driving", "walking", "bicycling", "transit"],
    units: ["metric", "imperial"],
    providers: ["Google Maps API", "Haversine (fallback)"],
    limits: {
      origins: 25,
      destinations: 25,
      waypoints: 20,
    },
  });
}
