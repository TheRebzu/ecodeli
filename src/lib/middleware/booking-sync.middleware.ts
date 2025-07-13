import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingSyncService } from "@/features/bookings/services/booking-sync.service";

/**
 * Middleware pour vérifier et corriger automatiquement
 * les incohérences booking/payment lors des appels API
 */
export async function bookingSyncMiddleware(
  request: NextRequest,
  bookingId?: string,
  paymentId?: string,
) {
  try {
    // Seulement pour les méthodes GET pour éviter les effets de bord
    if (request.method !== "GET") {
      return null;
    }

    let targetBookingId = bookingId;

    // Si paymentId fourni, récupérer le bookingId associé
    if (paymentId && !bookingId) {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { bookingId: true },
      });
      targetBookingId = payment?.bookingId || undefined;
    }

    // Si aucun bookingId, rien à vérifier
    if (!targetBookingId) {
      return null;
    }

    // Vérifier s'il y a une incohérence
    const booking = await prisma.booking.findUnique({
      where: { id: targetBookingId },
      include: { payment: true },
    });

    if (!booking?.payment) {
      return null;
    }

    // Détecter l'incohérence
    const hasInconsistency = detectStatusInconsistency(
      booking.status,
      booking.payment.status,
    );

    if (hasInconsistency) {
      console.log(
        `🔄 Sync inconsistency detected for booking ${targetBookingId}`,
      );

      // Corriger l'incohérence en arrière-plan (non-bloquant)
      BookingSyncService.forceSyncBooking(targetBookingId)
        .then(() => {
          console.log(`✅ Auto-fixed booking ${targetBookingId} sync issue`);
        })
        .catch((error) => {
          console.error(
            `❌ Failed to auto-fix booking ${targetBookingId}:`,
            error,
          );
        });

      // Ajouter un header pour informer le client
      return NextResponse.next({
        headers: {
          "X-Booking-Sync-Status": "fixing-inconsistency",
          "X-Booking-Sync-Id": targetBookingId,
        },
      });
    }

    return null;
  } catch (error) {
    // Ne pas faire échouer la requête pour un problème de sync
    console.error("Error in booking sync middleware:", error);
    return null;
  }
}

/**
 * Détecte les incohérences entre statuts booking et payment
 */
function detectStatusInconsistency(
  bookingStatus: string,
  paymentStatus: string,
): boolean {
  const problematicCombinations = [
    // Paiement complété mais booking pas confirmé
    { booking: "PENDING", payment: "COMPLETED" },
    // Booking complété mais paiement pas complété
    { booking: "COMPLETED", payment: "PENDING" },
    { booking: "COMPLETED", payment: "PROCESSING" },
    // Booking confirmé/en cours mais paiement échoué
    { booking: "CONFIRMED", payment: "FAILED" },
    { booking: "IN_PROGRESS", payment: "FAILED" },
  ];

  return problematicCombinations.some(
    (combo) =>
      combo.booking === bookingStatus && combo.payment === paymentStatus,
  );
}

/**
 * Hook pour les routes API Provider - détection automatique via URL
 */
export async function withProviderBookingSync(
  request: NextRequest,
  response: NextResponse,
  bookingId?: string,
) {
  const syncResult = await bookingSyncMiddleware(request, bookingId);

  if (syncResult) {
    // Merger les headers de sync avec la réponse existante
    syncResult.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

/**
 * Hook pour les routes API Client - détection automatique via URL
 */
export async function withClientBookingSync(
  request: NextRequest,
  response: NextResponse,
  bookingId?: string,
) {
  const syncResult = await bookingSyncMiddleware(request, bookingId);

  if (syncResult) {
    // Merger les headers de sync avec la réponse existante
    syncResult.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

/**
 * Wrapper helper pour les routes API
 */
export function withAutoSync<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  extractBookingId?: (...args: T) => string | undefined,
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const bookingId = extractBookingId ? extractBookingId(...args) : undefined;

    // Exécuter le handler original
    const response = await handler(...args);

    // Appliquer le middleware de sync
    return withProviderBookingSync(request, response, bookingId);
  };
}

/**
 * Exemple d'utilisation dans une route API:
 *
 * export const GET = withAutoSync(
 *   async (request, { params }) => {
 *     // Votre logique API normale
 *     return NextResponse.json(data);
 *   },
 *   (request, { params }) => params.id // Extraire bookingId
 * );
 */
