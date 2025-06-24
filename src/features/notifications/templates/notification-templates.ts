// Templates de notifications pour EcoDeli
export interface NotificationTemplate {
  id: string
  type: 'EMAIL' | 'PUSH' | 'SMS'
  title: {
    fr: string
    en: string
  }
  body: {
    fr: string
    en: string
  }
  data?: Record<string, any>
}

// Templates pour les événements critiques
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Notifications livreur
  DELIVERY_OPPORTUNITY_MATCHED: {
    id: 'delivery_opportunity_matched',
    type: 'PUSH',
    title: {
      fr: '🚚 Nouvelle opportunité de livraison',
      en: '🚚 New delivery opportunity'
    },
    body: {
      fr: 'Une livraison correspond à votre trajet {route}. Prix: {price}€',
      en: 'A delivery matches your route {route}. Price: {price}€'
    }
  },

  DELIVERY_ACCEPTED: {
    id: 'delivery_accepted',
    type: 'PUSH',
    title: {
      fr: '✅ Livraison acceptée',
      en: '✅ Delivery accepted'
    },
    body: {
      fr: 'Votre proposition a été acceptée pour la livraison #{deliveryId}',
      en: 'Your proposal has been accepted for delivery #{deliveryId}'
    }
  },

  DELIVERY_VALIDATION_CODE: {
    id: 'delivery_validation_code',
    type: 'PUSH',
    title: {
      fr: '🔢 Code de validation',
      en: '🔢 Validation code'
    },
    body: {
      fr: 'Code de validation: {validationCode}. Montrez-le au livreur.',
      en: 'Validation code: {validationCode}. Show it to the deliverer.'
    }
  },

  // Notifications client
  CLIENT_DELIVERY_COMPLETED: {
    id: 'client_delivery_completed',
    type: 'PUSH',
    title: {
      fr: '📦 Livraison terminée',
      en: '📦 Delivery completed'
    },
    body: {
      fr: 'Votre colis a été livré avec succès. Notez votre livreur !',
      en: 'Your package has been delivered successfully. Rate your deliverer!'
    }
  },

  CLIENT_TUTORIAL_REMINDER: {
    id: 'client_tutorial_reminder',
    type: 'PUSH',
    title: {
      fr: '🎓 Terminez votre tutoriel',
      en: '🎓 Complete your tutorial'
    },
    body: {
      fr: 'Finalisez votre tutoriel pour accéder à toutes les fonctionnalités',
      en: 'Complete your tutorial to access all features'
    }
  },

  // Notifications admin
  ADMIN_DOCUMENT_VALIDATION_REQUIRED: {
    id: 'admin_document_validation_required',
    type: 'EMAIL',
    title: {
      fr: '📄 Documents à valider',
      en: '📄 Documents to validate'
    },
    body: {
      fr: 'Nouveaux documents à valider pour {userName} ({userRole})',
      en: 'New documents to validate for {userName} ({userRole})'
    }
  },

  ADMIN_PAYMENT_ISSUE: {
    id: 'admin_payment_issue',
    type: 'EMAIL',
    title: {
      fr: '⚠️ Problème de paiement',
      en: '⚠️ Payment issue'
    },
    body: {
      fr: 'Problème détecté sur le paiement #{paymentId}. Intervention requise.',
      en: 'Issue detected on payment #{paymentId}. Intervention required.'
    }
  },

  // Notifications prestataire
  PROVIDER_MONTHLY_INVOICE_GENERATED: {
    id: 'provider_monthly_invoice_generated',
    type: 'EMAIL',
    title: {
      fr: '📋 Facture mensuelle générée',
      en: '📋 Monthly invoice generated'
    },
    body: {
      fr: 'Votre facture pour {month} est disponible. Montant: {amount}€',
      en: 'Your invoice for {month} is available. Amount: {amount}€'
    }
  },

  PROVIDER_BOOKING_CONFIRMED: {
    id: 'provider_booking_confirmed',
    type: 'PUSH',
    title: {
      fr: '📅 Réservation confirmée',
      en: '📅 Booking confirmed'
    },
    body: {
      fr: 'Nouvelle réservation le {date} à {time} - {serviceName}',
      en: 'New booking on {date} at {time} - {serviceName}'
    }
  },

  // Notifications commerçant
  MERCHANT_CONTRACT_SIGNED: {
    id: 'merchant_contract_signed',
    type: 'EMAIL',
    title: {
      fr: '✍️ Contrat signé',
      en: '✍️ Contract signed'
    },
    body: {
      fr: 'Votre contrat EcoDeli a été signé. Bienvenue dans le réseau !',
      en: 'Your EcoDeli contract has been signed. Welcome to the network!'
    }
  },

  MERCHANT_BULK_UPLOAD_COMPLETED: {
    id: 'merchant_bulk_upload_completed',
    type: 'PUSH',
    title: {
      fr: '📤 Import terminé',
      en: '📤 Import completed'
    },
    body: {
      fr: 'Import de {count} annonces terminé. {success} réussies, {failed} échecs.',
      en: 'Import of {count} announcements completed. {success} successful, {failed} failed.'
    }
  }
}

// Fonction pour obtenir un template localisé
export function getNotificationTemplate(
  templateId: string, 
  locale: 'fr' | 'en', 
  variables: Record<string, any> = {}
): { title: string; body: string; data?: Record<string, any> } | null {
  const template = NOTIFICATION_TEMPLATES[templateId]
  if (!template) return null

  // Remplacer les variables dans le template
  const title = replaceVariables(template.title[locale], variables)
  const body = replaceVariables(template.body[locale], variables)

  return {
    title,
    body,
    data: template.data
  }
}

// Fonction utilitaire pour remplacer les variables
function replaceVariables(text: string, variables: Record<string, any>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match
  })
}

// Types pour OneSignal
export interface OneSignalNotification {
  app_id: string
  included_segments?: string[]
  include_external_user_ids?: string[]
  headings: Record<string, string>
  contents: Record<string, string>
  data?: Record<string, any>
  url?: string
  web_url?: string
}

// Types pour les emails
export interface EmailNotification {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}