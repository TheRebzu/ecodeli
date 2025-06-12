/**
 * Workflow du cycle de vie des annonces
 * Gère les transitions d'état et la logique métier
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/utils/logger';
import { AnnouncementMatchingService } from '../services/matching/announcement-matching.service';
import { PartialDeliveryService } from '../services/matching/partial-delivery.service';

export type AnnouncementStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'MATCHED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'VALIDATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AnnouncementLifecycleEvent {
  id: string;
  announcementId: string;
  eventType: string;
  fromStatus: AnnouncementStatus;
  toStatus: AnnouncementStatus;
  triggeredBy: string;
  triggeredAt: Date;
  metadata?: Record<string, any>;
  reason?: string;
}

export interface AnnouncementWorkflowConfig {
  autoMatchingEnabled: boolean;
  autoAssignmentEnabled: boolean;
  matchingThreshold: number;
  expirationTimeHours: number;
  reminderHours: number[];
  escalationRules: {
    noMatchAfterHours: number;
    noAssignmentAfterHours: number;
    action: 'NOTIFY_ADMIN' | 'INCREASE_PRICE' | 'EXTEND_DEADLINE' | 'SUGGEST_PARTIAL';
  }[];
}

export class AnnouncementLifecycleWorkflow {
  private matchingService: AnnouncementMatchingService;
  private partialDeliveryService: PartialDeliveryService;

  constructor(
    private prisma: PrismaClient,
    private config: AnnouncementWorkflowConfig
  ) {
    this.matchingService = new AnnouncementMatchingService(prisma);
    this.partialDeliveryService = new PartialDeliveryService(prisma);
  }

  /**
   * Démarre le workflow pour une nouvelle annonce
   */
  async startWorkflow(announcementId: string): Promise<void> {
    try {
      await this.logEvent(announcementId, 'WORKFLOW_STARTED', 'DRAFT', 'ACTIVE', 'SYSTEM');

      // Passer l'annonce en statut ACTIVE
      await this.updateAnnouncementStatus(announcementId, 'ACTIVE');

      // Démarrer le matching automatique si activé
      if (this.config.autoMatchingEnabled) {
        await this.triggerMatching(announcementId);
      }

      // Programmer les rappels et escalations
      await this.scheduleReminders(announcementId);
      await this.scheduleEscalations(announcementId);

      logger.info(`Workflow démarré pour l'annonce ${announcementId}`);
    } catch (error) {
      logger.error('Erreur lors du démarrage du workflow:', error);
      throw error;
    }
  }

  /**
   * Traite la correspondance trouvée
   */
  async handleMatchFound(
    announcementId: string,
    matchId: string,
    matchScore: number
  ): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      if (currentStatus !== 'ACTIVE') {
        logger.warn(`Correspondance trouvée pour annonce non active: ${announcementId}`);
        return;
      }

      await this.logEvent(announcementId, 'MATCH_FOUND', 'ACTIVE', 'MATCHED', 'SYSTEM', {
        matchId,
        matchScore,
      });

      await this.updateAnnouncementStatus(announcementId, 'MATCHED');

      // Si l'assignation automatique est activée et le score suffisant
      if (this.config.autoAssignmentEnabled && matchScore >= this.config.matchingThreshold) {
        await this.autoAssignDeliverer(announcementId, matchId);
      } else {
        // Notifier le client de la correspondance trouvée
        await this.notifyClientMatchFound(announcementId, matchId, matchScore);
      }

      logger.info(`Correspondance traitée pour l'annonce ${announcementId}: score ${matchScore}`);
    } catch (error) {
      logger.error('Erreur lors du traitement de correspondance:', error);
    }
  }

  /**
   * Traite l'acceptation d'un livreur par le client
   */
  async handleDelivererAcceptance(
    announcementId: string,
    delivererId: string,
    clientId: string
  ): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      if (currentStatus !== 'MATCHED') {
        throw new Error("L'annonce n'est pas dans un état permettant l'assignation");
      }

      await this.logEvent(announcementId, 'DELIVERER_ACCEPTED', 'MATCHED', 'ASSIGNED', clientId, {
        delivererId,
      });

      await this.updateAnnouncementStatus(announcementId, 'ASSIGNED');
      await this.assignDeliverer(announcementId, delivererId);

      // Initier le processus de paiement sécurisé (escrow)
      await this.initiateEscrowPayment(announcementId);

      // Notifier le livreur de l'assignation
      await this.notifyDelivererAssigned(delivererId, announcementId);

      // Créer les codes de validation
      await this.generateValidationCodes(announcementId);

      logger.info(`Livreur ${delivererId} assigné à l'annonce ${announcementId}`);
    } catch (error) {
      logger.error("Erreur lors de l'acceptation du livreur:", error);
      throw error;
    }
  }

  /**
   * Traite le début de livraison
   */
  async handleDeliveryStarted(announcementId: string, delivererId: string): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      if (currentStatus !== 'ASSIGNED') {
        throw new Error("L'annonce n'est pas assignée");
      }

      await this.logEvent(
        announcementId,
        'DELIVERY_STARTED',
        'ASSIGNED',
        'IN_PROGRESS',
        delivererId
      );

      await this.updateAnnouncementStatus(announcementId, 'IN_PROGRESS');

      // Démarrer le suivi en temps réel
      await this.startRealTimeTracking(announcementId, delivererId);

      // Notifier le client du début de livraison
      await this.notifyClientDeliveryStarted(announcementId);

      logger.info(`Livraison démarrée pour l'annonce ${announcementId}`);
    } catch (error) {
      logger.error('Erreur lors du démarrage de livraison:', error);
      throw error;
    }
  }

  /**
   * Traite la livraison terminée
   */
  async handleDeliveryCompleted(
    announcementId: string,
    delivererId: string,
    deliveryProof: {
      photos: string[];
      signature?: string;
      location: { latitude: number; longitude: number };
      completedAt: Date;
    }
  ): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      if (currentStatus !== 'IN_PROGRESS') {
        throw new Error("La livraison n'est pas en cours");
      }

      await this.logEvent(
        announcementId,
        'DELIVERY_COMPLETED',
        'IN_PROGRESS',
        'DELIVERED',
        delivererId,
        { deliveryProof }
      );

      await this.updateAnnouncementStatus(announcementId, 'DELIVERED');

      // Sauvegarder les preuves de livraison
      await this.saveDeliveryProof(announcementId, deliveryProof);

      // Notifier le client pour validation
      await this.notifyClientForValidation(announcementId);

      // Démarrer le timer de validation automatique (24h)
      await this.scheduleAutoValidation(announcementId);

      logger.info(`Livraison terminée pour l'annonce ${announcementId}`);
    } catch (error) {
      logger.error('Erreur lors de la finalisation de livraison:', error);
      throw error;
    }
  }

  /**
   * Traite la validation par le client
   */
  async handleClientValidation(
    announcementId: string,
    clientId: string,
    validationData: {
      rating: number;
      comment?: string;
      isValid: boolean;
    }
  ): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      if (currentStatus !== 'DELIVERED') {
        throw new Error("La livraison n'est pas en attente de validation");
      }

      if (validationData.isValid) {
        await this.logEvent(
          announcementId,
          'CLIENT_VALIDATION_SUCCESS',
          'DELIVERED',
          'VALIDATED',
          clientId,
          { validationData }
        );

        await this.updateAnnouncementStatus(announcementId, 'VALIDATED');

        // Déclencher le paiement final
        await this.processFinalPayment(announcementId);

        // Finaliser l'annonce
        await this.completeAnnouncement(announcementId);
      } else {
        await this.handleValidationDispute(announcementId, clientId, validationData);
      }

      logger.info(
        `Validation client traitée pour l'annonce ${announcementId}: ${validationData.isValid ? 'succès' : 'dispute'}`
      );
    } catch (error) {
      logger.error('Erreur lors de la validation client:', error);
      throw error;
    }
  }

  /**
   * Traite l'annulation d'une annonce
   */
  async handleAnnouncement(
    announcementId: string,
    cancelledBy: string,
    reason: string
  ): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      // Vérifier si l'annulation est possible
      if (['COMPLETED', 'VALIDATED', 'DELIVERED'].includes(currentStatus)) {
        throw new Error("Impossible d'annuler une livraison terminée");
      }

      await this.logEvent(
        announcementId,
        'ANNOUNCEMENT_CANCELLED',
        currentStatus,
        'CANCELLED',
        cancelledBy,
        { reason }
      );

      await this.updateAnnouncementStatus(announcementId, 'CANCELLED');

      // Gérer les remboursements si nécessaire
      if (['ASSIGNED', 'IN_PROGRESS'].includes(currentStatus)) {
        await this.processRefund(announcementId, reason);
      }

      // Notifier les parties concernées
      await this.notifyAnnouncementCancellation(announcementId, reason);

      logger.info(`Annonce ${announcementId} annulée par ${cancelledBy}: ${reason}`);
    } catch (error) {
      logger.error("Erreur lors de l'annulation:", error);
      throw error;
    }
  }

  /**
   * Traite l'expiration d'une annonce
   */
  async handleAnnouncementExpiration(announcementId: string): Promise<void> {
    try {
      const currentStatus = await this.getAnnouncementStatus(announcementId);

      if (['COMPLETED', 'VALIDATED', 'CANCELLED'].includes(currentStatus)) {
        return; // Déjà dans un état final
      }

      await this.logEvent(
        announcementId,
        'ANNOUNCEMENT_EXPIRED',
        currentStatus,
        'EXPIRED',
        'SYSTEM'
      );

      await this.updateAnnouncementStatus(announcementId, 'EXPIRED');

      // Gérer les remboursements si nécessaire
      if (['ASSIGNED', 'IN_PROGRESS'].includes(currentStatus)) {
        await this.processRefund(announcementId, 'Expiration automatique');
      }

      // Notifier le client
      await this.notifyClientExpiration(announcementId);

      logger.info(`Annonce ${announcementId} expirée automatiquement`);
    } catch (error) {
      logger.error("Erreur lors de l'expiration:", error);
    }
  }

  /**
   * Suggère une livraison partielle
   */
  async suggestPartialDelivery(announcementId: string): Promise<void> {
    try {
      const announcement = await this.getAnnouncement(announcementId);
      if (!announcement) return;

      // Créer un plan de livraison partielle
      const partialPlan = await this.partialDeliveryService.planPartialDelivery(
        announcementId,
        100, // Distance max par segment
        ['WAREHOUSE', 'PARTNER_SHOP']
      );

      if (partialPlan) {
        await this.logEvent(
          announcementId,
          'PARTIAL_DELIVERY_SUGGESTED',
          await this.getAnnouncementStatus(announcementId),
          await this.getAnnouncementStatus(announcementId),
          'SYSTEM',
          {
            partialPlan: {
              totalSegments: partialPlan.totalSegments,
              totalPrice: partialPlan.totalPrice,
            },
          }
        );

        // Notifier le client de la suggestion
        await this.notifyClientPartialDeliverySuggestion(announcementId, partialPlan);
      }

      logger.info(`Livraison partielle suggérée pour l'annonce ${announcementId}`);
    } catch (error) {
      logger.error('Erreur lors de la suggestion de livraison partielle:', error);
    }
  }

  // Méthodes privées de gestion des états et événements
  private async logEvent(
    announcementId: string,
    eventType: string,
    fromStatus: AnnouncementStatus,
    toStatus: AnnouncementStatus,
    triggeredBy: string,
    metadata?: Record<string, any>,
    reason?: string
  ): Promise<void> {
    const event: AnnouncementLifecycleEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      announcementId,
      eventType,
      fromStatus,
      toStatus,
      triggeredBy,
      triggeredAt: new Date(),
      metadata,
      reason,
    };

    // Sauvegarder l'événement (simulation)
    logger.info(
      `Événement workflow: ${eventType} pour ${announcementId} (${fromStatus} → ${toStatus})`
    );
  }

  private async updateAnnouncementStatus(
    announcementId: string,
    status: AnnouncementStatus
  ): Promise<void> {
    // Simulation de mise à jour du statut
    logger.info(`Statut mis à jour: ${announcementId} → ${status}`);
  }

  private async getAnnouncementStatus(announcementId: string): Promise<AnnouncementStatus> {
    // Simulation de récupération du statut
    return 'ACTIVE';
  }

  private async getAnnouncement(announcementId: string): Promise<any> {
    // Simulation de récupération d'annonce
    return { id: announcementId };
  }

  private async triggerMatching(announcementId: string): Promise<void> {
    // Déclencher le processus de matching
    setTimeout(async () => {
      // Simulation d'un matching trouvé
      await this.handleMatchFound(announcementId, 'match-123', 85);
    }, 5000);
  }

  private async autoAssignDeliverer(announcementId: string, matchId: string): Promise<void> {
    // Assignation automatique si le score est suffisant
    logger.info(`Assignation automatique pour ${announcementId}: match ${matchId}`);
  }

  private async scheduleReminders(announcementId: string): Promise<void> {
    // Programmer les rappels selon la configuration
    for (const hours of this.config.reminderHours) {
      setTimeout(
        () => {
          this.sendReminder(announcementId, hours);
        },
        hours * 60 * 60 * 1000
      );
    }
  }

  private async scheduleEscalations(announcementId: string): Promise<void> {
    // Programmer les escalations selon la configuration
    for (const rule of this.config.escalationRules) {
      setTimeout(
        () => {
          this.handleEscalation(announcementId, rule);
        },
        rule.noMatchAfterHours * 60 * 60 * 1000
      );
    }
  }

  private async sendReminder(announcementId: string, hours: number): Promise<void> {
    logger.info(`Rappel envoyé pour l'annonce ${announcementId} après ${hours}h`);
  }

  private async handleEscalation(announcementId: string, rule: any): Promise<void> {
    const currentStatus = await this.getAnnouncementStatus(announcementId);

    if (currentStatus === 'ACTIVE' && rule.action === 'SUGGEST_PARTIAL') {
      await this.suggestPartialDelivery(announcementId);
    }

    logger.info(`Escalation traitée pour ${announcementId}: ${rule.action}`);
  }

  // Méthodes de notification (simulation)
  private async notifyClientMatchFound(
    announcementId: string,
    matchId: string,
    matchScore: number
  ): Promise<void> {
    logger.info(
      `Notification client: correspondance trouvée (${matchScore}%) pour ${announcementId}`
    );
  }

  private async notifyDelivererAssigned(
    delivererId: string,
    announcementId: string
  ): Promise<void> {
    logger.info(`Notification livreur ${delivererId}: assigné à ${announcementId}`);
  }

  private async notifyClientDeliveryStarted(announcementId: string): Promise<void> {
    logger.info(`Notification client: livraison démarrée pour ${announcementId}`);
  }

  private async notifyClientForValidation(announcementId: string): Promise<void> {
    logger.info(`Notification client: validation requise pour ${announcementId}`);
  }

  private async notifyAnnouncementCancellation(
    announcementId: string,
    reason: string
  ): Promise<void> {
    logger.info(`Notification annulation: ${announcementId} - ${reason}`);
  }

  private async notifyClientExpiration(announcementId: string): Promise<void> {
    logger.info(`Notification client: expiration de ${announcementId}`);
  }

  private async notifyClientPartialDeliverySuggestion(
    announcementId: string,
    partialPlan: any
  ): Promise<void> {
    logger.info(`Suggestion livraison partielle envoyée pour ${announcementId}`);
  }

  // Méthodes de traitement des paiements et autres (simulation)
  private async initiateEscrowPayment(announcementId: string): Promise<void> {
    logger.info(`Paiement escrow initié pour ${announcementId}`);
  }

  private async processFinalPayment(announcementId: string): Promise<void> {
    logger.info(`Paiement final traité pour ${announcementId}`);
  }

  private async processRefund(announcementId: string, reason: string): Promise<void> {
    logger.info(`Remboursement traité pour ${announcementId}: ${reason}`);
  }

  private async assignDeliverer(announcementId: string, delivererId: string): Promise<void> {
    logger.info(`Livreur ${delivererId} assigné à ${announcementId}`);
  }

  private async generateValidationCodes(announcementId: string): Promise<void> {
    logger.info(`Codes de validation générés pour ${announcementId}`);
  }

  private async startRealTimeTracking(announcementId: string, delivererId: string): Promise<void> {
    logger.info(`Suivi temps réel démarré: ${announcementId} par ${delivererId}`);
  }

  private async saveDeliveryProof(announcementId: string, deliveryProof: any): Promise<void> {
    logger.info(`Preuve de livraison sauvegardée pour ${announcementId}`);
  }

  private async scheduleAutoValidation(announcementId: string): Promise<void> {
    // Validation automatique après 24h
    setTimeout(
      () => {
        this.handleAutoValidation(announcementId);
      },
      24 * 60 * 60 * 1000
    );
  }

  private async handleAutoValidation(announcementId: string): Promise<void> {
    const currentStatus = await this.getAnnouncementStatus(announcementId);

    if (currentStatus === 'DELIVERED') {
      await this.handleClientValidation(announcementId, 'SYSTEM', {
        rating: 0,
        comment: 'Validation automatique après 24h',
        isValid: true,
      });
    }
  }

  private async handleValidationDispute(
    announcementId: string,
    clientId: string,
    validationData: any
  ): Promise<void> {
    logger.info(`Dispute de validation pour ${announcementId} par ${clientId}`);
    // Logique de gestion des disputes
  }

  private async completeAnnouncement(announcementId: string): Promise<void> {
    await this.logEvent(
      announcementId,
      'ANNOUNCEMENT_COMPLETED',
      'VALIDATED',
      'COMPLETED',
      'SYSTEM'
    );

    await this.updateAnnouncementStatus(announcementId, 'COMPLETED');
    logger.info(`Annonce ${announcementId} terminée avec succès`);
  }
}
