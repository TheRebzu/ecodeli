import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ServiceType } from "@prisma/client";

interface ServiceTypeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Service type metadata
const serviceTypeInfo: Record<ServiceType, ServiceTypeInfo> = {
  PERSON_TRANSPORT: {
    id: "PERSON_TRANSPORT",
    name: "Passenger Transport",
    description: "Transportation services for individuals or groups",
    icon: "user-group",
  },
  AIRPORT_TRANSFER: {
    id: "AIRPORT_TRANSFER",
    name: "Airport Transfer",
    description: "Transportation to and from airports",
    icon: "plane",
  },
  SHOPPING: {
    id: "SHOPPING",
    name: "Shopping Services",
    description: "Personal shopping and delivery services",
    icon: "shopping-basket",
  },
  FOREIGN_PURCHASE: {
    id: "FOREIGN_PURCHASE",
    name: "Foreign Purchase",
    description: "Purchasing items from abroad and delivering them",
    icon: "globe",
  },
  PET_SITTING: {
    id: "PET_SITTING",
    name: "Pet Sitting",
    description: "Care for pets while owners are away",
    icon: "paw",
  },
  HOUSEKEEPING: {
    id: "HOUSEKEEPING",
    name: "Housekeeping",
    description: "Cleaning and maintenance services for homes",
    icon: "home",
  },
  GARDENING: {
    id: "GARDENING",
    name: "Gardening",
    description: "Garden maintenance and landscaping services",
    icon: "tree",
  },
  OTHER: {
    id: "OTHER",
    name: "Other Services",
    description: "Miscellaneous services not categorized elsewhere",
    icon: "ellipsis-h",
  },
};

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all service types with their metadata
    const serviceTypes = Object.values(serviceTypeInfo);

    return NextResponse.json({
      data: serviceTypes,
    });
  } catch (error: unknown) {
    console.error("Error fetching service types:", error);
    return NextResponse.json(
      { error: "Failed to fetch service types" },
      { status: 500 }
    );
  }
} 