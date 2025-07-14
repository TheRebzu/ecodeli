import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificationId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { certificationId  } = await params;

    if (!certificationId) {
      return NextResponse.json(
        { error: "ID certification requis" },
        { status: 400 },
      );
    }

    // Récupérer les modules de la certification
    const modules = await prisma.certificationModule.findMany({
      where: { certificationId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(modules);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des modules" },
      { status: 500 },
    );
  }
}
