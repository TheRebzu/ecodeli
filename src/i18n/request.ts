import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // Utiliser la locale par défaut si invalide ou undefined
  const validLocale = routing.locales.includes(locale as any)
    ? locale
    : routing.defaultLocale;

  try {
    return {
      locale: validLocale,
      messages: (await import(`./messages/${validLocale}.json`)).default,
    };
  } catch (error) {
    console.error(
      `Erreur lors du chargement des messages pour ${validLocale}:`,
      error,
    );

    // Fallback vers la locale par défaut
    return {
      locale: routing.defaultLocale,
      messages: (await import(`./messages/${routing.defaultLocale}.json`))
        .default,
    };
  }
});
