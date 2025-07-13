import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    console.log(
      "[API] /api/deliverer/profile - User:",
      user ? `${user.email} (${user.id})` : "Aucun utilisateur",
    );
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil livreur complet
    const delivererProfile = await db.deliverer.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            profile: true,
            documents: {
              where: {
                type: {
                  in: ["IDENTITY", "DRIVING_LICENSE", "INSURANCE"],
                },
              },
            },
          },
        },
        routes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            fromAddress: true,
            toAddress: true,
            schedule: true,
          },
        },
        delivererAvailabilities: {
          where: { isActive: true },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
        },
        trackingSessions: {
          where: {
            isActive: true,
            endTime: {
              not: null,
            },
          },
          select: {
            id: true,
            deliveryId: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
    console.log(
      "[API] /api/deliverer/profile - delivererProfile:",
      delivererProfile,
    );

    if (!delivererProfile) {
      return NextResponse.json(
        { error: "Deliverer profile not found" },
        { status: 404 },
      );
    }

    // Récupérer les livraisons du livreur
    const deliveries = await db.delivery.findMany({
      where: { delivererId: user.id },
      select: {
        id: true,
        status: true,
        price: true,
        actualDeliveryDate: true,
        announcement: {
          select: {
            id: true,
            title: true,
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });

    // Calculer les statistiques
    const completedDeliveries = deliveries.filter(
      (d) => d.status === "DELIVERED",
    );
    const totalEarnings = completedDeliveries.reduce(
      (sum, d) => sum + (d.price || 0),
      0,
    );
    const averageRating = delivererProfile.averageRating || 0;
    const totalDeliveries = delivererProfile.totalDeliveries || 0;
    const activeRoutes = delivererProfile.routes.length;
    const pendingDocuments = delivererProfile.user.documents.filter(
      (d) => d.validationStatus === "PENDING",
    ).length;
    const approvedDocuments = delivererProfile.user.documents.filter(
      (d) => d.validationStatus === "APPROVED",
    ).length;

    // Construire le profil transformé
    const profile = {
      id: delivererProfile.id,
      userId: delivererProfile.userId,
      user: {
        name: delivererProfile.user.name,
        email: delivererProfile.user.email,
        phone: delivererProfile.user.profile?.phone,
        image: delivererProfile.user.image,
        address: delivererProfile.user.profile?.address,
        city: delivererProfile.user.profile?.city,
        postalCode: delivererProfile.user.profile?.postalCode,
        country: delivererProfile.user.profile?.country,
        dateOfBirth: delivererProfile.user.profile?.dateOfBirth?.toISOString(),
      },
      deliverer: {
        validationStatus: delivererProfile.validationStatus,
        vehicleType: delivererProfile.vehicleType,
        licensePlate: delivererProfile.licensePlate,
        maxWeight: delivererProfile.maxWeight,
        maxVolume: delivererProfile.maxVolume,
        averageRating,
        totalDeliveries,
        isActive: delivererProfile.isActive,
        nfcCardId: delivererProfile.nfcCardId,
        activatedAt: delivererProfile.activatedAt?.toISOString(),
        lastActiveAt: delivererProfile.lastActiveAt?.toISOString(),
      },
      documents: delivererProfile.user.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        filename: doc.filename,
        validationStatus: doc.validationStatus,
        uploadedAt: doc.createdAt.toISOString(),
        url: doc.url,
      })),
      stats: {
        totalDeliveries,
        completedDeliveries: completedDeliveries.length,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        averageRating: Math.round(averageRating * 10) / 10,
        activeRoutes,
        pendingDocuments,
        approvedDocuments,
        totalReviews: deliveries.reduce(
          (sum, d) => sum + (d.announcement?.reviews?.length || 0),
          0,
        ),
      },
      routes: delivererProfile.routes,
      availabilities: delivererProfile.delivererAvailabilities,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching deliverer profile:", error);
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

    // Mettre à jour les informations livreur
    const delivererUpdates: any = {};
    if (updates.vehicleType) delivererUpdates.vehicleType = updates.vehicleType;
    if (updates.licensePlate)
      delivererUpdates.licensePlate = updates.licensePlate;
    if (updates.maxWeight) delivererUpdates.maxWeight = updates.maxWeight;
    if (updates.maxVolume) delivererUpdates.maxVolume = updates.maxVolume;

    // Transaction pour mettre à jour user, profile et deliverer
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

      // Mettre à jour le profil livreur
      if (Object.keys(delivererUpdates).length > 0) {
        await tx.deliverer.update({
          where: { userId: user.id },
          data: delivererUpdates,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating deliverer profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
