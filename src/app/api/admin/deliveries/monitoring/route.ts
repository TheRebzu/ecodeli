import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 400 });
    }

    // Récupérer les statistiques de livraison
    const [
      activeDeliveries,
      totalDeliverers,
      activeDeliverers,
      completedToday,
      cancelledToday,
      delayedDeliveries,
      pendingDeliveries,
    ] = await Promise.all([
      // Livraisons actives
      prisma.delivery.count({
        where: {
          status: {
            in: ["ACCEPTED", "IN_TRANSIT", "PICKED_UP"],
          },
        },
      }),
      // Total livreurs
      prisma.user.count({
        where: { role: "DELIVERER" },
      }),
      // Livreurs actifs (avec livraisons en cours)
      prisma.user.count({
        where: {
          role: "DELIVERER",
          delivererDeliveries: {
            some: {
              status: {
                in: ["ACCEPTED", "IN_TRANSIT", "PICKED_UP"],
              },
            },
          },
        },
      }),
      // Livraisons complétées aujourd'hui
      prisma.delivery.count({
        where: {
          status: "DELIVERED",
          actualDeliveryDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Livraisons annulées aujourd'hui
      prisma.delivery.count({
        where: {
          status: "CANCELLED",
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Livraisons en retard
      prisma.delivery.count({
        where: {
          status: {
            in: ["ACCEPTED", "IN_TRANSIT", "PICKED_UP"],
          },
          deliveryDate: {
            lt: new Date(),
          },
        },
      }),
      // Livraisons en attente
      prisma.delivery.count({
        where: { status: "PENDING" },
      }),
    ]);

    // Calculer le taux de succès
    const totalCompleted = await prisma.delivery.count({
      where: {
        status: { in: ["DELIVERED", "CANCELLED"] },
      },
    });

    const totalDelivered = await prisma.delivery.count({
      where: { status: "DELIVERED" },
    });

    const successRateValue =
      totalCompleted > 0 ? (totalDelivered / totalCompleted) * 100 : 0;

    // Calculer le temps moyen de livraison (simulation)
    const averageDeliveryTime = 2.5; // heures en moyenne

    // Récupérer les livraisons actives avec détails
    const activeDeliveriesData = await prisma.delivery.findMany({
      where: {
        status: {
          in: ["ACCEPTED", "IN_TRANSIT", "PICKED_UP"],
        },
      },
      include: {
        deliverer: {
          select: {
            id: true,
            profile: true,
          },
        },
        announcement: {
          select: {
            id: true,
            pickupAddress: true,
            deliveryAddress: true,
            author: {
              select: {
                id: true,
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Récupérer les problèmes de livraison (utiliser Dispute au lieu de DeliveryIssue)
    const deliveryIssues = await prisma.dispute.findMany({
      where: {
        type: "DELIVERY_ISSUE",
        status: { not: "RESOLVED" },
      },
      include: {
        delivery: {
          include: {
            deliverer: {
              select: {
                id: true,
                profile: true,
              },
            },
            announcement: {
              select: {
                author: {
                  select: {
                    id: true,
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Simuler les localisations des livreurs (en production, ceci viendrait d'un service GPS)
    const delivererLocations = await prisma.user.findMany({
      where: {
        role: "DELIVERER",
        delivererDeliveries: {
          some: {
            status: {
              in: ["ACCEPTED", "IN_TRANSIT", "PICKED_UP"],
            },
          },
        },
      },
      select: {
        id: true,
        profile: true,
        delivererDeliveries: {
          where: {
            status: {
              in: ["ACCEPTED", "IN_TRANSIT", "PICKED_UP"],
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Formater les données pour le frontend
    const formattedActiveDeliveries = activeDeliveriesData.map((delivery) => ({
      id: delivery.id,
      announcementId: delivery.announcementId,
      delivererId: delivery.delivererId,
      delivererName: delivery.deliverer.profile?.firstName
        ? `${delivery.deliverer.profile.firstName} ${delivery.deliverer.profile.lastName}`
        : delivery.deliverer.email || "Livreur Inconnu",
      delivererPhone: delivery.deliverer.profile?.phone || "N/A",
      clientName: delivery.announcement.author.profile?.firstName
        ? `${delivery.announcement.author.profile.firstName} ${delivery.announcement.author.profile.lastName}`
        : delivery.announcement.author.email || "Client Inconnu",
      pickupAddress: delivery.announcement.pickupAddress || "N/A",
      deliveryAddress: delivery.announcement.deliveryAddress || "N/A",
      status: delivery.status,
      createdAt: delivery.createdAt.toISOString(),
      estimatedDeliveryTime:
        delivery.deliveryDate?.toISOString() ||
        delivery.pickupDate?.toISOString() ||
        new Date().toISOString(),
      priority: delivery.priority || "medium",
      packageType: "Standard",
      distance: 0, // À calculer avec un service de géolocalisation
    }));

    const formattedIssues = deliveryIssues.map((issue) => ({
      id: issue.id,
      deliveryId: issue.deliveryId,
      title: issue.title || `Problème de livraison #${issue.id}`,
      description: issue.description || "Aucune description",
      severity: issue.priority || "medium",
      type: issue.type || "DELIVERY_ISSUE",
      createdAt: issue.createdAt.toISOString(),
      isResolved: issue.status === "RESOLVED",
      delivererName: issue.delivery?.deliverer.profile?.firstName
        ? `${issue.delivery.deliverer.profile.firstName} ${issue.delivery.deliverer.profile.lastName}`
        : issue.delivery?.deliverer.email || "Livreur Inconnu",
      clientName: issue.delivery?.announcement?.author.profile?.firstName
        ? `${issue.delivery.announcement.author.profile.firstName} ${issue.delivery.announcement.author.profile.lastName}`
        : issue.delivery?.announcement?.author.email || "Client Inconnu",
    }));

    const formattedLocations = delivererLocations.map((deliverer) => ({
      delivererId: deliverer.id,
      delivererName: deliverer.profile?.firstName
        ? `${deliverer.profile.firstName} ${deliverer.profile.lastName}`
        : "Livreur Inconnu",
      latitude: 48.8566 + (Math.random() - 0.5) * 0.1, // Simulation GPS Paris
      longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
      status: deliverer.delivererDeliveries[0]?.status || "active",
      currentDeliveryId: deliverer.delivererDeliveries[0]?.id,
      lastUpdate: new Date().toISOString(),
      batteryLevel: Math.floor(Math.random() * 100),
      speed: Math.floor(Math.random() * 50) + 10,
    }));

    const stats = {
      activeDeliveries,
      activeDeliverers,
      totalDeliverers,
      averageDeliveryTime: averageDeliveryTime || 0,
      successRate: successRateValue,
      activeDeliveriesChange: 0, // À calculer avec historique
      pendingDeliveries,
      completedToday,
      cancelledToday,
      delayedDeliveries,
    };

    return NextResponse.json({
      stats,
      activeDeliveries: formattedActiveDeliveries,
      issues: formattedIssues,
      delivererLocations: formattedLocations,
    });
  } catch (error) {
    console.error("Error in delivery monitoring API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
