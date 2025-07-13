import { useTranslations, useFormatter } from "next-intl";
import { locales, defaultLocale, type Locale } from "@/i18n";

/**
 * Hook pour les traductions avec typage
 */
export function useI18n() {
  const t = useTranslations();
  const format = useFormatter();

  return {
    t,
    format,
    // Formatage des dates
    formatDate: (
      date: Date | string,
      style: "short" | "long" | "time" = "short",
    ) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return format.dateTime(dateObj, style);
    },
    // Formatage des prix
    formatPrice: (amount: number, currency: string = "EUR") => {
      return format.number(amount, { style: "currency", currency });
    },
    // Formatage des pourcentages
    formatPercent: (value: number) => {
      return format.number(value / 100, { style: "percent" });
    },
  };
}

/**
 * Hook spécialisé pour les traductions d'erreurs
 */
export function useErrorTranslations() {
  const t = useTranslations("errors");

  return {
    getErrorMessage: (
      errorKey: string,
      fallback: string = "Une erreur est survenue",
    ) => {
      try {
        return t(errorKey);
      } catch {
        return fallback;
      }
    },
    // Erreurs d'authentification
    auth: {
      invalidCredentials: () => t("auth.invalidCredentials"),
      accountSuspended: () => t("auth.accountSuspended"),
      emailNotVerified: () => t("auth.emailNotVerified"),
      generic: () => t("auth.generic"),
    },
    // Erreurs de validation
    validation: {
      required: (field: string) => t("validation.required", { field }),
      email: () => t("validation.email"),
      password: () => t("validation.password"),
      confirmPassword: () => t("validation.confirmPassword"),
    },
    // Erreurs réseau
    network: {
      offline: () => t("network.offline"),
      timeout: () => t("network.timeout"),
      serverError: () => t("network.serverError"),
    },
  };
}

/**
 * Hook pour les traductions de statuts
 */
export function useStatusTranslations() {
  const t = useTranslations("status");

  return {
    // Statuts d'annonces
    announcement: {
      draft: () => t("announcement.draft"),
      published: () => t("announcement.published"),
      matched: () => t("announcement.matched"),
      inProgress: () => t("announcement.inProgress"),
      completed: () => t("announcement.completed"),
      cancelled: () => t("announcement.cancelled"),
    },
    // Statuts de livraisons
    delivery: {
      pending: () => t("delivery.pending"),
      accepted: () => t("delivery.accepted"),
      inTransit: () => t("delivery.inTransit"),
      delivered: () => t("delivery.delivered"),
      cancelled: () => t("delivery.cancelled"),
    },
    // Statuts de paiements
    payment: {
      pending: () => t("payment.pending"),
      completed: () => t("payment.completed"),
      failed: () => t("payment.failed"),
      refunded: () => t("payment.refunded"),
    },
    // Statuts de documents
    document: {
      pending: () => t("document.pending"),
      approved: () => t("document.approved"),
      rejected: () => t("document.rejected"),
    },
  };
}

/**
 * Utilitaires pour la gestion des locales
 */
export const localeUtils = {
  // Valider une locale
  isValidLocale: (locale: string): locale is Locale => {
    return locales.includes(locale as Locale);
  },

  // Obtenir la locale par défaut
  getDefaultLocale: (): Locale => defaultLocale,

  // Obtenir toutes les locales
  getAllLocales: (): readonly Locale[] => locales,

  // Obtenir le nom de la langue
  getLanguageName: (
    locale: Locale,
    targetLocale: Locale = defaultLocale,
  ): string => {
    const names: Record<Locale, Record<Locale, string>> = {
      fr: { fr: "Français", en: "French" },
      en: { fr: "Anglais", en: "English" },
    };
    return names[locale][targetLocale] || locale;
  },

  // Construire une URL avec locale
  buildUrl: (path: string, locale: Locale = defaultLocale): string => {
    if (locale === defaultLocale && !path.startsWith(`/${locale}`)) {
      return path;
    }
    return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
  },

  // Extraire la locale d'une URL
  extractLocale: (pathname: string): { locale: Locale; path: string } => {
    const segments = pathname.split("/");
    const potentialLocale = segments[1];

    if (localeUtils.isValidLocale(potentialLocale)) {
      return {
        locale: potentialLocale,
        path: "/" + segments.slice(2).join("/"),
      };
    }

    return {
      locale: defaultLocale,
      path: pathname,
    };
  },
};

/**
 * Types pour les clés de traduction courantes
 */
export type CommonTranslationKeys =
  | "loading"
  | "error"
  | "success"
  | "cancel"
  | "confirm"
  | "save"
  | "edit"
  | "delete"
  | "add"
  | "search"
  | "filter"
  | "reset"
  | "back"
  | "next"
  | "previous"
  | "close"
  | "open";

export type AuthTranslationKeys =
  | "login.title"
  | "login.subtitle"
  | "register.title"
  | "register.subtitle";

export type NavigationTranslationKeys =
  | "home"
  | "services"
  | "pricing"
  | "about"
  | "contact"
  | "dashboard";

/**
 * Fonction pour obtenir des traductions côté serveur
 */
export async function getServerTranslations(
  locale: Locale,
  namespace?: string,
) {
  try {
    const messages = (await import(`@/messages/${locale}.json`)).default;

    if (namespace) {
      return messages[namespace] || {};
    }

    return messages;
  } catch (error) {
    console.error(`Failed to load translations for locale: ${locale}`, error);
    return {};
  }
}

/**
 * Fonction pour obtenir les métadonnées localisées
 */
export function getLocalizedMetadata(locale: Locale) {
  const metadata = {
    fr: {
      title: "EcoDeli - Livraison Écologique et Services à la Personne",
      description:
        "Plateforme de crowdshipping écologique connectant expéditeurs, livreurs et prestataires de services.",
      keywords:
        "livraison, écologique, crowdshipping, services, transport, France",
    },
    en: {
      title: "EcoDeli - Ecological Delivery and Personal Services",
      description:
        "Ecological crowdshipping platform connecting senders, deliverers and service providers.",
      keywords:
        "delivery, ecological, crowdshipping, services, transport, France",
    },
  };

  return metadata[locale] || metadata[defaultLocale];
}

/**
 * Constantes pour les namespaces de traduction
 */
export const TRANSLATION_NAMESPACES = {
  COMMON: "common",
  AUTH: "auth",
  NAVIGATION: "navigation",
  DASHBOARD: "dashboard",
  ANNOUNCEMENTS: "announcements",
  DELIVERIES: "deliveries",
  PAYMENTS: "payments",
  ERRORS: "errors",
  FORMS: "forms",
  STATUS: "status",
} as const;
