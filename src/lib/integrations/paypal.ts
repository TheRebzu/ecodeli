import axios from 'axios';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
}

export interface PayPalPayout {
  recipientType: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
  amount: {
    value: string;
    currency: string;
  };
  receiver: string;
  note?: string;
  senderItemId?: string;
  recipientWallet?: 'PAYPAL' | 'VENMO';
}

export class PayPalService {
  private baseURL: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: PayPalConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseURL = config.mode === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';
  }

  /**
   * Obtient un token d'accès OAuth2
   */
  private async getAccessToken(): Promise<string> {
    // Vérifie si le token actuel est encore valide
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Le token expire dans response.data.expires_in secondes
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Erreur lors de l\'obtention du token PayPal:', error);
      throw new Error('Impossible d\'obtenir le token d\'accès PayPal');
    }
  }

  /**
   * Crée un payout batch (paiement en lot)
   */
  async createPayoutBatch(
    payouts: PayPalPayout[],
    senderBatchId?: string
  ): Promise<{
    batchId: string;
    batchStatus: string;
    batchHeader: any;
  }> {
    const accessToken = await this.getAccessToken();

    const batchId = senderBatchId || `batch_${Date.now()}`;
    
    const requestBody = {
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: 'Vous avez reçu un paiement d\'EcoDeli',
        email_message: 'Votre retrait EcoDeli a été traité avec succès.',
      },
      items: payouts.map((payout, index) => ({
        recipient_type: payout.recipientType,
        amount: {
          value: payout.amount.value,
          currency: payout.amount.currency,
        },
        receiver: payout.receiver,
        note: payout.note || 'Retrait EcoDeli',
        sender_item_id: payout.senderItemId || `item_${index + 1}`,
        recipient_wallet: payout.recipientWallet || 'PAYPAL',
      })),
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/payments/payouts`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        batchId: response.data.batch_header.payout_batch_id,
        batchStatus: response.data.batch_header.batch_status,
        batchHeader: response.data.batch_header,
      };
    } catch (error: any) {
      console.error('Erreur lors de la création du payout PayPal:', error.response?.data || error);
      throw new Error(
        error.response?.data?.message || 'Erreur lors du traitement du paiement PayPal'
      );
    }
  }

  /**
   * Vérifie le statut d'un payout batch
   */
  async getPayoutBatchStatus(batchId: string): Promise<{
    batchStatus: string;
    totalSuccess: number;
    totalFailed: number;
    items: any[];
  }> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.baseURL}/v1/payments/payouts/${batchId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const batchHeader = response.data.batch_header;
      
      return {
        batchStatus: batchHeader.batch_status,
        totalSuccess: batchHeader.total_success || 0,
        totalFailed: batchHeader.total_failed || 0,
        items: response.data.items || [],
      };
    } catch (error: any) {
      console.error('Erreur lors de la vérification du statut PayPal:', error.response?.data || error);
      throw new Error('Erreur lors de la vérification du statut du paiement');
    }
  }

  /**
   * Annule un payout non traité
   */
  async cancelPayoutItem(payoutItemId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken();

    try {
      await axios.post(
        `${this.baseURL}/v1/payments/payouts-item/${payoutItemId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return true;
    } catch (error: any) {
      console.error('Erreur lors de l\'annulation du payout PayPal:', error.response?.data || error);
      return false;
    }
  }

  /**
   * Vérifie si un compte PayPal existe (par email)
   */
  async verifyPayPalAccount(email: string): Promise<boolean> {
    // PayPal ne fournit pas d'API directe pour vérifier l'existence d'un compte
    // La vérification se fait lors de l'envoi du paiement
    // Cette fonction pourrait être utilisée pour des validations basiques
    
    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Instance singleton pour l'application
let paypalService: PayPalService | null = null;

export function getPayPalService(): PayPalService {
  if (!paypalService) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live';

    if (!clientId || !clientSecret) {
      throw new Error('Configuration PayPal manquante (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)');
    }

    paypalService = new PayPalService({
      clientId,
      clientSecret,
      mode,
    });
  }

  return paypalService;
}