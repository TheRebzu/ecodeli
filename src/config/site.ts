export const siteConfig = {
  name: "EcoDeli",
  description:
    "Plateforme de crowdshipping pour des livraisons plus écologiques",
  url: "https://ecodeli.me",
  ogImage: "https://ecodeli.me/og.jpg",
  links: {
    twitter: "https://twitter.com/ecodeli",
    github: "https://github.com/ecodeli",
  },
};

// Configuration OneSignal (optionnelle)
export const oneSignalConfig = {
  enabled: false, // Désactivé en développement
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "",
  apiKey: process.env.ONESIGNAL_API_KEY || "",
};
