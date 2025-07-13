import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const geocodeSchema = z.object({
  address: z.string().min(1),
  country: z.string().default("fr"),
  limit: z.number().min(1).max(10).default(5),
});

const reverseGeocodeSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const distanceSchema = z.object({
  from: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  to: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  unit: z.enum(["km", "mi"]).default("km"),
});

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    switch (action) {
      case "geocode":
        const geocodeData = geocodeSchema.parse(body);

        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: geocodeData.address,
              format: "json",
              addressdetails: "1",
              limit: geocodeData.limit.toString(),
              countrycodes: geocodeData.country,
            }),
          {
            headers: {
              "User-Agent": "EcoDeli-App/1.0",
            },
          },
        );

        if (!geocodeResponse.ok) {
          throw new Error("Geocoding service unavailable");
        }

        const geocodeResults = await geocodeResponse.json();

        return NextResponse.json({
          success: true,
          results: geocodeResults.map((result: any) => ({
            formatted: result.display_name,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            components: {
              street: result.address?.road,
              city:
                result.address?.city ||
                result.address?.town ||
                result.address?.village,
              postcode: result.address?.postcode,
              country: result.address?.country,
              state: result.address?.state,
            },
            boundingBox: result.boundingbox
              ? {
                  north: parseFloat(result.boundingbox[1]),
                  south: parseFloat(result.boundingbox[0]),
                  east: parseFloat(result.boundingbox[3]),
                  west: parseFloat(result.boundingbox[2]),
                }
              : null,
          })),
        });

      case "reverse":
        const reverseData = reverseGeocodeSchema.parse(body);

        const reverseResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?` +
            new URLSearchParams({
              lat: reverseData.latitude.toString(),
              lon: reverseData.longitude.toString(),
              format: "json",
              addressdetails: "1",
            }),
          {
            headers: {
              "User-Agent": "EcoDeli-App/1.0",
            },
          },
        );

        if (!reverseResponse.ok) {
          throw new Error("Reverse geocoding service unavailable");
        }

        const reverseResult = await reverseResponse.json();

        return NextResponse.json({
          success: true,
          result: {
            formatted: reverseResult.display_name,
            latitude: parseFloat(reverseResult.lat),
            longitude: parseFloat(reverseResult.lon),
            components: {
              street: reverseResult.address?.road,
              city:
                reverseResult.address?.city ||
                reverseResult.address?.town ||
                reverseResult.address?.village,
              postcode: reverseResult.address?.postcode,
              country: reverseResult.address?.country,
              state: reverseResult.address?.state,
            },
          },
        });

      case "distance":
        const distanceData = distanceSchema.parse(body);

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          distanceData.from.latitude,
          distanceData.from.longitude,
          distanceData.to.latitude,
          distanceData.to.longitude,
          distanceData.unit,
        );

        return NextResponse.json({
          success: true,
          distance,
          unit: distanceData.unit,
        });

      default:
        return NextResponse.json(
          { error: "Action not specified or invalid" },
          { status: 400 },
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Geo API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "geocode":
        const address = searchParams.get("address");
        const country = searchParams.get("country") || "fr";
        const limit = parseInt(searchParams.get("limit") || "5");

        if (!address) {
          return NextResponse.json(
            { error: "Address parameter is required" },
            { status: 400 },
          );
        }

        const geocodeData = geocodeSchema.parse({ address, country, limit });

        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: geocodeData.address,
              format: "json",
              addressdetails: "1",
              limit: geocodeData.limit.toString(),
              countrycodes: geocodeData.country,
            }),
          {
            headers: {
              "User-Agent": "EcoDeli-App/1.0",
            },
          },
        );

        if (!geocodeResponse.ok) {
          throw new Error("Geocoding service unavailable");
        }

        const geocodeResults = await geocodeResponse.json();

        return NextResponse.json({
          success: true,
          results: geocodeResults.map((result: any) => ({
            formatted: result.display_name,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            components: {
              street: result.address?.road,
              city:
                result.address?.city ||
                result.address?.town ||
                result.address?.village,
              postcode: result.address?.postcode,
              country: result.address?.country,
              state: result.address?.state,
            },
          })),
        });

      case "reverse":
        const lat = searchParams.get("latitude");
        const lon = searchParams.get("longitude");

        if (!lat || !lon) {
          return NextResponse.json(
            { error: "Latitude and longitude parameters are required" },
            { status: 400 },
          );
        }

        const reverseData = reverseGeocodeSchema.parse({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        });

        const reverseResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?` +
            new URLSearchParams({
              lat: reverseData.latitude.toString(),
              lon: reverseData.longitude.toString(),
              format: "json",
              addressdetails: "1",
            }),
          {
            headers: {
              "User-Agent": "EcoDeli-App/1.0",
            },
          },
        );

        if (!reverseResponse.ok) {
          throw new Error("Reverse geocoding service unavailable");
        }

        const reverseResult = await reverseResponse.json();

        return NextResponse.json({
          success: true,
          result: {
            formatted: reverseResult.display_name,
            latitude: parseFloat(reverseResult.lat),
            longitude: parseFloat(reverseResult.lon),
            components: {
              street: reverseResult.address?.road,
              city:
                reverseResult.address?.city ||
                reverseResult.address?.town ||
                reverseResult.address?.village,
              postcode: reverseResult.address?.postcode,
              country: reverseResult.address?.country,
              state: reverseResult.address?.state,
            },
          },
        });

      default:
        return NextResponse.json(
          { error: "Action not specified or invalid" },
          { status: 400 },
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Geo API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: "km" | "mi" = "km",
): number {
  const R = unit === "km" ? 6371 : 3959; // Earth's radius in km or miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
