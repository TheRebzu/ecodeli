import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Récupérer les informations de base du profil provider
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Vérifier que l'utilisateur a le rôle PROVIDER
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "User is not a provider" },
        { status: 403 },
      );
    }

    // Récupérer les informations de base du provider
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                address: true,
                city: true,
                postalCode: true,
                country: true,
              },
            },
          },
        },
        _count: {
          select: {
            services: true,
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({
        provider: null,
        message: "Provider profile not found",
      });
    }

    // Calculer la note moyenne
    const reviews = await prisma.review.findMany({
      where: { providerId: provider.id },
      select: { rating: true },
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return NextResponse.json({
      profile: {
        id: provider.id,
        firstName: provider.user.profile?.firstName || "",
        lastName: provider.user.profile?.lastName || "",
        email: provider.user.email,
        phone: provider.user.profile?.phone || "",
        address: provider.user.profile?.address || "",
        city: provider.user.profile?.city || "",
        postalCode: provider.user.profile?.postalCode || "",
        country: provider.user.profile?.country || "",
        avatar: provider.user.profile?.avatar,
        bio: provider.description || "",
        specialties: provider.specialties || [],
        languages: [], // TODO: Add languages field to provider model
        experience: 0, // TODO: Add experience field to provider model
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        workingHours: {
          start: "09:00",
          end: "18:00",
        },
        isPublicProfile: provider.isActive,
        joinedAt: provider.createdAt.toISOString(),
        isVerified: provider.isVerified,
      },
    });
  } catch (error) {
    console.error("Error fetching provider profile info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Mettre à jour les informations de base du profil provider
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      postalCode,
      country,
      bio,
      specialties,
      isPublicProfile,
    } = body;

    // Trouver le provider existant
    const existingProvider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 },
      );
    }

    // Mettre à jour le profil utilisateur
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode,
        country,
      },
    });

    // Mettre à jour le profil provider
    const updatedProvider = await prisma.provider.update({
      where: { userId: session.user.id },
      data: {
        description: bio,
        specialties,
        isActive: isPublicProfile,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                address: true,
                city: true,
                postalCode: true,
                country: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      profile: {
        id: updatedProvider.id,
        firstName: updatedProvider.user.profile?.firstName || "",
        lastName: updatedProvider.user.profile?.lastName || "",
        email: updatedProvider.user.email,
        phone: updatedProvider.user.profile?.phone || "",
        address: updatedProvider.user.profile?.address || "",
        city: updatedProvider.user.profile?.city || "",
        postalCode: updatedProvider.user.profile?.postalCode || "",
        country: updatedProvider.user.profile?.country || "",
        avatar: updatedProvider.user.profile?.avatar,
        bio: updatedProvider.description || "",
        specialties: updatedProvider.specialties || [],
        languages: [],
        experience: 0,
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        workingHours: {
          start: "09:00",
          end: "18:00",
        },
        isPublicProfile: updatedProvider.isActive,
        joinedAt: updatedProvider.createdAt.toISOString(),
        isVerified: updatedProvider.isVerified,
      },
    });
  } catch (error) {
    console.error("Error updating provider profile info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
} 