export function getUserPreferredLocale(userId?: string): string {
  return "fr";
}

export function setUserPreferredLocale(userId: string, locale: string): void {
  console.log("Setting locale:", locale, "for user:", userId);
}
