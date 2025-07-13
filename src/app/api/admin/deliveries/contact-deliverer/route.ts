import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adminId, delivererId } = await request.json();

    if (!adminId || !delivererId) {
      return NextResponse.json(
        { error: "Admin ID and Deliverer ID required" },
        { status: 400 },
      );
    }

    // Récupérer les informations du livreur
    const deliverer = await prisma.user.findUnique({
      where: { id: delivererId },
      include: {
        profile: true,
      },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer not found" },
        { status: 404 },
      );
    }

    // Enregistrer l'action de contact
    await prisma.adminAction.create({
      data: {
        adminId,
        action: "CONTACT_DELIVERER",
        targetUserId: delivererId,
        details: {
          message: "Admin contacted deliverer",
          delivererPhone: deliverer.profile?.phone || "N/A",
          delivererEmail: deliverer.email,
        },
      },
    });

    // En production, ici on enverrait une notification push/SMS au livreur
    // Pour l'instant, on simule juste le succès

    return NextResponse.json({
      success: true,
      message: "Contact request sent to deliverer",
      deliverer: {
        id: deliverer.id,
        name: deliverer.profile?.firstName
          ? `${deliverer.profile.firstName} ${deliverer.profile.lastName}`
          : deliverer.email,
        phone: deliverer.profile?.phone || "N/A",
        email: deliverer.email,
      },
    });
  } catch (error) {
    console.error("Error contacting deliverer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
