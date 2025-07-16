import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";

const notificationTemplates = {
  DELIVERY: {
    NEW_OPPORTUNITY: {
      title: "Nouvelle opportunité de livraison",
      content: "Une nouvelle livraison correspond à votre trajet {route}",
      priority: "high",
    },
    DELIVERY_ACCEPTED: {
      title: "Livraison acceptée",
      content:
        "Votre livraison vers {destination} a été acceptée par {deliverer}",
      priority: "high",
    },
    DELIVERY_COLLECTED: {
      title: "Colis récupéré",
      content: "Votre colis a été récupéré et est en route",
      priority: "normal",
    },
    DELIVERY_COMPLETED: {
      title: "Livraison terminée",
      content:
        "Votre livraison a été effectuée avec succès. Code de validation : {code}",
      priority: "high",
    },
  },
  BOOKING: {
    NEW_BOOKING: {
      title: "Nouvelle réservation",
      content: "Vous avez une nouvelle réservation de {service} le {date}",
      priority: "high",
    },
    BOOKING_CONFIRMED: {
      title: "Réservation confirmée",
      content: "Votre réservation pour {service} est confirmée",
      priority: "normal",
    },
    BOOKING_REMINDER: {
      title: "Rappel de réservation",
      content: "N'oubliez pas votre {service} demain à {time}",
      priority: "normal",
    },
    BOOKING_CANCELLED: {
      title: "Réservation annulée",
      content: "Votre réservation a été annulée. Motif : {reason}",
      priority: "high",
    },
  },
  PAYMENT: {
    PAYMENT_RECEIVED: {
      title: "Paiement reçu",
      content: "Nous avons reçu votre paiement de {amount}€",
      priority: "normal",
    },
    PAYMENT_FAILED: {
      title: "Échec du paiement",
      content: "Le paiement de {amount}€ a échoué. Veuillez réessayer",
      priority: "high",
    },
    WITHDRAWAL_COMPLETED: {
      title: "Retrait effectué",
      content: "Votre retrait de {amount}€ a été traité",
      priority: "normal",
    },
  },
  VALIDATION: {
    DOCUMENT_APPROVED: {
      title: "Document approuvé",
      content: "Votre {document} a été validé",
      priority: "high",
    },
    DOCUMENT_REJECTED: {
      title: "Document rejeté",
      content: "Votre {document} a été rejeté. Motif : {reason}",
      priority: "high",
    },
    ACCOUNT_ACTIVATED: {
      title: "Compte activé",
      content: "Félicitations ! Votre compte est maintenant actif",
      priority: "high",
    },
  },
  SYSTEM: {
    WELCOME: {
      title: "Bienvenue sur EcoDeli",
      content: "Merci de nous avoir rejoint ! Découvrez nos services",
      priority: "normal",
    },
    TUTORIAL_REMINDER: {
      title: "Complétez le tutoriel",
      content:
        "N'oubliez pas de terminer le tutoriel pour débloquer toutes les fonctionnalités",
      priority: "low",
    },
    SUBSCRIPTION_RENEWAL: {
      title: "Renouvellement d'abonnement",
      content: "Votre abonnement {plan} a été renouvelé pour {amount}€",
      priority: "normal",
    },
    MONTHLY_INVOICE: {
      title: "Facture mensuelle disponible",
      content: "Votre facture du mois de {month} est disponible",
      priority: "normal",
    },
  },
};

