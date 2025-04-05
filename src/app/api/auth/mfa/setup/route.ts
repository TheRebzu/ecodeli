import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authenticator } from "otplib";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Define validation schema for MFA setup verification
const verifyMfaSetupSchema = z.object({
  code: z.string().length(6, { message: "Le code doit contenir 6 chiffres" }),
});

// Enable MFA for a user
export async function POST(req: NextRequest) {
  // Verify the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ 
      success: false, 
      message: "Non autorisé" 
    }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { code } = body;

    // Validate the code
    const validation = verifyMfaSetupSchema.safeParse({ code });
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        message: "Code invalide", 
        errors: validation.error.errors 
      }, { status: 400 });
    }

    // Find the user with their MFA secret
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        mfaSecret: true,
        mfaEnabled: true,
      },
    });

    if (!user || !user.mfaSecret) {
      return NextResponse.json({ 
        success: false, 
        message: "Vous devez d'abord générer un secret MFA" 
      }, { status: 400 });
    }

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      return NextResponse.json({ 
        success: false, 
        message: "L'authentification à deux facteurs est déjà activée" 
      }, { status: 400 });
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        message: "Code invalide. Veuillez réessayer." 
      }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
    );

    // Update the user to enable MFA and save backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: backupCodes,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "L'authentification à deux facteurs a été activée avec succès",
      backupCodes,
    });
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de la configuration de l'authentification à deux facteurs" 
    }, { status: 500 });
  }
}

// Generate a new MFA secret for the user
export async function GET(req: NextRequest) {
  // Verify the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ 
      success: false, 
      message: "Non autorisé" 
    }, { status: 401 });
  }

  try {
    // Generate a new secret
    const secret = authenticator.generateSecret();
    
    // Save the secret to the user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        mfaSecret: secret,
        mfaEnabled: false, // Reset MFA to false until verified
      },
    });

    // Generate QR code data URL
    const appName = "EcoDeli";
    const otpauthUrl = authenticator.keyuri(session.user.email!, appName, secret);

    return NextResponse.json({ 
      success: true, 
      secret,
      otpauthUrl,
    });
  } catch (error) {
    console.error("MFA secret generation error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de la génération du secret MFA" 
    }, { status: 500 });
  }
}

// Disable MFA for a user
export async function DELETE(req: NextRequest) {
  // Verify the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ 
      success: false, 
      message: "Non autorisé" 
    }, { status: 401 });
  }

  try {
    // Update the user to disable MFA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "L'authentification à deux facteurs a été désactivée avec succès" 
    });
  } catch (error) {
    console.error("MFA disable error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de la désactivation de l'authentification à deux facteurs" 
    }, { status: 500 });
  }
} 