import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil client complet
    const clientProfile = await db.client.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        announcements: {
          select: {
            id: true,
            basePrice: true,
            status: true,
          },
        },
        bookings: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
          select: {
            id: true,
            amount: true,
          },
        },
        storageBoxes: {
          select: { id: true },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
          },
        },
      },
    });

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 },
      );
    }

    // Calculer les statistiques
    const completedOrders = clientProfile.bookings.filter(
      (b) => b.status === "COMPLETED",
    );
    const totalSpent = clientProfile.payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );
    const averageRating =
      clientProfile.reviews.length > 0
        ? clientProfile.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          clientProfile.reviews.length
        : 0;
    const cancelledOrders = clientProfile.bookings.filter(
      (b) => b.status === "CANCELLED",
    ).length;

    // Construire le profil transformé
    const profile = {
      id: clientProfile.id,
      userId: clientProfile.userId,
      user: {
        name: clientProfile.user.name,
        email: clientProfile.user.email,
        phone: clientProfile.user.profile?.phone,
        image: clientProfile.user.image,
        address: clientProfile.user.profile?.address,
        city: clientProfile.user.profile?.city,
        postalCode: clientProfile.user.profile?.postalCode,
        country: clientProfile.user.profile?.country,
        dateOfBirth: clientProfile.user.profile?.dateOfBirth?.toISOString(),
      },
      subscriptionPlan: clientProfile.subscriptionPlan || "FREE",
      preferences: {
        notifications: {
          email: clientProfile.emailNotifications !== false,
          sms: clientProfile.smsNotifications === true,
          push: clientProfile.pushNotifications !== false,
        },
      },
      stats: {
        totalOrders: clientProfile.bookings.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageRating: Math.round(averageRating * 10) / 10,
        completedOrders: completedOrders.length,
        cancelledOrders,
        totalReviews: clientProfile.reviews.length,
        storageBoxes: clientProfile.storageBoxes.length,
      },
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // Mettre à jour les informations utilisateur (User table)
    const userUpdates: any = {};
    if (updates.name) userUpdates.name = updates.name;
    if (updates.email) userUpdates.email = updates.email;

    // Mettre à jour les informations de profil (Profile table)
    const profileUpdates: any = {};
    if (updates.phone) profileUpdates.phone = updates.phone;
    if (updates.address) profileUpdates.address = updates.address;
    if (updates.city) profileUpdates.city = updates.city;
    if (updates.postalCode) profileUpdates.postalCode = updates.postalCode;
    if (updates.country) profileUpdates.country = updates.country;
    if (updates.dateOfBirth)
      profileUpdates.dateOfBirth = new Date(updates.dateOfBirth);

    // Mettre à jour les préférences client
    const clientUpdates: any = {};
    if (updates.preferences?.notifications) {
      clientUpdates.emailNotifications =
        updates.preferences.notifications.email;
      clientUpdates.smsNotifications = updates.preferences.notifications.sms;
      clientUpdates.pushNotifications = updates.preferences.notifications.push;
    }

    // Transaction pour mettre à jour user, profile et client
    await db.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: userUpdates,
        });
      }

      // Mettre à jour le profil (ou le créer s'il n'existe pas)
      if (Object.keys(profileUpdates).length > 0) {
        await tx.profile.upsert({
          where: { userId: user.id },
          update: profileUpdates,
          create: {
            userId: user.id,
            ...profileUpdates,
          },
        });
      }

      // Mettre à jour le profil client
      if (Object.keys(clientUpdates).length > 0) {
        await tx.client.update({
          where: { userId: user.id },
          data: clientUpdates,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating client profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
