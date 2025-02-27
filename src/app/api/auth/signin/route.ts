import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email et mot de passe requis"
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customerProfile: true,
        courierProfile: true,
        merchantProfile: true,
        providerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Utilisateur non trouvé"
        },
        { status: 404 }
      );
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Mot de passe incorrect"
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Votre compte est inactif. Veuillez vérifier votre email ou contacter le support."
        },
        { status: 403 }
      );
    }

    // Préparer l'objet utilisateur à retourner (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    // Déterminer le profil spécifique
    let profile = null;
    switch (user.role) {
      case "CUSTOMER":
        profile = user.customerProfile;
        break;
      case "COURIER":
        profile = user.courierProfile;
        break;
      case "MERCHANT":
        profile = user.merchantProfile;
        break;
      case "PROVIDER":
        profile = user.providerProfile;
        break;
    }

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        profile
      }
    });
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue lors de la connexion"
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      {
        success: false,
        message: "Non authentifié"
      },
      { status: 401 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        customerProfile: session.user.role === "CUSTOMER",
        courierProfile: session.user.role === "COURIER",
        merchantProfile: session.user.role === "MERCHANT",
        providerProfile: session.user.role === "PROVIDER",
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Utilisateur non trouvé"
        },
        { status: 404 }
      );
    }

    // Suppression du mot de passe
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue"
      },
      { status: 500 }
    );
  }
}