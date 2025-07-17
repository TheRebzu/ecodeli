// Configuration des traductions automatiques
module.exports = {
  // Langues supportées
  languages: ['fr', 'en'],
  
  // Dossier des messages
  messagesDir: './src/messages',
  
  // Traductions par défaut pour les clés manquantes
  defaultTranslations: {
    // Navigation
    'navigation.shipping': {
      fr: 'Expédition',
      en: 'Shipping'
    },
    'navigation.become_delivery': {
      fr: 'Devenir livreur',
      en: 'Become Delivery'
    },
    'navigation.blog': {
      fr: 'Blog',
      en: 'Blog'
    },
    'navigation.developers': {
      fr: 'Développeurs',
      en: 'Developers'
    },
    'navigation.api_docs': {
      fr: 'Documentation API',
      en: 'API Documentation'
    },
    'navigation.api_keys': {
      fr: 'Clés API',
      en: 'API Keys'
    },
    'navigation.api_manual': {
      fr: 'Manuel API',
      en: 'API Manual'
    },
    'navigation.support': {
      fr: 'Support',
      en: 'Support'
    },
    'navigation.faq': {
      fr: 'FAQ',
      en: 'FAQ'
    },
    'navigation.legal': {
      fr: 'Mentions légales',
      en: 'Legal Notice'
    },
    'navigation.terms': {
      fr: 'Conditions d\'utilisation',
      en: 'Terms of Service'
    },
    'navigation.privacy': {
      fr: 'Politique de confidentialité',
      en: 'Privacy Policy'
    },
    'navigation.cgu': {
      fr: 'CGU',
      en: 'Terms of Use'
    },
    'navigation.cgv': {
      fr: 'CGV',
      en: 'Terms of Sale'
    },
    
    // Auth
    'auth.login.title': {
      fr: 'Connexion',
      en: 'Login'
    },
    'auth.login.subtitle': {
      fr: 'Connectez-vous à votre compte',
      en: 'Sign in to your account'
    },
    'auth.login.email': {
      fr: 'Email',
      en: 'Email'
    },
    'auth.login.password': {
      fr: 'Mot de passe',
      en: 'Password'
    },
    'auth.login.loginButton': {
      fr: 'Se connecter',
      en: 'Sign in'
    },
    'auth.login.signing': {
      fr: 'Connexion en cours...',
      en: 'Signing in...'
    },
    'auth.login.forgotPassword': {
      fr: 'Mot de passe oublié ?',
      en: 'Forgot password?'
    },
    'auth.login.noAccount': {
      fr: 'Pas de compte ?',
      en: 'Don\'t have an account?'
    },
    'auth.login.emailPlaceholder': {
      fr: 'votre@email.com',
      en: 'your@email.com'
    },
    'auth.login.passwordPlaceholder': {
      fr: 'Votre mot de passe',
      en: 'Your password'
    },
    'auth.login.errors.generic': {
      fr: 'Une erreur est survenue',
      en: 'An error occurred'
    },
    
    // Register
    'auth.register.title': {
      fr: 'Inscription',
      en: 'Register'
    },
    
    // Common
    'common.loading': {
      fr: 'Chargement...',
      en: 'Loading...'
    },
    'common.save': {
      fr: 'Enregistrer',
      en: 'Save'
    },
    'common.cancel': {
      fr: 'Annuler',
      en: 'Cancel'
    },
    'common.delete': {
      fr: 'Supprimer',
      en: 'Delete'
    },
    'common.edit': {
      fr: 'Modifier',
      en: 'Edit'
    },
    'common.view': {
      fr: 'Voir',
      en: 'View'
    },
    'common.back': {
      fr: 'Retour',
      en: 'Back'
    },
    'common.next': {
      fr: 'Suivant',
      en: 'Next'
    },
    'common.previous': {
      fr: 'Précédent',
      en: 'Previous'
    },
    'common.submit': {
      fr: 'Soumettre',
      en: 'Submit'
    },
    'common.confirm': {
      fr: 'Confirmer',
      en: 'Confirm'
    },
    'common.yes': {
      fr: 'Oui',
      en: 'Yes'
    },
    'common.no': {
      fr: 'Non',
      en: 'No'
    },
    'common.email': {
      fr: 'Email',
      en: 'Email'
    },
    'common.role': {
      fr: 'Rôle',
      en: 'Role'
    }
  },
  
  // Patterns à ignorer lors de la recherche de traductions
  ignorePatterns: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/*.test.*',
    '**/*.spec.*'
  ],
  
  // Extensions de fichiers à surveiller
  watchExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Délai de débounce pour la surveillance (ms)
  debounceDelay: 1000,
  
  // Options de validation
  validation: {
    // Avertir si des clés sont dupliquées
    warnDuplicateKeys: true,
    
    // Avertir si des clés sont inutilisées
    warnUnusedKeys: false,
    
    // Sortir avec une erreur si des traductions manquent
    failOnMissingTranslations: true
  }
};