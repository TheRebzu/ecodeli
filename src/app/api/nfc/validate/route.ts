import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating the request body
const validateCardSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required"),
  terminalId: z.string().optional(),
  scanType: z.string().min(1, "Scan type is required"),
  referenceId: z.string().optional(),
  location: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = validateCardSchema.parse(body);

    // Find the NFC card
    const card = await prisma.nFCCard.findUnique({
      where: { cardNumber: validatedData.cardNumber },
      include: {
        deliveryPerson: true,
      },
    });

    // Prepare the transaction data
    const transactionData = {
      cardNumber: validatedData.cardNumber,
      terminalId: validatedData.terminalId,
      scanType: validatedData.scanType,
      referenceId: validatedData.referenceId,
      location: validatedData.location,
      coordinates: validatedData.coordinates,
      success: false, // Default value, will be updated below
      failureReason: null,
      timestamp: new Date(),
    };

    // If card doesn't exist or is inactive, record a failed transaction
    if (!card || !card.isActive) {
      const failureReason = !card ? "Card not found" : "Card is inactive";
      
      // Create a failed transaction record
      const transaction = await prisma.nFCTransaction.create({
        data: {
          ...transactionData,
          success: false,
          failureReason,
        },
      });

      return NextResponse.json({
        success: false,
        error: failureReason,
        transactionId: transaction.id,
      }, { status: 400 });
    }

    // Card is valid, process the scan type
    let processingResult;

    // Process different scan types
    switch (validatedData.scanType) {
      case "delivery_validation": {
        if (!validatedData.referenceId) {
          return NextResponse.json({
            success: false,
            error: "Reference ID is required for delivery validation",
          }, { status: 400 });
        }

        // Check if this delivery belongs to the card's delivery person
        const delivery = await prisma.delivery.findUnique({
          where: { id: validatedData.referenceId },
        });

        if (!delivery) {
          return NextResponse.json({
            success: false,
            error: "Delivery not found",
          }, { status: 404 });
        }

        if (delivery.deliveryPersonId !== card.deliveryPersonId) {
          // Create a failed transaction record
          const transaction = await prisma.nFCTransaction.create({
            data: {
              ...transactionData,
              success: false,
              failureReason: "Delivery does not belong to this card's delivery person",
            },
          });

          return NextResponse.json({
            success: false,
            error: "Unauthorized for this delivery",
            transactionId: transaction.id,
          }, { status: 403 });
        }

        // Validate the delivery
        processingResult = {
          entityType: "delivery",
          entity: delivery,
          message: "Delivery validated successfully",
        };
        break;
      }

      case "identity_check": {
        // Simple identity verification
        processingResult = {
          entityType: "identity",
          entity: card.deliveryPerson,
          message: "Identity verified successfully",
        };
        break;
      }

      case "warehouse_access": {
        // Validate warehouse access if terminalId is provided
        if (!validatedData.terminalId) {
          return NextResponse.json({
            success: false,
            error: "Terminal ID is required for warehouse access",
          }, { status: 400 });
        }

        // Find the terminal
        const terminal = await prisma.nFCTerminal.findUnique({
          where: { id: validatedData.terminalId },
          include: { warehouse: true },
        });

        if (!terminal) {
          return NextResponse.json({
            success: false,
            error: "Terminal not found",
          }, { status: 404 });
        }

        // Process warehouse access
        processingResult = {
          entityType: "warehouse",
          entity: terminal.warehouse,
          message: "Warehouse access granted",
        };
        break;
      }

      default:
        return NextResponse.json({
          success: false,
          error: "Unsupported scan type",
        }, { status: 400 });
    }

    // Update the card's last used timestamp
    await prisma.nFCCard.update({
      where: { id: card.id },
      data: { lastUsed: new Date() },
    });

    // Create a successful transaction record
    const transaction = await prisma.nFCTransaction.create({
      data: {
        ...transactionData,
        success: true,
        failureReason: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: processingResult.message,
      entityType: processingResult.entityType,
      entity: processingResult.entity,
      transactionId: transaction.id,
    });
  } catch (error: unknown) {
    console.error("Error validating NFC card:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid request data", 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: "Failed to validate NFC card" 
      },
      { status: 500 }
    );
  }
} 