import { cache } from "react";

// Cache les messages pour éviter de les recharger à chaque fois
export const getMessages = cache(async (locale: string) => {
  try {
    const messages = await import(`@/messages/${locale}.json`);
    return messages.default || messages;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // Retourner un objet vide en cas d'erreur
    return {};
  }
});