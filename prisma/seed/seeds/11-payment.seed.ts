import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";
import { generateTransactionReference } from "../utils/generators/code-generator";

export async function seedPayments(ctx: SeedContext) {
  const { prisma } = ctx;
  const deliveries = ctx.data.get("deliveries") || [];
  const bookings = ctx.data.get("bookings") || [];

  console.log("   Creating payments and wallets...");

  const payments = [];
  const wallets = [];

  // Récupérer les livreurs et prestataires
  const deliverers = await prisma.deliverer.findMany({
    include: { user: true },
  });

  const providers = await prisma.provider.findMany({
    include: { user: true },
  });

  // 1. Créer des portefeuilles pour les livreurs
  for (const deliverer of deliverers) {
    try {
      const wallet = await prisma.wallet.create({
        data: {
          userId: deliverer.userId,
          balance: 50 + Math.random() * 200, // Entre 50€ et 250€
          currency: "EUR",
          stripeAccountId: `acct_${Math.random().toString(36).substring(2, 15)}`,
          isActive: true,
        },
      });
      wallets.push(wallet);
    } catch (error) {
      // Portefeuille existe déjà
      console.log(`   Wallet already exists for deliverer ${deliverer.id}`);
    }
  }

  // 2. Créer des portefeuilles pour les prestataires
  for (const provider of providers) {
    try {
      const wallet = await prisma.wallet.create({
        data: {
          userId: provider.userId,
          balance: 100 + Math.random() * 500, // Entre 100€ et 600€
          currency: "EUR",
          stripeAccountId: `acct_${Math.random().toString(36).substring(2, 15)}`,
          isActive: true,
        },
      });
      wallets.push(wallet);
    } catch (error) {
      // Portefeuille existe déjà
      console.log(`   Wallet already exists for provider ${provider.id}`);
    }
  }

  // 3. Créer des paiements pour les livraisons
  for (const delivery of deliveries) {
    try {
      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: delivery.clientId },
      });

      if (!user) {
        console.log(
          `   Skipping payment for delivery ${delivery.id} - user ${delivery.clientId} not found`,
        );
        continue;
      }

      const payment = await prisma.payment.create({
        data: {
          userId: delivery.clientId,
          deliveryId: delivery.id,
          amount: delivery.price,
          currency: "EUR",
          status: "COMPLETED",
          type: "DELIVERY",
          paymentMethod: Math.random() > 0.3 ? "STRIPE" : "WALLET",
          stripePaymentId: `pi_${Math.random().toString(36).substring(2, 15)}`,
          metadata: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber,
            type: "delivery_payment",
          },
          paidAt: delivery.actualDeliveryDate || new Date(),
        },
      });
      payments.push(payment);

      // Créer une opération dans le portefeuille du livreur
      const delivererWallet = await prisma.wallet.findUnique({
        where: { userId: delivery.delivererId },
      });

      if (delivererWallet) {
        const delivererEarnings = delivery.delivererFee;

        await prisma.walletOperation.create({
          data: {
            walletId: delivererWallet.id,
            userId: delivery.delivererId,
            type: "CREDIT",
            amount: delivererEarnings,
            description: `Gains livraison ${delivery.trackingNumber}`,
            reference: delivery.id,
            status: "COMPLETED",
            executedAt: delivery.actualDeliveryDate || new Date(),
          },
        });

        // Mettre à jour le solde du portefeuille
        await prisma.wallet.update({
          where: { id: delivererWallet.id },
          data: {
            balance: { increment: delivererEarnings },
          },
        });
      }
    } catch (error) {
      console.log(
        `   Error creating payment for delivery ${delivery.id}:`,
        error.message,
      );
    }
  }

  // 4. Créer des paiements pour les réservations
  for (const booking of bookings) {
    try {
      // Récupérer le client pour obtenir le userId
      const client = await prisma.client.findUnique({
        where: { id: booking.clientId },
        include: { user: true },
      });

      if (!client) {
        console.log(
          `   Skipping payment for booking ${booking.id} - client ${booking.clientId} not found`,
        );
        continue;
      }

      const payment = await prisma.payment.create({
        data: {
          userId: client.userId, // Utiliser le userId du client
          bookingId: booking.id,
          amount: booking.totalPrice,
          currency: "EUR",
          status: "COMPLETED",
          type: "SERVICE",
          paymentMethod: Math.random() > 0.2 ? "STRIPE" : "WALLET",
          stripePaymentId: `pi_${Math.random().toString(36).substring(2, 15)}`,
          metadata: {
            bookingId: booking.id,
            serviceId: booking.serviceId,
            type: "booking_payment",
          },
          paidAt: booking.intervention?.completedAt || new Date(),
        },
      });
      payments.push(payment);

      // Récupérer le prestataire pour obtenir le userId
      const provider = await prisma.provider.findUnique({
        where: { id: booking.providerId },
        include: { user: true },
      });

      if (provider) {
        const providerWallet = await prisma.wallet.findUnique({
          where: { userId: provider.userId },
        });

        if (providerWallet) {
          const providerEarnings = booking.totalPrice * 0.85; // 85% pour le prestataire

          await prisma.walletOperation.create({
            data: {
              walletId: providerWallet.id,
              userId: provider.userId,
              type: "CREDIT",
              amount: providerEarnings,
              description: `Prestation #${booking.id}`,
              reference: booking.id,
              status: "COMPLETED",
              executedAt: booking.intervention?.completedAt || new Date(),
            },
          });

          // Mettre à jour le solde du portefeuille
          await prisma.wallet.update({
            where: { id: providerWallet.id },
            data: {
              balance: { increment: providerEarnings },
            },
          });
        }
      }
    } catch (error) {
      console.log(
        `   Error creating payment for booking ${booking.id}:`,
        error.message,
      );
    }
  }

  // 5. Créer quelques retraits pour les livreurs et prestataires
  const walletsWithBalance = await prisma.wallet.findMany({
    where: { balance: { gt: 100 } },
    include: { user: true },
  });

  for (const wallet of walletsWithBalance.slice(
    0,
    Math.min(5, walletsWithBalance.length),
  )) {
    const withdrawalAmount = Math.min(
      50 + Math.random() * 100,
      wallet.balance * 0.5,
    );

    await prisma.walletOperation.create({
      data: {
        walletId: wallet.id,
        userId: wallet.userId,
        type: "WITHDRAWAL",
        amount: withdrawalAmount,
        description: "Retrait vers compte bancaire",
        reference: `WITHDRAWAL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: "COMPLETED",
        executedAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        ),
      },
    });

    // Mettre à jour le solde
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: withdrawalAmount },
      },
    });
  }

  // 6. Skip platform fee operations for now to avoid foreign key constraint issues
  const platformFees = [];

  console.log(`   Created ${payments.length} payments`);
  console.log(`   Created ${wallets.length} wallets`);
  console.log(
    `   Created withdrawal operations for ${Math.min(5, walletsWithBalance.length)} wallets`,
  );
  console.log(`   Created ${platformFees.length} platform fee operations`);

  return { payments, wallets, platformFees };
}
