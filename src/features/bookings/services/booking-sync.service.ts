import { prisma } from "@/lib/db";
import { BookingStatus, PaymentStatus } from "@prisma/client";

/**
 * Service centralisé pour synchroniser les statuts des réservations et paiements
 * Évite les incohérences entre booking.status et payment.status
 */
export class BookingSyncService {
  /**
   * Synchronise le statut d'une réservation quand le paiement change
   */
  static async syncBookingOnPaymentChange(
    paymentId: string,
    newPaymentStatus: PaymentStatus,
  ): Promise<void> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              service: {
                include: {
                  provider: {
                    include: { user: true },
                  },
                },
              },
              client: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!payment?.booking) {
        console.warn(`Payment ${paymentId} has no associated booking`);
        return;
      }

      const booking = payment.booking;
      let newBookingStatus: BookingStatus | null = null;

      // Déterminer le nouveau statut de réservation basé sur le paiement
      switch (newPaymentStatus) {
        case "COMPLETED":
          if (booking.status === "PENDING") {
            newBookingStatus = "CONFIRMED";
          }
          break;

        case "FAILED":
        case "REFUNDED":
          if (["PENDING", "CONFIRMED"].includes(booking.status)) {
            newBookingStatus = "CANCELLED";
          }
          break;

        default:
          // Pas de changement nécessaire
          break;
      }

      if (newBookingStatus) {
        await prisma.$transaction(async (tx) => {
          // Mettre à jour le booking
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: newBookingStatus!,
              updatedAt: new Date(),
            },
          });

          // Créer les notifications appropriées
          if (newBookingStatus === "CONFIRMED") {
            await this.createConfirmationNotifications(
              tx,
              booking,
              payment.amount,
            );
          } else if (newBookingStatus === "CANCELLED") {
            await this.createCancellationNotifications(tx, booking);
          }
        });

        console.log(
          `✅ Booking ${booking.id} status synced: ${booking.status} → ${newBookingStatus}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error syncing booking on payment change:`, error);
      throw error;
    }
  }

  /**
   * Synchronise le paiement quand le statut de réservation change
   */
  static async syncPaymentOnBookingChange(
    bookingId: string,
    newBookingStatus: BookingStatus,
    metadata?: any,
  ): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          payment: true,
          service: {
            include: {
              provider: {
                include: { user: true },
              },
            },
          },
          client: {
            include: { user: true },
          },
        },
      });

      if (!booking) {
        console.warn(`Booking ${bookingId} not found`);
        return;
      }

      // Si pas de paiement existant et booking COMPLETED, créer un paiement
      if (!booking.payment && newBookingStatus === "COMPLETED") {
        await this.createMissingPayment(booking);
        return;
      }

      if (!booking.payment) {
        return; // Pas de paiement à synchroniser
      }

      let newPaymentStatus: PaymentStatus | null = null;

      // Déterminer le nouveau statut de paiement basé sur la réservation
      switch (newBookingStatus) {
        case "COMPLETED":
          if (booking.payment.status === "PENDING") {
            newPaymentStatus = "COMPLETED";
          }
          break;

        case "CANCELLED":
          if (["PENDING", "PROCESSING"].includes(booking.payment.status)) {
            newPaymentStatus = "FAILED";
          }
          break;

        default:
          // Pas de changement nécessaire
          break;
      }

      if (newPaymentStatus) {
        await prisma.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: newPaymentStatus,
            paidAt:
              newPaymentStatus === "COMPLETED"
                ? new Date()
                : booking.payment.paidAt,
            failedAt:
              newPaymentStatus === "FAILED"
                ? new Date()
                : booking.payment.failedAt,
            metadata: {
              ...booking.payment.metadata,
              syncedAt: new Date(),
              syncReason: `booking_status_changed_to_${newBookingStatus}`,
              ...metadata,
            },
            updatedAt: new Date(),
          },
        });

        console.log(
          `✅ Payment ${booking.payment.id} status synced: ${booking.payment.status} → ${newPaymentStatus}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error syncing payment on booking change:`, error);
      throw error;
    }
  }

  /**
   * Force la synchronisation complète d'une réservation
   */
  static async forceSyncBooking(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          payment: true,
          service: {
            include: {
              provider: {
                include: { user: true },
              },
            },
          },
          client: {
            include: { user: true },
          },
        },
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      // Si paiement existe, synchroniser le booking basé sur le paiement
      if (booking.payment) {
        await this.syncBookingOnPaymentChange(
          booking.payment.id,
          booking.payment.status,
        );
      }

      // Synchroniser le paiement basé sur le booking
      await this.syncPaymentOnBookingChange(bookingId, booking.status);

      console.log(`✅ Force sync completed for booking ${bookingId}`);
    } catch (error) {
      console.error(`❌ Error force syncing booking:`, error);
      throw error;
    }
  }

  /**
   * Vérifie et corrige toutes les incohérences
   */
  static async auditAndFixInconsistencies(): Promise<{
    checked: number;
    fixed: number;
    errors: string[];
  }> {
    const results = {
      checked: 0,
      fixed: 0,
      errors: [] as string[],
    };

    try {
      // Trouver toutes les réservations avec paiements
      const bookingsWithPayments = await prisma.booking.findMany({
        include: {
          payment: true,
          service: true,
        },
      });

      for (const booking of bookingsWithPayments) {
        if (!booking.payment) continue;

        results.checked++;

        try {
          const needsSync = this.detectInconsistency(
            booking.status,
            booking.payment.status,
          );

          if (needsSync) {
            await this.forceSyncBooking(booking.id);
            results.fixed++;
            console.log(`✅ Fixed inconsistency for booking ${booking.id}`);
          }
        } catch (error) {
          const errorMsg = `Error fixing booking ${booking.id}: ${error}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(
        `🔍 Audit completed: ${results.checked} checked, ${results.fixed} fixed, ${results.errors.length} errors`,
      );
      return results;
    } catch (error) {
      console.error(`❌ Error during audit:`, error);
      throw error;
    }
  }

  /**
   * Détecte les incohérences entre booking et payment
   */
  private static detectInconsistency(
    bookingStatus: BookingStatus,
    paymentStatus: PaymentStatus,
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
   * Crée un paiement manquant pour une réservation complétée
   */
  private static async createMissingPayment(booking: any): Promise<void> {
    await prisma.payment.create({
      data: {
        userId: booking.clientId,
        bookingId: booking.id,
        amount: booking.totalPrice,
        currency: "EUR",
        status: "COMPLETED",
        type: "SERVICE",
        paymentMethod: "AUTO_SYNC",
        paidAt: booking.scheduledDate,
        metadata: {
          createdBy: "booking_sync_service",
          reason: "missing_payment_for_completed_booking",
          originalBookingDate: booking.scheduledDate,
        },
      },
    });

    console.log(
      `✅ Created missing payment for completed booking ${booking.id}`,
    );
  }

  /**
   * Crée les notifications de confirmation
   */
  private static async createConfirmationNotifications(
    tx: any,
    booking: any,
    amount: number,
  ): Promise<void> {
    await tx.notification.createMany({
      data: [
        {
          userId: booking.client.user.id,
          type: "BOOKING_CONFIRMED",
          title: "Réservation confirmée",
          message: `Votre réservation pour "${booking.service.name}" a été confirmée suite au paiement.`,
          isRead: false,
          data: {
            bookingId: booking.id,
            amount,
            syncedBy: "booking_sync_service",
          },
        },
        {
          userId: booking.service.provider.user.id,
          type: "BOOKING_PAID",
          title: "Nouvelle réservation payée",
          message: `Une réservation pour "${booking.service.name}" a été confirmée et payée.`,
          isRead: false,
          data: {
            bookingId: booking.id,
            amount,
            syncedBy: "booking_sync_service",
          },
        },
      ],
    });
  }

  /**
   * Crée les notifications d'annulation
   */
  private static async createCancellationNotifications(
    tx: any,
    booking: any,
  ): Promise<void> {
    await tx.notification.createMany({
      data: [
        {
          userId: booking.client.user.id,
          type: "BOOKING_CANCELLED",
          title: "Réservation annulée",
          message: `Votre réservation pour "${booking.service.name}" a été annulée suite à un problème de paiement.`,
          isRead: false,
          data: {
            bookingId: booking.id,
            syncedBy: "booking_sync_service",
          },
        },
        {
          userId: booking.service.provider.user.id,
          type: "BOOKING_CANCELLED",
          title: "Réservation annulée",
          message: `Une réservation pour "${booking.service.name}" a été annulée.`,
          isRead: false,
          data: {
            bookingId: booking.id,
            syncedBy: "booking_sync_service",
          },
        },
      ],
    });
  }
}
