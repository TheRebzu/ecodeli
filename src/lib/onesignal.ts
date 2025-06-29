interface OneSignalConfig {
  appId: string
  restApiKey: string
  userAuthKey?: string
}

interface NotificationData {
  headings: { [key: string]: string }
  contents: { [key: string]: string }
  data?: Record<string, any>
  url?: string
  include_external_user_ids?: string[]
  included_segments?: string[]
  filters?: any[]
  large_icon?: string
  small_icon?: string
  big_picture?: string
  buttons?: Array<{
    id: string
    text: string
    icon?: string
    url?: string
  }>
  send_after?: string
  delayed_option?: string
  delivery_time_of_day?: string
}

interface OneSignalResponse {
  id?: string
  recipients?: number
  external_id?: string
  errors?: any
}

export class OneSignalService {
  private static config: OneSignalConfig = {
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'your-onesignal-app-id',
    restApiKey: process.env.ONESIGNAL_API_KEY || 'your-onesignal-api-key',
    userAuthKey: process.env.ONESIGNAL_USER_AUTH_KEY
  }

  private static baseUrl = 'https://onesignal.com/api/v1'

  /**
   * Envoyer une notification push à un utilisateur spécifique
   */
  static async sendToUser(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    options?: Partial<NotificationData>
  ): Promise<OneSignalResponse> {
    try {
      const notification: NotificationData = {
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
        include_external_user_ids: [userId],
        data: {
          type: 'user_notification',
          userId,
          timestamp: new Date().toISOString(),
          ...data
        },
        large_icon: options?.large_icon || '/icons/ecodeli-logo.png',
        small_icon: options?.small_icon || '/icons/notification-icon.png',
        ...options
      }

      const response = await this.makeRequest('/notifications', 'POST', notification)
      return response
    } catch (error) {
      console.error('Erreur envoi notification OneSignal:', error)
      throw error
    }
  }

  /**
   * Envoyer une notification à un segment d'utilisateurs
   */
  static async sendToSegment(
    segments: string[],
    title: string,
    message: string,
    data?: Record<string, any>,
    options?: Partial<NotificationData>
  ): Promise<OneSignalResponse> {
    try {
      const notification: NotificationData = {
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
        included_segments: segments,
        data: {
          type: 'segment_notification',
          segments,
          timestamp: new Date().toISOString(),
          ...data
        },
        large_icon: options?.large_icon || '/icons/ecodeli-logo.png',
        small_icon: options?.small_icon || '/icons/notification-icon.png',
        ...options
      }

      const response = await this.makeRequest('/notifications', 'POST', notification)
      return response
    } catch (error) {
      console.error('Erreur envoi notification segment OneSignal:', error)
      throw error
    }
  }

  /**
   * Envoyer une notification avec filtres personnalisés
   */
  static async sendWithFilters(
    filters: any[],
    title: string,
    message: string,
    data?: Record<string, any>,
    options?: Partial<NotificationData>
  ): Promise<OneSignalResponse> {
    try {
      const notification: NotificationData = {
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
        filters,
        data: {
          type: 'filtered_notification',
          timestamp: new Date().toISOString(),
          ...data
        },
        large_icon: options?.large_icon || '/icons/ecodeli-logo.png',
        small_icon: options?.small_icon || '/icons/notification-icon.png',
        ...options
      }

      const response = await this.makeRequest('/notifications', 'POST', notification)
      return response
    } catch (error) {
      console.error('Erreur envoi notification filtrée OneSignal:', error)
      throw error
    }
  }

  /**
   * Notifications spécifiques EcoDeli
   */

  // Notification de nouvelle livraison pour livreur
  static async notifyDeliveryOpportunity(
    delivererId: string,
    announcementId: string,
    title: string,
    pickupLocation: string,
    deliveryLocation: string,
    price: number
  ): Promise<OneSignalResponse> {
    return this.sendToUser(
      delivererId,
      '🚚 Nouvelle opportunité de livraison',
      `${title} • ${pickupLocation} → ${deliveryLocation} • ${price}€`,
      {
        type: 'delivery_opportunity',
        announcementId,
        price,
        pickupLocation,
        deliveryLocation
      },
      {
        url: `/deliverer/announcements/${announcementId}`,
        buttons: [
          {
            id: 'view',
            text: 'Voir les détails',
            url: `/deliverer/announcements/${announcementId}`
          },
          {
            id: 'accept',
            text: 'Accepter',
            url: `/deliverer/announcements/${announcementId}/accept`
          }
        ]
      }
    )
  }

  // Notification de mise à jour de livraison pour client
  static async notifyDeliveryUpdate(
    clientId: string,
    deliveryId: string,
    status: string,
    message: string
  ): Promise<OneSignalResponse> {
    const statusLabels: Record<string, string> = {
      'ACCEPTED': 'ACCEPTÉ',
      'PICKED_UP': 'RÉCUPÉRÉ',
      'IN_TRANSIT': 'EN TRANSIT',
      'DELIVERED': 'LIVRÉ',
      'CANCELLED': 'ANNULÉ'
    }

    return this.sendToUser(
      clientId,
              `${statusLabels[status] || 'STATUT'} - Mise à jour de livraison`,
      message,
      {
        type: 'delivery_update',
        deliveryId,
        status
      },
      {
        url: `/client/deliveries/${deliveryId}`,
        buttons: [
          {
            id: 'track',
            text: 'Suivre',
            url: `/client/deliveries/${deliveryId}/tracking`
          }
        ]
      }
    )
  }

