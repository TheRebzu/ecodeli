import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { warehouseManagementService } from "@/features/warehouses/services/warehouse-management.service";

/**
 * GET /api/warehouses/[id]/tracking
 * Tracker un colis dans un entrepôt spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const announcementId = searchParams.get("announcementId");

    if (!announcementId) {
      return NextResponse.json(
        { error: "ID d'annonce requis" },
        { status: 400 },
      );
    }

    // Vérifier l'accès à cette annonce
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { authorId: true, delivererId: true },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce introuvable" },
        { status: 404 },
      );
    }

    const hasAccess =
      session.user.role === "ADMIN" ||
      announcement.authorId === session.user.id ||
      announcement.delivererId === session.user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer les informations de tracking
    const tracking =
      await warehouseManagementService.trackPackageInWarehouse(announcementId);

    if (!tracking) {
      return NextResponse.json(
        {
          error: "Aucune information de stockage trouvée",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    console.error("Error tracking package in warehouse:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/warehouses/[id]/tracking
 * Mettre à jour le statut d'un colis dans l'entrepôt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Seuls les admins et employés d'entrepôt peuvent modifier le statut
    if (!["ADMIN", "WAREHOUSE_OPERATOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { packageLocationId, newStatus, notes } = body;

    if (!packageLocationId || !newStatus) {
      return NextResponse.json(
        { error: "ID emplacement et nouveau statut requis" },
        { status: 400 },
      );
    }

    // Valider le statut
    const validStatuses = [
      "INCOMING",
      "STORED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "DISPATCHED",
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    // Mettre à jour le statut
    const updated = await db.$transaction(async (tx) => {
      // Mettre à jour l'emplacement
      const packageLocation = await tx.packageLocation.update({
        where: { id: packageLocationId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
        include: {
          announcement: {
            select: { id: true, title: true, authorId: true },
          },
        },
      });

      // Enregistrer le mouvement
      await tx.packageMovement.create({
        data: {
          packageLocationId,
          movementType: "STATUS_UPDATE",
          status: newStatus,
          description: `Statut mis à jour vers ${newStatus}`,
          notes,
          operatorId: session.user.id,
          createdAt: new Date(),
        },
      });

      return packageLocation;
    });

    // Notifier le client du changement de statut
    if (updated.announcement) {
      // TODO: Envoyer notification OneSignal au client
      console.log(
        `Notification à envoyer pour annonce ${updated.announcement.id}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Statut mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating package status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
