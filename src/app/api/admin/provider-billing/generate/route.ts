import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

const generateInvoiceSchema = z.object({
  providerId: z.string(),
  month: z.string().optional(),
  year: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = generateInvoiceSchema.parse(body);

    // Get current month and year if not provided
    const now = new Date();
    const month =
      validatedData.month || String(now.getMonth() + 1).padStart(2, "0");
    const year = validatedData.year || String(now.getFullYear());

    // Check if invoice already exists
    const existingInvoice = await prisma.providerMonthlyInvoice.findFirst({
      where: {
        providerId: validatedData.providerId,
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Invoice already exists for this provider and period" },
        { status: 409 },
      );
    }

    // Get provider services for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const services = await prisma.service.findMany({
      where: {
        providerId: validatedData.providerId,
        bookings: {
          some: {
            scheduledAt: {
              gte: startDate,
              lte: endDate,
            },
            status: "COMPLETED",
          },
        },
      },
      include: {
        bookings: {
          where: {
            scheduledAt: {
              gte: startDate,
              lte: endDate,
            },
            status: "COMPLETED",
          },
        },
      },
    });

    const totalAmount = services.reduce((sum, service) => {
      return sum + service.basePrice * service.bookings.length;
    }, 0);

    const totalHours = services.reduce((sum, service) => {
      return sum + (service.duration || 0) * service.bookings.length;
    }, 0);

    // Create the invoice
    const invoice = await prisma.providerMonthlyInvoice.create({
      data: {
        providerId: validatedData.providerId,
        month: parseInt(month),
        year: parseInt(year),
        status: "SENT",
        totalAmount,
        totalHours,
        netAmount: totalAmount * 0.85, // 85% after 15% commission
        commissionAmount: totalAmount * 0.15,
        invoiceNumber: `INV-${validatedData.providerId}-${year}${month}`,
        dueDate: new Date(parseInt(year), parseInt(month), 30), // Last day of the month
        sentAt: new Date(),
      },
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    // Create intervention records for each service
    for (const service of services) {
      for (const booking of service.bookings) {
        await prisma.providerInvoiceIntervention.create({
          data: {
            invoiceId: invoice.id,
            interventionId: booking.id, // Using booking as intervention
            hours: service.duration || 0,
            rate: service.basePrice,
            amount: service.basePrice,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
      message: "Invoice generated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error generating provider invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
