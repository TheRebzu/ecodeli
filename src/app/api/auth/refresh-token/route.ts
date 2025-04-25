import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "Token de rafraîchissement manquant" },
        { status: 400 }
      );
    }

    // Vérifier si le token existe en base de données
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
      include: {
        user: true,
      },
    });

    if (!refreshTokenRecord) {
      return NextResponse.json(
        { success: false, message: "Token de rafraîchissement invalide" },
        { status: 401 }
      );
    }

    // Vérifier si le token n'est pas expiré
    if (new Date() > refreshTokenRecord.expiresAt) {
      // Supprimer le token expiré
      await prisma.refreshToken.delete({
        where: {
          id: refreshTokenRecord.id,
        },
      });

      return NextResponse.json(
        { success: false, message: "Token de rafraîchissement expiré" },
        { status: 401 }
      );
    }

    // Générer un nouveau token JWT
    const user = refreshTokenRecord.user;
    
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "15m" }
    );

    // Générer un nouveau token de rafraîchissement
    const newRefreshToken = jwt.sign(
      {
        sub: user.id,
        tokenId: refreshTokenRecord.id,
      },
      process.env.JWT_REFRESH_SECRET || "refresh-secret",
      { expiresIn: "7d" }
    );

    // Mettre à jour le token de rafraîchissement
    await prisma.refreshToken.update({
      where: {
        id: refreshTokenRecord.id,
      },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      },
    });

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token:", error);
    
    if (error instanceof TRPCError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.code === "UNAUTHORIZED" ? 401 : 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Une erreur s'est produite lors du rafraîchissement du token" },
      { status: 500 }
    );
  }
}
