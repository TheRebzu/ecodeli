// Types pour les préférences utilisateur
export interface UserPreferences {
  userId: string;
  language: string;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: {
    deliveries: boolean;
    payments: boolean;
    announcements: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface PrivacyPreferences {
  profileVisibility: 'PUBLIC' | 'PRIVATE' | 'CONTACTS_ONLY';
  locationSharing: boolean;
  analyticsOptOut: boolean;
  marketingOptOut: boolean;
  dataRetention: 'MINIMAL' | 'STANDARD' | 'EXTENDED';
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Alias pour compatibilité
export type ProfilePreferences = UserPreferences;

// Export supprimé - doublon corrigé