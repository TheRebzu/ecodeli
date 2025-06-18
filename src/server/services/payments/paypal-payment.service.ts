/**
 * Service de paiement PayPal intégré - Remplace les fonctions stub
 * Implémentation complète avec l'API PayPal REST et gestion d'erreurs
 */

import { logger } from "@/lib/utils/logger";
import { prisma } from "@/server/db";
import { PrismaClient } from "@prisma/client";

// Types PayPal
export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: "sandbox" | "live";
  webhookId?: string;
}

export interface PayPalPayment {
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface PayPalPaymentResult {
  success: boolean;
  paymentId?: string;
  approvalUrl?: string;
  error?: string;
  details?: any;
}

export interface PayPalRefund {
  paymentId: string;
  amount?: number; // Si non spécifié, remboursement total
  reason?: string;
  description?: string;
}

export interface PayPalRefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
  details?: any;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: any;
  create_time: string;
  event_version: string;
}

export class PayPalPaymentService {
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    private config: PayPalConfig,
    private prisma: PrismaClient = prisma,
  ) {
    this.baseUrl = config.mode === "sandbox" 
      ? "https://api-m.sandbox.paypal.com" 
      : "https://api-m.paypal.com";
  }

  /**
   * Obtient un token d'accès PayPal valide
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Vérifier si le token actuel est encore valide
      if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'fr_FR',
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Erreur authentification PayPal: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      // Le token expire généralement dans 32400 secondes (9h), on prend une marge
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);

      logger.info("Token d'accès PayPal obtenu avec succès");
      return this.accessToken;
    } catch (error) {
      logger.error("Erreur lors de l'obtention du token PayPal:", error);
      throw error;
    }
  }

  /**
   * Crée un paiement PayPal
   */
  async createPayment(payment: PayPalPayment): Promise<PayPalPaymentResult> {
    try {
      const accessToken = await this.getAccessToken();

      const paymentData = {
        intent: "sale",
        payer: {
          payment_method: "paypal"
        },
        transactions: [{
          amount: {
            total: payment.amount.toFixed(2),
            currency: payment.currency
          },
          description: payment.description,
          custom: JSON.stringify(payment.metadata || {}),
          item_list: {
            items: [{
              name: payment.description,
              sku: `ecodeli-${Date.now()}`,
              price: payment.amount.toFixed(2),
              currency: payment.currency,
              quantity: 1
            }]
          }
        }],
        redirect_urls: {
          return_url: payment.returnUrl,
          cancel_url: payment.cancelUrl
        }
      };

      const response = await fetch(`${this.baseUrl}/v1/payments/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'fr_FR',
        },
        body: JSON.stringify(paymentData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        logger.error("Erreur création paiement PayPal:", responseData);
        return {
          success: false,
          error: responseData.message || "Erreur lors de la création du paiement",
          details: responseData
        };
      }

      // Trouver l'URL d'approbation
      const approvalUrl = responseData.links?.find(
        (link: any) => link.rel === "approval_url"
      )?.href;

      // Sauvegarder le paiement en base
      await this.savePaymentToDatabase({
        paypalPaymentId: responseData.id,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        status: "CREATED",
        metadata: {
          ...payment.metadata,
          paypalResponse: responseData
        }
      });

      logger.info(`Paiement PayPal créé: ${responseData.id}`);

      return {
        success: true,
        paymentId: responseData.id,
        approvalUrl,
        details: responseData
      };
    } catch (error) {
      logger.error("Erreur lors de la création du paiement PayPal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  /**
   * Exécute un paiement PayPal après approbation
   */
  async executePayment(paymentId: string, payerId: string): Promise<PayPalPaymentResult> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/payments/payment/${paymentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          payer_id: payerId
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        logger.error("Erreur exécution paiement PayPal:", responseData);
        
        // Mettre à jour le statut en base
        await this.updatePaymentStatus(paymentId, "FAILED", responseData);

        return {
          success: false,
          error: responseData.message || "Erreur lors de l'exécution du paiement",
          details: responseData
        };
      }

      // Mettre à jour le statut en base
      await this.updatePaymentStatus(paymentId, "COMPLETED", responseData);

      logger.info(`Paiement PayPal exécuté avec succès: ${paymentId}`);

      return {
        success: true,
        paymentId,
        details: responseData
      };
    } catch (error) {
      logger.error("Erreur lors de l'exécution du paiement PayPal:", error);
      
      // Mettre à jour le statut en base
      await this.updatePaymentStatus(paymentId, "FAILED", { error: error instanceof Error ? error.message : "Erreur inconnue" });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  /**
   * Effectue un remboursement PayPal
   */
  async refundPayment(refund: PayPalRefund): Promise<PayPalRefundResult> {
    try {
      const accessToken = await this.getAccessToken();

      // D'abord, récupérer les détails du paiement pour obtenir l'ID de la vente
      const paymentDetails = await this.getPaymentDetails(refund.paymentId);
      if (!paymentDetails.success) {
        return {
          success: false,
          error: "Impossible de récupérer les détails du paiement"
        };
      }

      // Trouver l'ID de la transaction de vente
      const saleId = paymentDetails.details?.transactions?.[0]?.related_resources?.[0]?.sale?.id;
      if (!saleId) {
        return {
          success: false,
          error: "ID de vente non trouvé dans le paiement"
        };
      }

      // Préparer les données de remboursement
      const refundData: any = {};
      
      if (refund.amount) {
        refundData.amount = {
          total: refund.amount.toFixed(2),
          currency: paymentDetails.details.transactions[0].amount.currency
        };
      }

      if (refund.description) {
        refundData.description = refund.description;
      }

      if (refund.reason) {
        refundData.reason = refund.reason;
      }

      const response = await fetch(`${this.baseUrl}/v1/payments/sale/${saleId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        logger.error("Erreur remboursement PayPal:", responseData);
        return {
          success: false,
          error: responseData.message || "Erreur lors du remboursement",
          details: responseData
        };
      }

      // Sauvegarder le remboursement en base
      await this.saveRefundToDatabase({
        paypalRefundId: responseData.id,
        originalPaymentId: refund.paymentId,
        amount: parseFloat(responseData.amount.total),
        currency: responseData.amount.currency,
        reason: refund.reason,
        status: responseData.state,
        metadata: responseData
      });

      logger.info(`Remboursement PayPal effectué: ${responseData.id}`);

      return {
        success: true,
        refundId: responseData.id,
        amount: parseFloat(responseData.amount.total),
        details: responseData
      };
    } catch (error) {
      logger.error("Erreur lors du remboursement PayPal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  /**
   * Récupère les détails d'un paiement PayPal
   */
  async getPaymentDetails(paymentId: string): Promise<PayPalPaymentResult> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/payments/payment/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        logger.error("Erreur récupération détails paiement PayPal:", responseData);
        return {
          success: false,
          error: responseData.message || "Erreur lors de la récupération des détails",
          details: responseData
        };
      }

      return {
        success: true,
        paymentId,
        details: responseData
      };
    } catch (error) {
      logger.error("Erreur lors de la récupération des détails PayPal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  /**
   * Traite un webhook PayPal
   */
  async processWebhook(headers: Record<string, string>, body: string): Promise<{ success: boolean; processed?: boolean; error?: string }> {
    try {
      // Vérifier la signature du webhook si l'ID webhook est configuré
      if (this.config.webhookId) {
        const isValid = await this.verifyWebhookSignature(headers, body);
        if (!isValid) {
          return {
            success: false,
            error: "Signature webhook invalide"
          };
        }
      }

      const event: PayPalWebhookEvent = JSON.parse(body);
      
      logger.info(`Webhook PayPal reçu: ${event.event_type}`);

      // Traiter selon le type d'événement
      switch (event.event_type) {
        case "PAYMENT.SALE.COMPLETED":
          await this.handlePaymentCompleted(event);
          break;
          
        case "PAYMENT.SALE.DENIED":
          await this.handlePaymentDenied(event);
          break;
          
        case "PAYMENT.SALE.REFUNDED":
          await this.handlePaymentRefunded(event);
          break;
          
        case "PAYMENT.SALE.REVERSED":
          await this.handlePaymentReversed(event);
          break;
          
        default:
          logger.info(`Type d'événement webhook non traité: ${event.event_type}`);
          return { success: true, processed: false };
      }

      // Enregistrer l'événement webhook
      await this.saveWebhookEvent(event);

      return { success: true, processed: true };
    } catch (error) {
      logger.error("Erreur traitement webhook PayPal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }

  /**
   * Méthodes privées pour la gestion des événements webhook
   */
  private async handlePaymentCompleted(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const paymentId = resource.parent_payment;
    
    await this.updatePaymentStatus(paymentId, "COMPLETED", resource);
    logger.info(`Paiement PayPal confirmé via webhook: ${paymentId}`);
  }

  private async handlePaymentDenied(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const paymentId = resource.parent_payment;
    
    await this.updatePaymentStatus(paymentId, "DENIED", resource);
    logger.info(`Paiement PayPal refusé via webhook: ${paymentId}`);
  }

  private async handlePaymentRefunded(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const saleId = resource.sale_id;
    
    // Mettre à jour le remboursement en base
    await this.updateRefundStatus(resource.id, "COMPLETED", resource);
    logger.info(`Remboursement PayPal confirmé via webhook: ${resource.id}`);
  }

  private async handlePaymentReversed(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const paymentId = resource.parent_payment;
    
    await this.updatePaymentStatus(paymentId, "REVERSED", resource);
    logger.info(`Paiement PayPal annulé via webhook: ${paymentId}`);
  }

  /**
   * Vérifie la signature d'un webhook PayPal
   */
  private async verifyWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      const verificationData = {
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: this.config.webhookId,
        webhook_event: JSON.parse(body)
      };

      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      const result = await response.json();
      return result.verification_status === "SUCCESS";
    } catch (error) {
      logger.error("Erreur vérification signature webhook:", error);
      return false;
    }
  }

  /**
   * Méthodes de gestion de la base de données
   */
  private async savePaymentToDatabase(data: {
    paypalPaymentId: string;
    amount: number;
    currency: string;
    description: string;
    status: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.payment.create({
        data: {
          id: data.paypalPaymentId,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          paymentMethod: "PAYPAL",
          metadata: data.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Erreur sauvegarde paiement PayPal:", error);
    }
  }

  private async updatePaymentStatus(paymentId: string, status: string, details?: any): Promise<void> {
    try {
      await this.prisma.payment.updateMany({
        where: { 
          OR: [
            { id: paymentId },
            { metadata: { path: ["paypalResponse", "id"], equals: paymentId } }
          ]
        },
        data: {
          status,
          metadata: details ? { paypalResponse: details } : undefined,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Erreur mise à jour statut paiement:", error);
    }
  }

  private async saveRefundToDatabase(data: {
    paypalRefundId: string;
    originalPaymentId: string;
    amount: number;
    currency: string;
    reason?: string;
    status: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.paymentRefund.create({
        data: {
          id: data.paypalRefundId,
          paymentId: data.originalPaymentId,
          amount: data.amount,
          currency: data.currency,
          reason: data.reason,
          status: data.status,
          metadata: data.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Erreur sauvegarde remboursement PayPal:", error);
    }
  }

  private async updateRefundStatus(refundId: string, status: string, details?: any): Promise<void> {
    try {
      await this.prisma.paymentRefund.updateMany({
        where: { id: refundId },
        data: {
          status,
          metadata: details,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Erreur mise à jour statut remboursement:", error);
    }
  }

  private async saveWebhookEvent(event: PayPalWebhookEvent): Promise<void> {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          id: event.id,
          provider: "PAYPAL",
          eventType: event.event_type,
          resourceType: event.resource_type,
          data: event,
          processed: true,
          createdAt: new Date(event.create_time),
        },
      });
    } catch (error) {
      logger.error("Erreur sauvegarde événement webhook:", error);
    }
  }

  /**
   * Méthodes utilitaires publiques
   */
  async getPaymentStatus(paymentId: string): Promise<string | null> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { status: true },
      });
      return payment?.status || null;
    } catch (error) {
      logger.error("Erreur récupération statut paiement:", error);
      return null;
    }
  }

  async listPayments(userId: string, limit: number = 20, offset: number = 0) {
    try {
      return await this.prisma.payment.findMany({
        where: { 
          userId,
          paymentMethod: "PAYPAL"
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          metadata: true,
        },
      });
    } catch (error) {
      logger.error("Erreur listage paiements PayPal:", error);
      return [];
    }
  }
}

// Factory pour créer le service avec la configuration
export function createPayPalService(): PayPalPaymentService {
  const config: PayPalConfig = {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    mode: (process.env.PAYPAL_MODE as "sandbox" | "live") || "sandbox",
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Configuration PayPal manquante. Veuillez configurer PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET.");
  }

  return new PayPalPaymentService(config);
}

// Export du service configuré
export const paypalPaymentService = createPayPalService();