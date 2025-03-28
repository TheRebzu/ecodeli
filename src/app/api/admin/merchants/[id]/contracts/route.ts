import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating contract data
const contractSchema = z.object({
  contractType: z.string(),
  contractStart: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "La date de début doit être une date valide"
  }),
  contractEnd: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "La date de fin doit être une date valide"
  }).optional(),
});

// GET: Get merchant contract details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    const merchantId = params.id;
    
    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        contractType: true,
        contractStart: true,
        contractEnd: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });
    
    if (!merchant) {
      return NextResponse.json(
        { error: "Commerçant non trouvé" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: merchant });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des détails du contrat:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des détails du contrat" },
      { status: 500 }
    );
  }
}

// POST: Create or update merchant contract
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    const merchantId = params.id;
    
    // Check if merchant exists
    const merchantExists = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    
    if (!merchantExists) {
      return NextResponse.json(
        { error: "Commerçant non trouvé" },
        { status: 404 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = contractSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { data } = validationResult;
    
    // Update the merchant contract
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        contractType: data.contractType,
        contractStart: new Date(data.contractStart),
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
      }
    });
    
    // If contract was approved, also approve the merchant user
    await prisma.user.update({
      where: { id: merchantExists.userId },
      data: {
        status: "APPROVED"
      }
    });
    
    return NextResponse.json({ 
      message: "Contrat mis à jour avec succès",
      data: updatedMerchant 
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour du contrat:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du contrat" },
      { status: 500 }
    );
  }
} 