export async function seedNotifications(ctx: SeedContext) {
  const { prisma } = ctx;
  const users = ctx.data.get("users") || [];
  const deliveries = ctx.data.get("deliveries") || [];
  const bookings = ctx.data.get("bookings") || [];

  console.log("   Creating notifications and preferences...");

  const notifications = [];

  // 1. Créer les préférences de notification pour tous les utilisateurs
  for (const user of users) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {
        emailNotifications: true,
        pushNotifications: user.role !== "ADMIN", // Admins n'ont pas besoin de push
        smsNotifications: user.role === "DELIVERER" || user.role === "PROVIDER",
        announcementMatch: user.role === "DELIVERER",
        deliveryUpdates: user.role === "CLIENT" || user.role === "DELIVERER",
        paymentUpdates: true,
        marketingEmails: user.role === "CLIENT" && Math.random() > 0.5,
      },
      create: {
        userId: user.id,
        emailNotifications: true,
        pushNotifications: user.role !== "ADMIN", // Admins n'ont pas besoin de push
        smsNotifications: user.role === "DELIVERER" || user.role === "PROVIDER",
        announcementMatch: user.role === "DELIVERER",
        deliveryUpdates: user.role === "CLIENT" || user.role === "DELIVERER",
        paymentUpdates: true,
        marketingEmails: user.role === "CLIENT" && Math.random() > 0.5,
      },
    });
  }

  // 2. Créer quelques notifications réelles pour les événements
  const recentDeliveries = await prisma.delivery.findMany({
    include: { client: true, deliverer: true },
    take: 5,
  });

  const recentBookings = await prisma.booking.findMany({
    include: { client: true, service: { include: { provider: true } } },
    take: 5,
  });

  // Notifications pour livraisons
  for (const delivery of recentDeliveries) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: delivery.clientId,
          type: "DELIVERY_UPDATE",
          title: "Livraison mise à jour",
          message: `Votre livraison ${delivery.trackingNumber} est maintenant ${delivery.status}`,
          isRead: Math.random() > 0.3,
          data: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber,
            delivererName: delivery.deliverer.name,
          },
        },
      });
      notifications.push(notification);
    } catch (error) {
      console.log(`   Error creating notification for delivery ${delivery.id}`);
    }
  }

  // Notifications pour prestataires
  for (const booking of recentBookings) {
    try {
      // Récupérer le prestataire pour obtenir le userId
      const provider = await prisma.provider.findUnique({
        where: { id: booking.providerId },
        include: { user: true },
      });

      if (!provider) {
        console.log(
          `   Skipping notification for booking ${booking.id} - provider not found`,
        );
        continue;
      }

      const notification = await prisma.notification.create({
        data: {
          userId: provider.userId,
          type: "BOOKING_NEW",
          title: "Nouvelle réservation",
          message: `Nouvelle réservation de ${booking.client?.name || "Client"} pour ${booking.service?.name || "service"}`,
          isRead: false,
          data: {
            bookingId: booking.id,
            serviceType: booking.service?.type,
            clientName: booking.client?.name,
          },
        },
      });
      notifications.push(notification);
    } catch (error) {
      console.log(`   Error creating notification for booking ${booking.id}`);
    }
  }

  /*
  
  // 2. Notifications de bienvenue pour tous
  for (const user of users) {
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: notificationTemplates.SYSTEM.WELCOME.title,
        message: notificationTemplates.SYSTEM.WELCOME.content,
        priority: notificationTemplates.SYSTEM.WELCOME.priority,
        status: 'READ', // Anciennes notifications déjà lues
        readAt: new Date(user.createdAt.getTime() + 60 * 60 * 1000), // Lue 1h après inscription
        metadata: {
          category: 'welcome',
          actionUrl: '/dashboard'
        }
      }
    })
    notifications.push(notification)
  }
  
  // 3. Notifications pour les livraisons
  for (const delivery of deliveries) {
    const client = users.find((u: any) => u.id === delivery.announcement.userId)
    const deliverer = await prisma.deliverer.findUnique({
      where: { id: delivery.delivererId },
      include: { user: true }
    })
    
    if (!client || !deliverer) continue
    
    // Notification d'acceptation
    if (delivery.status !== 'PENDING') {
      const acceptNotif = await prisma.notification.create({
        data: {
          userId: client.id,
          type: 'DELIVERY',
          title: notificationTemplates.DELIVERY.DELIVERY_ACCEPTED.title,
          message: notificationTemplates.DELIVERY.DELIVERY_ACCEPTED.content
            .replace('{destination}', delivery.deliveryCity)
            .replace('{deliverer}', deliverer.user.profile?.firstName || 'un livreur'),
          priority: 'high',
          status: 'READ',
          readAt: new Date(delivery.createdAt.getTime() + 30 * 60 * 1000),
          relatedEntityId: delivery.id,
          relatedEntityType: 'DELIVERY',
          metadata: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber
          }
        }
      })
      notifications.push(acceptNotif)
    }
    
    // Notification de collecte
    if (['IN_TRANSIT', 'DELIVERED'].includes(delivery.status)) {
      const collectNotif = await prisma.notification.create({
        data: {
          userId: client.id,
          type: 'DELIVERY',
          title: notificationTemplates.DELIVERY.DELIVERY_COLLECTED.title,
          message: notificationTemplates.DELIVERY.DELIVERY_COLLECTED.content,
          priority: 'normal',
          status: 'READ',
          readAt: delivery.actualPickupAt || new Date(),
          relatedEntityId: delivery.id,
          relatedEntityType: 'DELIVERY',
          metadata: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber
          }
        }
      })
      notifications.push(collectNotif)
    }
    
    // Notification de livraison terminée
    if (delivery.status === 'DELIVERED') {
      const completedNotif = await prisma.notification.create({
        data: {
          userId: client.id,
          type: 'DELIVERY',
          title: notificationTemplates.DELIVERY.DELIVERY_COMPLETED.title,
          message: notificationTemplates.DELIVERY.DELIVERY_COMPLETED.content
            .replace('{code}', delivery.validationCode),
          priority: 'high',
          status: 'READ',
          readAt: delivery.actualDeliveryAt || new Date(),
          relatedEntityId: delivery.id,
          relatedEntityType: 'DELIVERY',
          metadata: {
            deliveryId: delivery.id,
            validationCode: delivery.validationCode
          }
        }
      })
      notifications.push(completedNotif)
      
      // Notification pour le livreur aussi
      const delivererNotif = await prisma.notification.create({
        data: {
          userId: deliverer.user.id,
          type: 'PAYMENT',
          title: notificationTemplates.PAYMENT.PAYMENT_RECEIVED.title,
          message: notificationTemplates.PAYMENT.PAYMENT_RECEIVED.content
            .replace('{amount}', delivery.delivererEarnings.toString()),
          priority: 'normal',
          status: Math.random() > 0.3 ? 'READ' : 'UNREAD',
          readAt: Math.random() > 0.3 ? new Date() : null,
          metadata: {
            amount: delivery.delivererEarnings,
            deliveryId: delivery.id
          }
        }
      })
      notifications.push(delivererNotif)
    }
  }
  
  // 4. Notifications pour les réservations
  for (const booking of bookings) {
    const provider = await prisma.provider.findUnique({
      where: { id: booking.providerId },
      include: { user: true }
    })
    
    if (!provider) continue
    
    // Notification nouvelle réservation pour le prestataire
    if (booking.status !== 'CANCELLED') {
      const service = await prisma.service.findUnique({ where: { id: booking.serviceId } })
      
      const newBookingNotif = await prisma.notification.create({
        data: {
          userId: provider.user.id,
          type: 'BOOKING',
          title: notificationTemplates.BOOKING.NEW_BOOKING.title,
          message: notificationTemplates.BOOKING.NEW_BOOKING.content
            .replace('{service}', service?.name || 'service')
            .replace('{date}', booking.scheduledDate.toLocaleDateString('fr-FR')),
          priority: 'high',
          status: booking.status === 'COMPLETED' ? 'READ' : 'UNREAD',
          readAt: booking.status === 'COMPLETED' ? booking.confirmedAt : null,
          relatedEntityId: booking.id,
          relatedEntityType: 'BOOKING',
          metadata: {
            bookingId: booking.id,
            serviceId: booking.serviceId
          }
        }
      })
      notifications.push(newBookingNotif)
    }
    
    // Notification de confirmation pour le client
    if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
      const service = await prisma.service.findUnique({ where: { id: booking.serviceId } })
      
      const confirmNotif = await prisma.notification.create({
        data: {
          userId: booking.clientId,
          type: 'BOOKING',
          title: notificationTemplates.BOOKING.BOOKING_CONFIRMED.title,
          message: notificationTemplates.BOOKING.BOOKING_CONFIRMED.content
            .replace('{service}', service?.name || 'service'),
          priority: 'normal',
          status: 'READ',
          readAt: booking.confirmedAt || new Date(),
          relatedEntityId: booking.id,
          relatedEntityType: 'BOOKING',
          metadata: {
            bookingId: booking.id
          }
        }
      })
      notifications.push(confirmNotif)
    }
  }
  
  // 5. Notifications de validation de documents
  const deliverers = users.filter((u: any) => u.role === 'DELIVERER')
  for (const deliverer of deliverers) {
    if (deliverer.validationStatus === 'VALIDATED') {
      const activationNotif = await prisma.notification.create({
        data: {
          userId: deliverer.id,
          type: 'VALIDATION',
          title: notificationTemplates.VALIDATION.ACCOUNT_ACTIVATED.title,
          message: notificationTemplates.VALIDATION.ACCOUNT_ACTIVATED.content,
          priority: 'high',
          status: 'READ',
          readAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          metadata: {
            validationType: 'account_activation'
          }
        }
      })
      notifications.push(activationNotif)
    } else if (deliverer.validationStatus === 'REJECTED') {
      const rejectionNotif = await prisma.notification.create({
        data: {
          userId: deliverer.id,
          type: 'VALIDATION',
          title: notificationTemplates.VALIDATION.DOCUMENT_REJECTED.title,
          message: notificationTemplates.VALIDATION.DOCUMENT_REJECTED.content
            .replace('{document}', 'permis de conduire')
            .replace('{reason}', 'Document illisible'),
          priority: 'high',
          status: 'READ',
          readAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
          metadata: {
            documentType: 'DRIVING_LICENSE',
            reason: 'Document illisible'
          }
        }
      })
      notifications.push(rejectionNotif)
    }
  }
  
  // 6. Notifications de facturation mensuelle pour les prestataires
  const providers = ctx.data.get('providers') || []
  const currentMonth = new Date().getMonth()
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  
  for (const providerData of providers) {
    if (providerData.provider.isActive) {
      const invoiceNotif = await prisma.notification.create({
        data: {
          userId: providerData.provider.userId,
          type: 'SYSTEM',
          title: notificationTemplates.SYSTEM.MONTHLY_INVOICE.title,
          message: notificationTemplates.SYSTEM.MONTHLY_INVOICE.content
            .replace('{month}', monthNames[(currentMonth - 1 + 12) % 12]),
          priority: 'normal',
          status: Math.random() > 0.7 ? 'UNREAD' : 'READ',
          readAt: Math.random() > 0.7 ? null : new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          metadata: {
            invoiceType: 'monthly',
            month: currentMonth - 1,
            year: new Date().getFullYear()
          }
        }
      })
      notifications.push(invoiceNotif)
    }
  }
  
  */
  console.log(
    `   ✓ Created notification preferences for ${users.length} users`,
  );
  console.log(`   ✓ Created ${notifications.length} notifications`);

  return notifications;
}
