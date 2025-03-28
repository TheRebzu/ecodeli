import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { compare } from "bcryptjs";

// Schema for validating MFA disable request
const mfaDisableSchema = z.object({
  password: z.string().min(1, { message: "Mot de passe requis" })
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const validation = mfaDisableSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { password } = validation.data;
    
    // Find user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true
      }
    });
    
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Verify password before disabling MFA for security
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      );
    }
    
    // Disable MFA
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: []
      }
    });
    
    return NextResponse.json({
      message: "MFA désactivé avec succès"
    });
    
  } catch (error) {
    console.error("Erreur lors de la désactivation MFA:", error);
    return NextResponse.json(
      { error: "Erreur lors de la désactivation MFA" },
      { status: 500 }
    );
  }
} 