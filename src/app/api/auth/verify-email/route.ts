import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

// Schema for email verification
const verifyEmailSchema = z.object({
  token: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validationResult = verifyEmailSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: "Token invalide", 
        errors: validationResult.error.errors 
      }, { status: 400 });
    }

    const { token } = validationResult.data;

    // Find the verification request
    const verificationRequest = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationRequest) {
      return NextResponse.json({ 
        success: false, 
        message: "Le lien de vérification est invalide ou a expiré" 
      }, { status: 400 });
    }

    // Check if token is expired (48 hours validity)
    const now = new Date();
    const expiresAt = new Date(verificationRequest.expires);
    
    if (now > expiresAt) {
      // Delete the expired token
      await prisma.verificationToken.delete({
        where: { token },
      });
      
      return NextResponse.json({ 
        success: false, 
        message: "Le lien de vérification a expiré. Veuillez demander un nouveau lien." 
      }, { status: 400 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationRequest.identifier },
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: "Utilisateur non trouvé" 
      }, { status: 404 });
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Votre adresse email a été vérifiée avec succès" 
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de la vérification de l'email" 
    }, { status: 500 });
  }
}

// Create verification token endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ 
      success: false, 
      message: "Email requis" 
    }, { status: 400 });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security reasons, we still return success to avoid email enumeration
      return NextResponse.json({ 
        success: true, 
        message: "Si un compte existe avec cet email, un lien de vérification a été envoyé" 
      });
    }

    if (user.isVerified) {
      return NextResponse.json({ 
        success: true, 
        message: "Cette adresse email est déjà vérifiée" 
      });
    }

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create a new verification token (48 hours validity)
    const expires = new Date();
    expires.setHours(expires.getHours() + 48);

    const verificationToken = await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: randomUUID(),
        expires,
      },
    });

    // TODO: Send verification email with the token
    // In a real application, you would use an email service to send the verification link
    // For now, we'll just return the token in the response (only in development)
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken.token}`;

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ 
        success: true, 
        message: "Un lien de vérification a été envoyé à votre adresse email",
        debug: {
          verificationLink,
          token: verificationToken.token
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Un lien de vérification a été envoyé à votre adresse email" 
    });
  } catch (error) {
    console.error("Create verification token error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de la création du lien de vérification" 
    }, { status: 500 });
  }
} 