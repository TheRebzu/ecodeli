import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

// Schema for validating login data
const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(1, { message: "Mot de passe requis" }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        status: true,
      }
    });
    
    // User not found
    if (!user) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      );
    }
    
    // Check if user account is active
    if (user.status !== "APPROVED") {
      return NextResponse.json(
        { 
          error: user.status === "PENDING" 
            ? "Votre compte n'a pas encore été vérifié. Veuillez vérifier votre email." 
            : "Votre compte a été suspendu. Veuillez contacter l'administrateur."
        },
        { status: 403 }
      );
    }
    
    // Verify password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      );
    }
    
    // Don't return password in response
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
    
    // Return success with user data
    // Note: NextAuth session will be handled by the front-end after this call
    return NextResponse.json({
      message: "Connexion réussie",
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
} 