import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }

    // Enregistrer ou mettre à jour le playerId OneSignal pour l'utilisateur
    await db.user.update({
      where: { id: session.user.id },
      data: {
        pushNotificationId: playerId,
        pushNotificationsEnabled: true}});

    // Enregistrer dans l'historique des notifications
    await db.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: {
        push: true,
        pushPlayerId: playerId,
        updatedAt: new Date()},
      create: {
        userId: session.user.id,
        email: true,
        sms: false,
        push: true,
        pushPlayerId: playerId}});

    return NextResponse.json({ success: true,
      message: "Push notifications enabled successfully" });
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Désactiver les notifications push pour l'utilisateur
    await db.user.update({
      where: { id: session.user.id },
      data: {
        pushNotificationId: null,
        pushNotificationsEnabled: false}});

    // Mettre à jour les préférences
    await db.notificationPreference.update({
      where: { userId: session.user.id },
      data: {
        push: false,
        pushPlayerId: null,
        updatedAt: new Date()}});

    return NextResponse.json({ success: true,
      message: "Push notifications disabled successfully" });
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    );
  }
}