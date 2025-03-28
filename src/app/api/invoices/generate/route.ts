import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Invoice item schema
const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
});

// Create invoice schema
const createInvoiceSchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  dueDate: z.string().refine(
    value => !isNaN(Date.parse(value)),
    { message: "Invalid date format" }
  ),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  tax: z.number().min(0, "Tax cannot be negative").optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can generate invoices
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only admins can generate invoices" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createInvoiceSchema.parse(body);

    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: validatedData.merchantId },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Calculate subtotal and total
    const items = validatedData.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = validatedData.tax || 0;
    const total = subtotal + tax;

    // Generate unique invoice number (using timestamp + random string)
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${timestamp}-${randomStr}`;

    // Create invoice in database
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        merchantId: validatedData.merchantId,
        issueDate: new Date(),
        dueDate: new Date(validatedData.dueDate),
        subtotal,
        tax,
        total,
        status: "PENDING",
        notes: validatedData.notes,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });

    // Create notification for the merchant
    await prisma.notification.create({
      data: {
        userId: merchant.userId,
        title: "New Invoice",
        message: `A new invoice (#${invoiceNumber}) for $${total.toFixed(2)} has been generated.`,
        type: "INFO",
        actionUrl: `/invoices/${invoice.id}`,
      },
    });

    // Return the created invoice
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error generating invoice:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
} 