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

    const invoiceId = params.id;

    // Get the invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payment: true,
        items: true,
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true
          }
        }
      }
    });

    // Check if invoice exists
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check authorization - merchant can only see their own invoices
    if (session.user.role === "MERCHANT") {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: session.user.id }
      });

      if (!merchant || merchant.id !== invoice.merchantId) {
        return NextResponse.json({ error: "You don't have permission to view this invoice" }, { status: 403 });
      }
    }

    // Return the invoice with all details
    return NextResponse.json({ data: invoice });
  } catch (error: unknown) {
    console.error("Error fetching invoice details:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice details" },
      { status: 500 }
    );
  }
} 