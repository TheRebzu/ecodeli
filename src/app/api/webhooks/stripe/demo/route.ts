import { NextResponse } from 'next/server';
import { paymentService } from '@/server/services/payment.service';
import { db } from '@/server/db';
import { env } from '@/env.mjs';
import { sendNotification } from '@/server/services/notification.service';

/**
 * Route pour simuler les webhooks Stripe en mode démo
 * Cette route permet de créer des événements similaires à ceux de Stripe
 * sans avoir besoin d'une véritable transaction
 */
export async function POST(request: Request) {
  // Vérifier que le mode démo est activé
  if (env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Le mode démo n\'est pas activé' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const { eventType, paymentId, amount, status, metadata = {} } = data;
    
    // Journal des événements en mode démo
    await db.auditLog.create({
      data: {
        entityType: 'PAYMENT',
        entityId: paymentId || 'unknown',
        action: `DEMO_WEBHOOK_${eventType}`,
        performedById: metadata.userId || 'system',
        changes: data
      }
    });
    
    // Traiter différents types d'événements simulés
    switch (eventType) {
      case 'payment_intent.succeeded':
        // Traiter le paiement réussi
        const payment = await paymentService.processSuccessfulPayment(paymentId, amount, {
          ...metadata,
          demoMode: true,
          processedAt: new Date().toISOString()
        });
        
        // Notifier l'utilisateur du paiement réussi
        if (payment && payment.userId) {
          await sendNotification({
            userId: payment.userId,
            title: 'Paiement confirmé',
            message: `Votre paiement de ${amount}€ a été traité avec succès.`,
            type: 'PAYMENT_CONFIRMED',
            link: `/payments/${paymentId}`
          });
        }
        break;
        
      case 'payment_intent.payment_failed':
        // Traiter l'échec du paiement
        await paymentService.processFailedPayment(paymentId, metadata.reason || 'Échec du paiement en mode démo');
        
        // Récupérer les informations du paiement pour la notification
        const failedPayment = await db.payment.findUnique({
          where: { id: paymentId }
        });
        
        // Notifier l'utilisateur de l'échec du paiement
        if (failedPayment && failedPayment.userId) {
          await sendNotification({
            userId: failedPayment.userId,
            title: 'Échec du paiement',
            message: `Votre paiement de ${failedPayment.amount}€ a échoué. ${metadata.reason || 'Veuillez vérifier vos informations de paiement.'}`,
            type: 'ERROR',
            link: `/payments/${paymentId}`
          });
        }
        break;
        
      case 'invoice.payment_succeeded':
        // Traiter le paiement de facture
        await paymentService.processInvoicePayment(metadata.invoiceId, paymentId);
        
        // Récupérer les informations de la facture
        const invoice = await db.invoice.findUnique({
          where: { id: metadata.invoiceId }
        });
        
        // Notifier l'utilisateur du paiement de facture
        if (invoice && invoice.userId) {
          await sendNotification({
            userId: invoice.userId,
            title: 'Facture payée',
            message: `Votre facture ${invoice.number} a été payée avec succès.`,
            type: 'PAYMENT_CONFIRMED',
            link: `/invoices/${invoice.id}`
          });
        }
        break;
        
      case 'payout.paid':
        // Traiter le paiement sortant (retrait)
        await paymentService.processSuccessfulPayout(paymentId, amount, metadata.walletId);
        
        // Récupérer les informations du wallet
        const wallet = await db.wallet.findUnique({
          where: { id: metadata.walletId }
        });
        
        // Notifier l'utilisateur du retrait réussi
        if (wallet && wallet.userId) {
          await sendNotification({
            userId: wallet.userId,
            title: 'Retrait effectué',
            message: `Votre retrait de ${amount}€ a été effectué avec succès. Les fonds devraient arriver sur votre compte dans 2-3 jours ouvrés.`,
            type: 'PAYMENT_CONFIRMED',
            link: `/deliverer/wallet`
          });
        }
        break;
        
      case 'payout.failed':
        // Traiter l'échec du paiement sortant
        // Récupérer les informations du wallet
        const failedWallet = await db.wallet.findUnique({
          where: { id: metadata.walletId }
        });
        
        // Notifier l'utilisateur de l'échec du retrait
        if (failedWallet && failedWallet.userId) {
          await sendNotification({
            userId: failedWallet.userId,
            title: 'Échec du retrait',
            message: `Votre retrait de ${amount}€ a échoué. ${metadata.reason || 'Veuillez vérifier les informations de votre compte bancaire.'}`,
            type: 'ERROR',
            link: `/deliverer/wallet`
          });
        }
        break;
        
      case 'charge.refunded':
        // Traiter un remboursement
        const refundedPayment = await db.payment.findUnique({
          where: { id: paymentId },
          include: { user: true }
        });
        
        if (refundedPayment && refundedPayment.userId) {
          // Mettre à jour le statut du paiement
          await db.payment.update({
            where: { id: paymentId },
            data: { status: 'REFUNDED' }
          });
          
          // Notifier l'utilisateur du remboursement
          await sendNotification({
            userId: refundedPayment.userId,
            title: 'Remboursement effectué',
            message: `Votre paiement de ${refundedPayment.amount}€ a été remboursé. Le montant sera crédité sur votre compte dans 5 à 10 jours ouvrés.`,
            type: 'PAYMENT_REFUNDED',
            link: `/payments/${paymentId}`
          });
        }
        break;
        
      case 'charge.dispute.created':
        // Simuler un litige sur un paiement
        const disputedPayment = await db.payment.findUnique({
          where: { id: paymentId },
          include: { user: true }
        });
        
        if (disputedPayment) {
          // Mettre à jour le statut du paiement
          await db.payment.update({
            where: { id: paymentId },
            data: { 
              status: 'DISPUTED',
              metadata: {
                ...disputedPayment.metadata,
                disputeReason: metadata.reason || 'Contestation client',
                disputeDate: new Date().toISOString()
              }
            }
          });
          
          // Notifier l'utilisateur du litige
          if (disputedPayment.userId) {
            await sendNotification({
              userId: disputedPayment.userId,
              title: 'Paiement contesté',
              message: `Votre paiement de ${disputedPayment.amount}€ fait l'objet d'une contestation. Notre équipe étudie le dossier.`,
              type: 'WARNING',
              link: `/payments/${paymentId}`
            });
          }
          
          // Notifier également les administrateurs
          const admins = await db.user.findMany({
            where: { role: 'ADMIN' }
          });
          
          for (const admin of admins) {
            await sendNotification({
              userId: admin.id,
              title: 'Litige de paiement',
              message: `Un paiement de ${disputedPayment.amount}€ a été contesté. Raison: ${metadata.reason || 'Non spécifiée'}`,
              type: 'ADMIN_ALERT',
              link: `/admin/payments/${paymentId}`
            });
          }
        }
        break;
        
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.deleted':
        // Gérer les événements d'abonnement
        await paymentService.handleSubscriptionEvent(eventType, metadata.subscriptionId, metadata);
        
        // Notifier l'utilisateur du changement d'abonnement
        if (metadata.userId) {
          const messageByEvent = {
            'subscription.created': 'Votre abonnement a été créé avec succès.',
            'subscription.updated': 'Votre abonnement a été mis à jour.',
            'subscription.deleted': 'Votre abonnement a été résilié.'
          };
          
          await sendNotification({
            userId: metadata.userId,
            title: 'Mise à jour de votre abonnement',
            message: messageByEvent[eventType as keyof typeof messageByEvent] || 'Votre abonnement a été modifié.',
            type: 'INFO',
            link: `/subscription`
          });
        }
        break;
        
      default:
        console.log(`[DEMO] Type d'événement non géré: ${eventType}`);
    }
  
    return NextResponse.json({
      success: true,
      message: `Webhook démo traité pour l'événement: ${eventType}`
    });
  } catch (error) {
    console.error('Erreur lors du traitement du webhook démo:', error);
    return NextResponse.json(
      { error: 'Échec du traitement du webhook démo' },
      { status: 500 }
    );
  }
}
