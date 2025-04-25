import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: "Session non trouvée" },
        { status: 401 }
      );
    }

    // Supprimer la session de la base de données
    await prisma.session.delete({
      where: {
        sessionToken,
      },
    });

    // Supprimer les cookies de session
    cookieStore.delete("next-auth.session-token");
    cookieStore.delete("next-auth.csrf-token");
    cookieStore.delete("next-auth.callback-url");

    return NextResponse.json({ success: true, message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    
    if (error instanceof TRPCError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.code === "UNAUTHORIZED" ? 401 : 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Une erreur s'est produite lors de la déconnexion" },
      { status: 500 }
    );
  }
}
