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

    // Get the invoice with all necessary data for PDF generation
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
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

    // Check authorization - merchant can only access their own invoices
    if (session.user.role === "MERCHANT") {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: session.user.id }
      });

      if (!merchant || merchant.id !== invoice.merchantId) {
        return NextResponse.json({ error: "You don't have permission to access this invoice" }, { status: 403 });
      }
    }

    // If the invoice already has a PDF URL, return it
    if (invoice.pdfUrl) {
      return NextResponse.json({ 
        data: { 
          pdfUrl: invoice.pdfUrl 
        } 
      });
    }

    // Placeholder for PDF generation service
    // In a real implementation, you would:
    // 1. Generate a PDF using a library like PDFKit or a service like DocRaptor
    // 2. Store the PDF in a storage service like AWS S3
    // 3. Update the invoice record with the PDF URL
    // 4. Return the PDF URL or stream the PDF directly

    // For now, we'll simulate a PDF URL
    const simulatedPdfUrl = `/api/invoices/pdf/${invoice.id}?token=${Buffer.from(invoice.id).toString('base64')}`;
    
    // Update the invoice with the PDF URL
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: simulatedPdfUrl }
    });

    // Return the PDF URL
    return NextResponse.json({ 
      data: { 
        pdfUrl: simulatedPdfUrl,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        total: invoice.total
      } 
    });
  } catch (error: unknown) {
    console.error("Error downloading invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
} 