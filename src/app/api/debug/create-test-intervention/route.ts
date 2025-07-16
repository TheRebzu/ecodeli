import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Création intervention de test...");

    // Récupérer l'utilisateur connecté
    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Prestataire requis" },
        { status: 401 },
      );
    }

    // Récupérer le prestataire connecté
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    const client = await db.user.findFirst({
      where: { role: "CLIENT" },
    });

    const serviceRequest = await db.announcement.findFirst({
      where: { type: "HOME_SERVICE" },
    });

    if (!client || !serviceRequest) {
      return NextResponse.json(
        {
          error: "Données de test manquantes",
        },
        { status: 400 },
      );
    }

    // Créer d'abord un booking de test
    const booking = await db.booking.create({
      data: {
        clientId: client.id,
        providerId: provider.id,
        serviceId: serviceRequest.id,
        status: "CONFIRMED",
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        scheduledTime: "10:00",
        duration: 120, // 2 heures
        address: {
          address: "123 Rue de Test",
          city: "Paris",
          postalCode: "75001",
          lat: 48.8566,
          lng: 2.3522
        },
        totalPrice: 50.0,
        notes: "Booking de test pour l'intervention",
      },
    });

    // Créer une intervention de test liée au booking
    const intervention = await db.intervention.create({
      data: {
        bookingId: booking.id,
        providerId: provider.id,
        isCompleted: false,
        report: "Intervention créée pour test",
      },
    });

    console.log("✅ Intervention de test créée:", intervention.id);

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
      },
      intervention: {
        id: intervention.id,
        bookingId: intervention.bookingId,
        providerId: intervention.providerId,
        isCompleted: intervention.isCompleted,
        createdAt: intervention.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Erreur création intervention:", error);
    return NextResponse.json(
      {
        error: "Erreur création intervention",
      },
      { status: 500 },
    );
  }
}
