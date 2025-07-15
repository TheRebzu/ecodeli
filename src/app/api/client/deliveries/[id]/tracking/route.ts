import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { geocodingService } from '@/features/announcements/services/geocoding.service';

// GET - Données de suivi d'une livraison
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est bien le client de cette livraison
    const delivery = await prisma.delivery.findFirst({
      where: {
        id,
        announcement: {
          authorId: user.id,
        },
      },
      include: {
        announcement: {
          select: {
            title: true,
            pickupAddress: true,
            deliveryAddress: true,
          },
        },
        deliverer: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        tracking: {
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 },
      );
    }

    // Géocoder les adresses pour obtenir les vraies coordonnées
    let pickupCoordinates = null;
    let deliveryCoordinates = null;
    try {
      const pickupGeocode = await geocodingService.geocodeAddressWithCache(delivery.announcement.pickupAddress);
      if (pickupGeocode) {
        pickupCoordinates = { lat: pickupGeocode.lat, lng: pickupGeocode.lng };
      }
    } catch (e) { /* ignore */ }
    try {
      const deliveryGeocode = await geocodingService.geocodeAddressWithCache(delivery.announcement.deliveryAddress);
      if (deliveryGeocode) {
        deliveryCoordinates = { lat: deliveryGeocode.lat, lng: deliveryGeocode.lng };
      }
    } catch (e) { /* ignore */ }
    // Fallback Paris si échec géocodage
    if (!pickupCoordinates) {
      pickupCoordinates = { lat: 48.8566, lng: 2.3522 };
    }
    if (!deliveryCoordinates) {
      deliveryCoordinates = { lat: 48.8566, lng: 2.3522 };
    }

    // Estimation d'arrivée (si en cours)
    let estimatedArrival = null;
    if (delivery.status === "IN_TRANSIT") {
      estimatedArrival = new Date(
        Date.now() + Math.random() * 60 * 60 * 1000 + 30 * 60 * 1000,
      ).toISOString(); // Entre 30 min et 1h30
    }

    // Historique réel des positions (tracking)
    const trackingHistory = delivery.tracking
      .map((update) => {
        if (!update.location) return null;
        let loc;
        try {
          loc = typeof update.location === 'string' ? JSON.parse(update.location) : update.location;
        } catch {
          return null;
        }
        return {
          id: update.id,
          location: {
            latitude: loc.latitude ?? loc.lat,
            longitude: loc.longitude ?? loc.lng,
            address: loc.address || undefined,
          },
          timestamp: update.timestamp.toISOString(),
          status: update.status,
        };
      })
      .filter(Boolean);

    // Position actuelle = dernier point réel
    let currentLocation = null;
    if (trackingHistory.length > 0) {
      const last = trackingHistory[trackingHistory.length - 1];
      if (last.location) {
        currentLocation = {
          latitude: last.location.latitude,
          longitude: last.location.longitude,
          address: last.location.address,
          timestamp: last.timestamp,
        };
      }
    }

    // Créer des mises à jour de suivi par défaut si aucune n'existe
    let updates = delivery.tracking.map((update) => ({
      id: update.id,
      message: update.message,
      timestamp: update.timestamp.toISOString(),
      location: update.location,
      status: update.status,
    }));

    // Ajouter des mises à jour par défaut selon le statut
    if (updates.length === 0) {
      const baseUpdates = [];

      if (
        ["PENDING", "ACCEPTED", "IN_TRANSIT", "DELIVERED"].includes(
          delivery.status,
        )
      ) {
        baseUpdates.push({
          id: "created",
          message: "Livraison créée",
          timestamp: delivery.createdAt.toISOString(),
          status: "PENDING",
        });
      }

      if (["ACCEPTED", "IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
        baseUpdates.push({
          id: "accepted",
          message: "Livraison acceptée par un livreur",
          timestamp: new Date(
            delivery.createdAt.getTime() + 30 * 60 * 1000,
          ).toISOString(), // +30 min
          status: "ACCEPTED",
        });
      }

      if (["IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
        baseUpdates.push({
          id: "pickup",
          message: "Colis récupéré",
          timestamp: new Date(
            delivery.createdAt.getTime() + 60 * 60 * 1000,
          ).toISOString(), // +1h
          location: delivery.announcement.pickupAddress,
          status: "IN_TRANSIT",
        });
      }

      if (delivery.status === "DELIVERED") {
        baseUpdates.push({
          id: "delivered",
          message: "Colis livré avec succès",
          timestamp:
            delivery.completedAt?.toISOString() || new Date().toISOString(),
          location: delivery.announcement.deliveryAddress,
          status: "DELIVERED",
        });
      }

      updates = baseUpdates.reverse(); // Plus récent en premier
    }

    // Route simulée
    const route = [];
    if (currentLocation) {
      // Créer quelques points sur le trajet
      const numPoints = 3;
      for (let i = 0; i <= numPoints; i++) {
        const progress = i / numPoints;
        if (progress <= Math.random() * 0.7 + 0.1) {
          // Seulement les points déjà parcourus
          route.push({
            lat:
              pickupCoordinates.lat +
              (deliveryCoordinates.lat - pickupCoordinates.lat) * progress,
            lng:
              pickupCoordinates.lng +
              (deliveryCoordinates.lng - pickupCoordinates.lng) * progress,
            timestamp: new Date(
              Date.now() - (numPoints - i) * 10 * 60 * 1000,
            ).toISOString(), // Tous les 10 min
            status: "IN_TRANSIT",
          });
        }
      }
    }

    const trackingData = {
      deliveryId: delivery.id,
      status: delivery.status,
      deliverer: delivery.deliverer?.profile
        ? {
            id: delivery.deliverer.id,
            firstName: delivery.deliverer.profile.firstName || '',
            lastName: delivery.deliverer.profile.lastName || '',
            phone: delivery.deliverer.profile.phone || '',
          }
        : undefined,
      pickupLocation: {
        latitude: pickupCoordinates.lat,
        longitude: pickupCoordinates.lng,
        address: delivery.announcement.pickupAddress,
      },
      deliveryLocation: {
        latitude: deliveryCoordinates.lat,
        longitude: deliveryCoordinates.lng,
        address: delivery.announcement.deliveryAddress,
      },
      currentLocation,
      estimatedDeliveryTime: estimatedArrival,
      trackingHistory,
      progress:
        delivery.status === 'DELIVERED'
          ? 100
          : delivery.status === 'IN_TRANSIT'
          ? 60
          : delivery.status === 'ACCEPTED'
          ? 20
          : 0,
    };

    return NextResponse.json(trackingData);
  } catch (error) {
    console.error("Erreur tracking:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
