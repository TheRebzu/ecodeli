import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Récupérer un entrepôt spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const warehouse = await prisma.location.findUnique({
      where: { id: id },
      include: {
        warehouses: true,
        storageBoxes: true,
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Entrepôt non trouvé" },
        { status: 404 },
      );
    }

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'entrepôt:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// PUT - Modifier un entrepôt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const {
      name,
      address,
      city,
      postalCode,
      capacity,
      managerName,
      managerEmail,
    } = body;

    // Vérifier que l'entrepôt existe
    const { id } = await params;
    const existingLocation = await prisma.location.findUnique({
      where: { id: id },
      include: { warehouses: true },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Entrepôt non trouvé" },
        { status: 404 },
      );
    }

    // Mettre à jour la location
    const updatedLocation = await prisma.location.update({
      where: { id: id },
      data: {
        name,
        address,
        city,
        postalCode,
      },
    });

    // Mettre à jour le warehouse associé
    if (existingLocation.warehouses && existingLocation.warehouses.length > 0) {
      await prisma.warehouse.update({
        where: { id: existingLocation.warehouses[0].id },
        data: {
          capacity,
          managerName,
          managerEmail,
        },
      });
    }

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Erreur lors de la modification de l'entrepôt:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// PATCH - Fermer/ouvrir temporairement un entrepôt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const { isActive } = body;

    // Vérifier que l'entrepôt existe
    const { id: patchId } = await params;
    const existingLocation = await prisma.location.findUnique({
      where: { id: patchId },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Entrepôt non trouvé" },
        { status: 404 },
      );
    }

    // Mettre à jour le statut actif/inactif
    const updatedLocation = await prisma.location.update({
      where: { id: patchId },
      data: { isActive },
    });

    return NextResponse.json({
      message: isActive
        ? "Entrepôt réactivé avec succès"
        : "Entrepôt fermé temporairement",
      location: updatedLocation,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la modification du statut de l'entrepôt:",
      error,
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// DELETE - Supprimer un entrepôt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Vérifier que l'entrepôt existe
    const { id: deleteId } = await params;
    const existingLocation = await prisma.location.findUnique({
      where: { id: deleteId },
      include: {
        storageBoxes: {
          include: {
            rentals: true,
          },
        },
        warehouses: true,
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Entrepôt non trouvé" },
        { status: 404 },
      );
    }

    // Vérifier s'il y a des box occupées
    const occupiedBoxes = existingLocation.storageBoxes.filter(
      (box: any) => !box.isAvailable,
    );
    if (occupiedBoxes.length > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer l'entrepôt car il contient des box occupées",
          occupiedBoxesCount: occupiedBoxes.length,
        },
        { status: 400 },
      );
    }

    // Vérifier s'il y a des locations actives
    const activeRentals = existingLocation.storageBoxes.flatMap((box: any) =>
      box.rentals.filter(
        (rental: any) => !rental.endDate || new Date(rental.endDate) > new Date(),
      ),
    );
    if (activeRentals.length > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer l'entrepôt car il y a des locations actives",
          activeRentalsCount: activeRentals.length,
        },
        { status: 400 },
      );
    }

    // Supprimer l'entrepôt et toutes ses données associées
    await prisma.$transaction([
      // Supprimer les locations de box
      prisma.storageBoxRental.deleteMany({
        where: {
          storageBox: {
            locationId: (await params).id,
          },
        },
      }),
      // Supprimer les box de stockage
      prisma.storageBox.deleteMany({
        where: { locationId: (await params).id },
      }),
      // Supprimer le warehouse
      prisma.warehouse.deleteMany({
        where: { locationId: (await params).id },
      }),
      // Supprimer la location
      prisma.location.delete({
        where: { id: deleteId },
      }),
    ]);

    return NextResponse.json({
      message: "Entrepôt supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'entrepôt:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
