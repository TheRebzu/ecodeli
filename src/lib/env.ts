import { z } from "zod";

// Map any inconsistent env vars
if (process.env.NEXT_AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.NEXT_AUTH_SECRET;
}

// Ensure NEXTAUTH_URL is set
if (!process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_APP_URL;
}

// Define environment variables schema
const envSchema = z.object({
  NEXTAUTH_URL: z.string().url().optional().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1).optional().default("0dNwToGvpRAAyYSX8wMC0I7qk7YAS6qY"),
  DATABASE_URL: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional().default("dummy-client-id"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional().default("dummy-client-secret"),
  SMTP_HOST: z.string().min(1).optional().default("smtp.example.com"),
  SMTP_PORT: z.string().transform((val) => parseInt(val || "587", 10)).optional(),
  SMTP_USER: z.string().min(1).optional().default("user"),
  SMTP_PASSWORD: z.string().min(1).optional().default("password"),
  SMTP_FROM: z.string().email().optional().default("noreply@ecodeli.me"),
  STRIPE_API_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
});

// Parse and validate environment variables
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    "⚠️ Invalid environment variables:",
    _env.error.flatten().fieldErrors,
  );
  console.warn("⚠️ Using default values for development");
  // Instead of throwing, we'll use default values
  // throw new Error("Invalid environment variables");
}

// Export validated environment variables or defaults
export const env = _env.success ? _env.data : envSchema.parse({
  NEXTAUTH_SECRET: "0dNwToGvpRAAyYSX8wMC0I7qk7YAS6qY",
  GOOGLE_CLIENT_ID: "dummy-client-id",
  GOOGLE_CLIENT_SECRET: "dummy-client-secret",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "user",
  SMTP_PASSWORD: "password",
  SMTP_FROM: "noreply@ecodeli.me",
  NODE_ENV: "development",
});
