export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: '0',
    features: [
      'Accès de base à la plateforme',
      'Pas d'assurance sur les colis',
      'Envoi prioritaire avec supplément de 15%'
    ]
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: '9.90',
    features: [
      'Assurance jusqu'à 115€/envoi',
      'Réduction de 5% sur l'envoi de colis',
      'Envoi prioritaire avec supplément de 5%',
      'Réduction de 5% sur les petits colis'
    ]
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: '19.99',
    features: [
      'Assurance jusqu'à 3000€/envoi',
      'Réduction de 9% sur l'envoi de colis',
      '3 envois prioritaires offerts par mois',
      'Réduction de 5% sur tous les colis',
      'Premier envoi offert (si inférieur à 150€)'
    ]
  }
};