import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserProfileStatus } from "@/lib/auth/profile-validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const profileStatus = await getUserProfileStatus(session.user.id, session.user.role);

    return NextResponse.json(profileStatus);
  } catch (error) {
    console.error("Erreur vérification statut profil:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}