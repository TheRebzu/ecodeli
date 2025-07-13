import { getRequestConfig } from "next-intl/server";
import { routing } from "./i18n/routing";

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is valid and not undefined
  const validLocale =
    locale && routing.locales.includes(locale as any)
      ? locale
      : routing.defaultLocale;

  try {
    return {
      locale: validLocale,
      messages: (await import(`./messages/${validLocale}.json`)).default,
    };
  } catch (error) {
    console.error(
      `Failed to load messages for locale "${validLocale}":`,
      error,
    );

    // Fallback to default locale
    return {
      locale: routing.defaultLocale,
      messages: (await import(`./messages/${routing.defaultLocale}.json`))
        .default,
    };
  }
});
