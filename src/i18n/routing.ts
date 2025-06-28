import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr"
  // Pas de pathnames pour éviter la réécriture automatique des URLs
});

export type Locale = (typeof routing.locales)[number];
