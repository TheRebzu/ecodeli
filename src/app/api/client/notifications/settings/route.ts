import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Remplacer notificationSettings par notificationPreference (modèle Prisma correct)
    const settings = await db.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      // Créer des paramètres par défaut
      const defaultSettings = await db.notificationPreference.create({
        data: {
          userId: session.user.id,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          announcementMatch: true,
          deliveryUpdates: true,
          paymentUpdates: true,
          marketingEmails: false,
        },
      });

      return NextResponse.json({
        settings: {
          emailNotifications: defaultSettings.emailNotifications,
          pushNotifications: defaultSettings.pushNotifications,
          smsNotifications: defaultSettings.smsNotifications,
          soundEnabled: false,
          quiet: {
            enabled: false,
            startTime: "22:00",
            endTime: "08:00",
          },
          categories: {
            announcementMatch: defaultSettings.announcementMatch,
            deliveryUpdates: defaultSettings.deliveryUpdates,
            paymentUpdates: defaultSettings.paymentUpdates,
            marketingEmails: defaultSettings.marketingEmails,
          },
        },
      });
    }

    return NextResponse.json({
      settings: {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        smsNotifications: settings.smsNotifications,
        soundEnabled: false,
        quiet: {
          enabled: false,
          startTime: "22:00",
          endTime: "08:00",
        },
        categories: {
          announcementMatch: settings.announcementMatch,
          deliveryUpdates: settings.deliveryUpdates,
          paymentUpdates: settings.paymentUpdates,
          marketingEmails: settings.marketingEmails,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des paramètres" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const {
      emailNotifications,
      pushNotifications,
      smsNotifications,
      categories,
    } = body;

    const settings = await db.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: {
        emailNotifications,
        pushNotifications,
        smsNotifications,
        announcementMatch: categories.announcementMatch,
        deliveryUpdates: categories.deliveryUpdates,
        paymentUpdates: categories.paymentUpdates,
        marketingEmails: categories.marketingEmails,
      },
      create: {
        userId: session.user.id,
        emailNotifications,
        pushNotifications,
        smsNotifications,
        announcementMatch: categories.announcementMatch,
        deliveryUpdates: categories.deliveryUpdates,
        paymentUpdates: categories.paymentUpdates,
        marketingEmails: categories.marketingEmails,
      },
    });

    return NextResponse.json({
      settings: {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        smsNotifications: settings.smsNotifications,
        categories: {
          announcementMatch: settings.announcementMatch,
          deliveryUpdates: settings.deliveryUpdates,
          paymentUpdates: settings.paymentUpdates,
          marketingEmails: settings.marketingEmails,
        },
      },
    });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres" },
      { status: 500 },
    );
  }
}
