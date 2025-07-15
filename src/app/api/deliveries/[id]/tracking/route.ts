import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { trackingUpdateSchema } from '@/features/deliveries/schemas/delivery.schema';
import { DeliveryTrackingService } from '@/features/deliveries/services/delivery-tracking.service';
import { geocodingService } from '@/features/announcements/services/geocoding.service';

// Helper pour vérifier l'accès à la livraison
async function canAccessTracking(user, deliveryId) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      delivererId: true,
      announcement: { select: { authorId: true } },
    },
  });
  if (!delivery) return false;
  if (user.role === 'ADMIN') return true;
  if (user.id === delivery.delivererId) return true;
  if (user.id === delivery.announcement.authorId) return true;
  return false;
}

// POST: Envoi position livreur
export async function POST(req: NextRequest, context) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;
    const params = await context.params;
    const deliveryId = params.id;
    // Vérifier que le livreur est bien assigné
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { delivererId: true },
    });
    if (!delivery || user.id !== delivery.delivererId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Valider les données
    const body = await req.json();
    const parsed = trackingUpdateSchema.safeParse({ ...body, deliveryId });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }
    // Ajouter la position
    const tracking = await DeliveryTrackingService.addTrackingUpdate(parsed.data);
    return NextResponse.json(tracking, { status: 201 });
  } catch (error) {
    console.error('Error tracking POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Historique des positions + infos carte
export async function GET(req: NextRequest, context) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;
    const params = await context.params;
    const deliveryId = params.id;
    // Vérifier l'accès (client ou livreur)
    const canAccess = await canAccessTracking(user, deliveryId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Charger la livraison avec adresses et livreur
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: true,
        deliverer: {
          include: { profile: true },
        },
        tracking: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
    if (!delivery) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Géocoder les adresses
    let pickupCoordinates = null;
    let deliveryCoordinates = null;
    try {
      const pickupGeocode = await geocodingService.geocodeAddressWithCache(delivery.announcement.pickupAddress);
      if (pickupGeocode) {
        pickupCoordinates = { latitude: pickupGeocode.lat, longitude: pickupGeocode.lng, address: delivery.announcement.pickupAddress };
      }
    } catch (e) { /* ignore */ }
    try {
      const deliveryGeocode = await geocodingService.geocodeAddressWithCache(delivery.announcement.deliveryAddress);
      if (deliveryGeocode) {
        deliveryCoordinates = { latitude: deliveryGeocode.lat, longitude: deliveryGeocode.lng, address: delivery.announcement.deliveryAddress };
      }
    } catch (e) { /* ignore */ }
    // Fallback Paris si échec géocodage
    if (!pickupCoordinates) {
      pickupCoordinates = { latitude: 48.8566, longitude: 2.3522, address: delivery.announcement.pickupAddress };
    }
    if (!deliveryCoordinates) {
      deliveryCoordinates = { latitude: 48.8566, longitude: 2.3522, address: delivery.announcement.deliveryAddress };
    }
    // Historique tracking
    const trackingHistory = delivery.tracking.map((update) => ({
      id: update.id,
      location: update.location ? JSON.parse(update.location) : null,
      timestamp: update.timestamp.toISOString(),
      status: update.status,
    })).filter((u) => u.location);
    // Position actuelle = dernier point
    let currentLocation = null;
    if (trackingHistory.length > 0) {
      const last = trackingHistory[trackingHistory.length - 1];
      if (last.location) {
        currentLocation = {
          latitude: last.location.latitude,
          longitude: last.location.longitude,
          address: undefined,
          timestamp: last.timestamp,
        };
      }
    }
    // Infos livreur
    let deliverer = null;
    if (delivery.deliverer) {
      deliverer = {
        id: delivery.deliverer.id,
        firstName: delivery.deliverer.profile?.firstName || '',
        lastName: delivery.deliverer.profile?.lastName || '',
        phone: delivery.deliverer.profile?.phone || '',
      };
    }
    // Estimation d'arrivée (optionnel)
    let estimatedDeliveryTime = null;
    if (delivery.status === 'IN_TRANSIT') {
      estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h plus tard (exemple)
    }
    // Progression (optionnel)
    let progress = 0;
    if (delivery.status === 'DELIVERED') progress = 100;
    else if (delivery.status === 'IN_TRANSIT') progress = 60;
    else if (delivery.status === 'ACCEPTED') progress = 20;
    // Updates (optionnel)
    const updates = delivery.tracking.map((update) => ({
      id: update.id,
      message: update.message,
      timestamp: update.timestamp.toISOString(),
      location: update.location ? JSON.stringify(update.location) : undefined,
      status: update.status,
    }));
    // Retourner le format attendu par DeliveryTrackingMap
    return NextResponse.json({
      deliveryId: delivery.id,
      status: delivery.status,
      pickupLocation: pickupCoordinates,
      deliveryLocation: deliveryCoordinates,
      currentLocation,
      trackingHistory,
      deliverer,
      estimatedDeliveryTime,
      progress,
      updates,
    });
  } catch (error) {
    console.error('Error tracking GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 