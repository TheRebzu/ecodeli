import { Twilio } from 'twilio';
import { TRPCError } from '@trpc/server';

// Types pour les SMS
export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface SMSResponse {
  success: boolean;
  sid?: string;
  errorMessage?: string;
  status?: string;
}

export interface BulkSMSOptions {
  phoneNumbers: string[];
  message: string;
  from?: string;
}

export interface SMSTemplate {
  name: string;
  variables: Record<string, string>;
}

export interface SMSNotificationData {
  userId: string;
  phoneNumber: string;
  template: string;
  variables?: Record<string, string>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduleTime?: Date;
}

/**
 * Service SMS utilisant Twilio pour l'envoi de notifications SMS
 */
export class TwilioSMSService {
  private client: Twilio | null = null;
  private fromNumber: string;
  private accountSid: string;
  private authToken: string;
  private isConfigured: boolean = false;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    // Vérifier la configuration Twilio
    if (this.accountSid && this.authToken && this.fromNumber) {
      try {
        this.client = new Twilio(this.accountSid, this.authToken);
        this.isConfigured = true;
        console.log('✅ Service Twilio SMS initialisé');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation Twilio:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ Configuration Twilio manquante - les SMS sont désactivés');
      this.isConfigured = false;
    }
  }

  /**
   * Vérifie si le service est correctement configuré
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Formate un numéro de téléphone au format international
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Supprimer tous les caractères non numériques sauf le +
    let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Si le numéro commence par 0, remplacer par +33 (France)
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '+33' + cleanNumber.slice(1);
    }
    
    // Si le numéro ne commence pas par +, ajouter +33
    if (!cleanNumber.startsWith('+')) {
      cleanNumber = '+33' + cleanNumber;
    }
    
    return cleanNumber;
  }

  /**
   * Valide un numéro de téléphone
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Vérifier que le numéro formaté ressemble à un numéro valide
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(formatted);
  }

  /**
   * Envoie un SMS simple
   */
  async sendSMS(smsData: SMSMessage): Promise<SMSResponse> {
    if (!this.isReady()) {
      console.warn(`[SMS SERVICE] Configuration Twilio manquante - SMS non envoyé`);
      console.warn(`[SMS SERVICE] Destinataire: ${smsData.to}, Message: ${smsData.body}`);
      return {
        success: false,
        errorMessage: 'Service SMS non configuré - vérifiez les variables d\'environnement TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN',
        status: 'failed'
      };
    }

    try {
      // Valider et formater le numéro de téléphone
      if (!this.validatePhoneNumber(smsData.to)) {
        throw new Error(`Numéro de téléphone invalide: ${smsData.to}`);
      }

      const formattedNumber = this.formatPhoneNumber(smsData.to);
      const fromNumber = smsData.from || this.fromNumber;

      // Limiter la taille du message (160 caractères pour un SMS standard)
      let messageBody = smsData.body;
      if (messageBody.length > 160) {
        messageBody = messageBody.substring(0, 157) + '...';
      }

      // Envoyer le SMS via Twilio
      const message = await this.client!.messages.create({
        body: messageBody,
        from: fromNumber,
        to: formattedNumber
      });

      console.log(`✅ SMS envoyé avec succès à ${formattedNumber} (SID: ${message.sid})`);
      
      return {
        success: true,
        sid: message.sid,
        status: message.status
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi SMS:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      return {
        success: false,
        errorMessage,
        status: 'failed'
      };
    }
  }

  /**
   * Envoie des SMS en lot
   */
  async sendBulkSMS(options: BulkSMSOptions): Promise<{
    successful: number;
    failed: number;
    results: Array<{ phoneNumber: string; success: boolean; sid?: string; error?: string }>;
  }> {
    const results: Array<{ phoneNumber: string; success: boolean; sid?: string; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const phoneNumber of options.phoneNumbers) {
      try {
        const result = await this.sendSMS({
          to: phoneNumber,
          body: options.message,
          from: options.from
        });

        if (result.success) {
          successful++;
          results.push({
            phoneNumber,
            success: true,
            sid: result.sid
          });
        } else {
          failed++;
          results.push({
            phoneNumber,
            success: false,
            error: result.errorMessage
          });
        }

        // Pause de 100ms entre chaque envoi pour éviter les limites de débit
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        failed++;
        results.push({
          phoneNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    return {
      successful,
      failed,
      results
    };
  }

  /**
   * Envoie un SMS de notification avec template
   */
  async sendNotificationSMS(data: SMSNotificationData): Promise<SMSResponse> {
    try {
      const messageBody = this.generateMessageFromTemplate(data.template, data.variables);
      
      // Ajouter des indicateurs de priorité si nécessaire
      let finalMessage = messageBody;
      if (data.priority === 'URGENT') {
        finalMessage = `🚨 URGENT: ${messageBody}`;
      } else if (data.priority === 'HIGH') {
        finalMessage = `⚠️ IMPORTANT: ${messageBody}`;
      }

      return await this.sendSMS({
        to: data.phoneNumber,
        body: finalMessage
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi SMS de notification:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Génère le contenu du message à partir d'un template
   */
  private generateMessageFromTemplate(template: string, variables?: Record<string, string>): string {
    const templates: Record<string, string> = {
      // Notifications de livraison
      'delivery_assigned': 'EcoDeli: Un livreur a été assigné à votre commande. Suivez votre livraison: {{trackingUrl}}',
      'delivery_picked_up': 'EcoDeli: Votre colis a été récupéré par {{delivererName}}. Livraison en cours.',
      'delivery_in_transit': 'EcoDeli: Votre colis est en route. Arrivée estimée: {{eta}}',
      'delivery_nearby': 'EcoDeli: Votre livreur {{delivererName}} arrive dans {{eta}}. Préparez-vous!',
      'delivery_arrived': 'EcoDeli: {{delivererName}} est arrivé à votre adresse avec votre colis.',
      'delivery_completed': 'EcoDeli: Votre colis a été livré! Confirmez la réception: {{confirmUrl}}',
      'delivery_delayed': 'EcoDeli: Votre livraison est retardée de {{delay}}. Nouvelle heure: {{newEta}}',
      
      // Notifications de service
      'service_booked': 'EcoDeli: {{clientName}} a réservé votre service pour le {{date}}',
      'service_reminder': 'EcoDeli: Rappel RDV avec {{providerName}} demain à {{time}}',
      'service_cancelled': 'EcoDeli: Votre RDV du {{date}} a été annulé par {{cancelledBy}}',
      
      // Notifications de paiement
      'payment_received': 'EcoDeli: Paiement de {{amount}}€ reçu pour {{service}}',
      'payment_failed': 'EcoDeli: Échec du paiement de {{amount}}€. Vérifiez vos moyens de paiement.',
      
      // Notifications de vérification
      'document_approved': 'EcoDeli: Votre {{documentType}} a été approuvé. Vous pouvez maintenant utiliser nos services.',
      'document_rejected': 'EcoDeli: Votre {{documentType}} a été rejeté: {{reason}}',
      'verification_completed': 'EcoDeli: Votre compte est maintenant vérifié! Bienvenue dans la communauté.',
      
      // Notifications de sécurité
      'security_alert': 'EcoDeli: Connexion détectée depuis {{location}} à {{time}}. Si ce n\'est pas vous, sécurisez votre compte.',
      'password_changed': 'EcoDeli: Votre mot de passe a été modifié. Si ce n\'est pas vous, contactez le support.',
      
      // Notifications d'annonce
      'announcement_new': 'EcoDeli: Nouvelle annonce correspondant à votre profil. Consultez: {{announcementUrl}}',
      'announcement_accepted': 'EcoDeli: Votre candidature pour "{{title}}" a été acceptée!',
      'announcement_rejected': 'EcoDeli: Votre candidature pour "{{title}}" n\'a pas été retenue.',
      
      // Messages génériques
      'welcome': 'Bienvenue sur EcoDeli {{name}}! Votre compte est maintenant actif.',
      'maintenance': 'EcoDeli: Maintenance programmée le {{date}} de {{startTime}} à {{endTime}}.',
      'promotion': 'EcoDeli: {{title}} - {{description}}. Code: {{promoCode}}',
      
      // Template par défaut
      'default': '{{message}}'
    };

    let messageTemplate = templates[template] || templates['default'];
    
    // Remplacer les variables dans le template
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        messageTemplate = messageTemplate.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    return messageTemplate;
  }

  /**
   * Envoie un SMS de vérification avec code
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResponse> {
    const message = `EcoDeli: Votre code de vérification est ${code}. Ce code expire dans 10 minutes.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      body: message
    });
  }

  /**
   * Envoie un SMS de bienvenue
   */
  async sendWelcomeSMS(phoneNumber: string, userName: string): Promise<SMSResponse> {
    return await this.sendNotificationSMS({
      userId: '',
      phoneNumber,
      template: 'welcome',
      variables: { name: userName }
    });
  }

  /**
   * Envoie une notification de livraison
   */
  async sendDeliveryNotification(
    phoneNumber: string,
    type: 'assigned' | 'picked_up' | 'in_transit' | 'nearby' | 'arrived' | 'completed' | 'delayed',
    variables: Record<string, string>
  ): Promise<SMSResponse> {
    return await this.sendNotificationSMS({
      userId: '',
      phoneNumber,
      template: `delivery_${type}`,
      variables,
      priority: type === 'nearby' || type === 'arrived' ? 'HIGH' : 'NORMAL'
    });
  }

  /**
   * Envoie une notification de service
   */
  async sendServiceNotification(
    phoneNumber: string,
    type: 'booked' | 'reminder' | 'cancelled',
    variables: Record<string, string>
  ): Promise<SMSResponse> {
    return await this.sendNotificationSMS({
      userId: '',
      phoneNumber,
      template: `service_${type}`,
      variables,
      priority: type === 'reminder' ? 'HIGH' : 'NORMAL'
    });
  }

  /**
   * Envoie une notification de paiement
   */
  async sendPaymentNotification(
    phoneNumber: string,
    type: 'received' | 'failed',
    variables: Record<string, string>
  ): Promise<SMSResponse> {
    return await this.sendNotificationSMS({
      userId: '',
      phoneNumber,
      template: `payment_${type}`,
      variables,
      priority: type === 'failed' ? 'HIGH' : 'NORMAL'
    });
  }

  /**
   * Envoie une alerte de sécurité
   */
  async sendSecurityAlert(
    phoneNumber: string,
    type: 'login' | 'password_changed',
    variables: Record<string, string>
  ): Promise<SMSResponse> {
    return await this.sendNotificationSMS({
      userId: '',
      phoneNumber,
      template: `security_alert`,
      variables,
      priority: 'URGENT'
    });
  }

  /**
   * Obtient le statut d'un SMS envoyé
   */
  async getSMSStatus(messageSid: string): Promise<{
    status: string;
    errorCode?: number;
    errorMessage?: string;
  } | null> {
    if (!this.isReady()) {
      return {
        status: 'not_configured'
      };
    }

    try {
      const message = await this.client!.messages(messageSid).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode ? parseInt(message.errorCode.toString()) : undefined,
        errorMessage: message.errorMessage || undefined
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du statut SMS:', error);
      return null;
    }
  }

  /**
   * Valide la configuration Twilio
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    account?: any;
    balance?: string;
    error?: string;
  }> {
    if (!this.isReady()) {
      return {
        valid: false,
        error: 'Configuration Twilio manquante'
      };
    }

    try {
      // Récupérer les informations du compte
      const account = await this.client!.api.accounts(this.accountSid).fetch();
      
      // Récupérer le solde du compte
      const balance = await this.client!.api.accounts(this.accountSid).balance.fetch();
      
      return {
        valid: true,
        account: {
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type
        },
        balance: `${balance.balance} ${balance.currency}`
      };
    } catch (error) {
      console.error('Erreur lors de la validation de la configuration Twilio:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère l'historique des SMS envoyés
   */
  async getSMSHistory(options: {
    limit?: number;
    dateAfter?: Date;
    dateBefore?: Date;
    to?: string;
  } = {}): Promise<Array<{
    sid: string;
    to: string;
    from: string;
    body: string;
    status: string;
    direction: string;
    dateCreated: Date;
    dateSent?: Date;
    errorCode?: number;
    errorMessage?: string;
  }>> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const messages = await this.client!.messages.list({
        limit: options.limit || 20,
        dateSentAfter: options.dateAfter,
        dateSentBefore: options.dateBefore,
        to: options.to
      });

      return messages.map(message => ({
        sid: message.sid,
        to: message.to,
        from: message.from,
        body: message.body || '',
        status: message.status,
        direction: message.direction,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent || undefined,
        errorCode: message.errorCode ? parseInt(message.errorCode.toString()) : undefined,
        errorMessage: message.errorMessage || undefined
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique SMS:', error);
      return [];
    }
  }
}

// Instance singleton du service
export const twilioSMSService = new TwilioSMSService();

// Export par défaut
export default TwilioSMSService;