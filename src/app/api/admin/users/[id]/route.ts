import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating user update data
const userUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  role: z.enum(["ADMIN", "CLIENT", "MERCHANT", "COURIER", "PROVIDER"]).optional(),
});

// GET: Admin operations to retrieve specific user details
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
    
    const userId = params.id;
    
    // Fetch the user with detailed information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: true,
        merchant: true,
        courier: true,
        provider: true,
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: user });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de l'utilisateur:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des détails de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PATCH: Update user details
export async function PATCH(
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
    
    const userId = params.id;
    
    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!userExists) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = userUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { data } = validationResult;
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        client: true,
        merchant: true,
        courier: true,
        provider: true,
      }
    });
    
    return NextResponse.json({ 
      message: "Utilisateur mis à jour avec succès",
      data: updatedUser 
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
} 