  // Notification de nouveau booking pour prestataire
  static async notifyNewBooking(
    providerId: string,
    bookingId: string,
    serviceName: string,
    clientName: string,
    scheduledDate: string,
    price: number
  ): Promise<OneSignalResponse> {
    return this.sendToUser(
      providerId,
      '📅 Nouvelle réservation',
      `${serviceName} avec ${clientName} le ${scheduledDate} • ${price}€`,
      {
        type: 'new_booking',
        bookingId,
        serviceName,
        clientName,
        scheduledDate,
        price
      },
      {
        url: `/provider/bookings/${bookingId}`,
        buttons: [
          {
            id: 'accept',
            text: 'Accepter',
            url: `/provider/bookings/${bookingId}/accept`
          },
          {
            id: 'reschedule',
            text: 'Reporter',
            url: `/provider/bookings/${bookingId}/reschedule`
          }
        ]
      }
    )
  }

  // Notification de paiement reçu
  static async notifyPaymentReceived(
    userId: string,
    amount: number,
    description: string,
    type: 'delivery' | 'booking' | 'subscription'
  ): Promise<OneSignalResponse> {
    const typeEmojis = {
      delivery: '🚚',
      booking: '📅',
      subscription: '⭐'
    }

    return this.sendToUser(
      userId,
      `💰 Paiement reçu`,
      `Vous avez reçu ${amount}€ pour ${description}`,
      {
        type: 'payment_received',
        amount,
        description,
        paymentType: type
      },
      {
        url: '/wallet',
        buttons: [
          {
            id: 'view_wallet',
            text: 'Voir le portefeuille',
            url: '/wallet'
          }
        ]
      }
    )
  }

  // Notification de validation de document
  static async notifyDocumentValidation(
    userId: string,
    documentName: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<OneSignalResponse> {
    const isApproved = status === 'APPROVED'
    
    return this.sendToUser(
      userId,
              `Document ${isApproved ? 'approuvé' : 'rejeté'}`,
      `Votre document "${documentName}" a été ${isApproved ? 'approuvé' : 'rejeté'}${notes ? '. ' + notes : '.'}`,
      {
        type: 'document_validation',
        documentName,
        status,
        notes
      },
      {
        url: '/documents',
        buttons: [
          {
            id: 'view_documents',
            text: 'Voir mes documents',
            url: '/documents'
          }
        ]
      }
    )
  }

  // Notification d'activation de compte
  static async notifyAccountActivated(
    userId: string,
    accountType: 'deliverer' | 'provider'
  ): Promise<OneSignalResponse> {
    const typeLabels = {
      deliverer: 'livreur',
      provider: 'prestataire'
    }

    return this.sendToUser(
      userId,
      '🎉 Compte activé !',
      `Félicitations ! Votre compte ${typeLabels[accountType]} a été activé. Vous pouvez maintenant commencer à travailler.`,
      {
        type: 'account_activated',
        accountType
      },
      {
        url: `/${accountType}`,
        buttons: [
          {
            id: 'start',
            text: 'Commencer',
            url: `/${accountType}/dashboard`
          }
        ]
      }
    )
  }

  /**
   * Gestion des utilisateurs OneSignal
   */

  // Créer ou mettre à jour un utilisateur
  static async upsertUser(userId: string, userData: {
    tags?: Record<string, string>
    language?: string
    timezone?: string
    email?: string
  }): Promise<any> {
    try {
      const response = await this.makeRequest(`/players/${userId}`, 'PUT', {
        app_id: this.config.appId,
        external_user_id: userId,
        ...userData
      })
      return response
    } catch (error) {
      console.error('Erreur mise à jour utilisateur OneSignal:', error)
      throw error
    }
  }

  // Supprimer un utilisateur
  static async deleteUser(playerId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/players/${playerId}`, 'DELETE')
      return response
    } catch (error) {
      console.error('Erreur suppression utilisateur OneSignal:', error)
      throw error
    }
  }

  /**
   * Statistiques et rapports
   */
  static async getNotificationStats(notificationId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/notifications/${notificationId}`)
      return response
    } catch (error) {
      console.error('Erreur récupération stats notification:', error)
      throw error
    }
  }

  static async getAppStats(): Promise<any> {
    try {
      const response = await this.makeRequest(`/apps/${this.config.appId}`)
      return response
    } catch (error) {
      console.error('Erreur récupération stats app:', error)
      throw error
    }
  }

  /**
   * Méthode utilitaire pour les requêtes API
   */
  private static async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.config.restApiKey}`
    }

    if (this.config.userAuthKey) {
      headers['Authorization'] = `Basic ${this.config.userAuthKey}`
    }

    const config: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      // Ajouter app_id à toutes les requêtes POST/PUT
      const bodyData = {
        app_id: this.config.appId,
        ...data
      }
      config.body = JSON.stringify(bodyData)
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OneSignal API Error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    return response.json()
  }
}