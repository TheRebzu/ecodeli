// Configuration i18n pour EcoDeli
import { notFound } from "next/navigation"
import { getRequestConfig } from "next-intl/server"

/**
 * Locales supportées par EcoDeli
 */
export const locales = ["fr", "en"] as const
export type Locale = typeof locales[number]

/**
 * Configuration par défaut
 */
export const defaultLocale: Locale = "fr"

/**
 * Configuration next-intl
 */
export default getRequestConfig(async ({ locale }) => {
  // Valider que la locale existe
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  try {
    return {
      messages: (await import(`./messages/${locale}.json`)).default,
      timeZone: "Europe/Paris",
      now: new Date(),
      formats: {
        dateTime: {
          short: {
            day: "numeric",
            month: "short", 
            year: "numeric"
          },
          long: {
            day: "numeric",
            month: "long",
            year: "numeric",
            weekday: "long"
          },
          time: {
            hour: "2-digit",
            minute: "2-digit"
          }
        },
        number: {
          currency: {
            style: "currency",
            currency: "EUR"
          },
          percent: {
            style: "percent",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }
        }
      }
    }
  } catch (error) {
    console.error(`Erreur chargement messages pour locale ${locale}:`, error)
    notFound()
  }
})