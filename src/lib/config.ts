export const config = {
  siteName: "EcoDeli",
  defaultLanguage: "fr",
  supportedLanguages: ["fr", "en"],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || "",
}

export const userRoles = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  COURIER: "COURIER",
  MERCHANT: "MERCHANT",
  PROVIDER: "PROVIDER",
}

