import { PrismaClient } from "@prisma/client";
import { ExtendedPrismaClient } from "@/trpc/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Création du client Prisma avec options par défaut
export const db = (globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })) as PrismaClient & ExtendedPrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
