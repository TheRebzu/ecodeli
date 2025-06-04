import { z } from "zod";

/**
 * Spécifie l'environnement côté serveur
 */
const server = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_SECRET: z.string(),
  NEXTAUTH_URL: z.string().url(),
  STRIPE_API_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  REDIS_URL: z.string().url().optional().default("redis://localhost:6379"),
});

/**
 * Spécifie l'environnement côté client
 */
const client = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).optional().default("false"),
});

/**
 * Combine les schémas côté serveur et client
 */
const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  STRIPE_API_KEY: process.env.STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  DEMO_MODE: process.env.DEMO_MODE || "false",
  REDIS_URL: process.env.REDIS_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || "false",
};

// Vérification du schéma environnement côté serveur uniquement dans Node.js
const merged = server.merge(client);
let env = {} as z.infer<typeof merged>;

if (typeof process !== "undefined") {
  // Seulement serveur: valide tout
  const parsed = merged.safeParse(processEnv);
  
  if (parsed.success) {
    env = parsed.data;
  } else {
    console.error(
      "❌ Variables d'environnement invalides:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Variables d'environnement invalides");
  }
}

export { env };
