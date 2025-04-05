import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la session" },
      { status: 500 }
    );
  }
} 