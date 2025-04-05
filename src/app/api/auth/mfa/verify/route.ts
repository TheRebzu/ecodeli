import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { z } from "zod";
import { cookies } from "next/headers";
import { encode, decode } from "next-auth/jwt";
import prisma from "@/lib/prisma";

// Define validation schema for MFA verification
const verifyMfaSchema = z.object({
  code: z.string().length(6, { message: "Le code doit contenir 6 chiffres" }),
  email: z.string().email({ message: "Email invalide" }),
});

// Secret used for JWT encoding/decoding
const secret = process.env.NEXTAUTH_SECRET!;

// Verify MFA during login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate the request body
    const validation = verifyMfaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        message: "Données invalides", 
        errors: validation.error.errors 
      }, { status: 400 });
    }

    const { code, email } = validation.data;

    // Check if there's a pending MFA token in cookies
    const pendingMfaToken = cookies().get("pending-mfa-token")?.value;
    if (!pendingMfaToken) {
      return NextResponse.json({ 
        success: false, 
        message: "Session MFA invalide ou expirée" 
      }, { status: 401 });
    }

    // Decode the pending MFA token
    let decoded;
    try {
      decoded = await decode({ token: pendingMfaToken, secret });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        message: "Session MFA invalide ou expirée" 
      }, { status: 401 });
    }

    // Make sure the token contains necessary data
    if (!decoded || !decoded.id || !decoded.email || decoded.email !== email) {
      return NextResponse.json({ 
        success: false, 
        message: "Session MFA invalide ou expirée" 
      }, { status: 401 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaBackupCodes: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ 
        success: false, 
        message: "Utilisateur non trouvé ou MFA non activé" 
      }, { status: 400 });
    }

    // Check if it's a backup code
    if (user.mfaBackupCodes && user.mfaBackupCodes.includes(code)) {
      // Remove the used backup code
      const updatedBackupCodes = user.mfaBackupCodes.filter(c => c !== code);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaBackupCodes: updatedBackupCodes,
          lastLogin: new Date(),
        },
      });

      // Generate a token that indicates successful MFA verification
      const token = await encode({
        token: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          mfaVerified: true,
        },
        secret,
        maxAge: 5 * 60, // 5 minutes to complete login
      });

      // Create response and clear the pending-mfa-token cookie
      const response = NextResponse.json({ 
        success: true, 
        message: "Code de secours valide",
        mfaToken: token,
      });

      // Remove the pending MFA token cookie
      response.cookies.delete("pending-mfa-token");
      
      return response;
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

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
      },
    });

    // Generate a token that indicates successful MFA verification
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mfaVerified: true,
      },
      secret,
      maxAge: 5 * 60, // 5 minutes to complete login
    });

    // Create response and clear the pending-mfa-token cookie
    const response = NextResponse.json({ 
      success: true, 
      message: "Code valide",
      mfaToken: token,
    });

    // Remove the pending MFA token cookie
    response.cookies.delete("pending-mfa-token");
    
    return response;
  } catch (error) {
    console.error("MFA verification error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de la vérification du code" 
    }, { status: 500 });
  }
} 