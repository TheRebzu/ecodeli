import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: [
        "/api/",
        "/client/profile",
        "/admin",
        "/auth",
        "/_next",
        "/*.json$",
      ],
    },
    sitemap: "https://ecodeli.com/sitemap.xml",
  };
} 