import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contractId = params.id;

    // Find merchant profile for authorization check
    const merchant = await prisma.merchant.findFirst({
      where: { userId: session.user.id }
    });

    // First get the contract to check permissions
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Check if contract exists
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if user is admin or the merchant that owns the contract
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN";
    const isMerchantOwner = merchant && merchant.id === contract.merchantId;

    if (!isAdmin && !isMerchantOwner) {
      return NextResponse.json({ error: "You don't have permission to view this contract" }, { status: 403 });
    }

    // Return the contract with all necessary details
    return NextResponse.json({ data: contract });
  } catch (error: unknown) {
    console.error("Error fetching contract details:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract details" },
      { status: 500 }
    );
  }
} 