import { authRouter } from "@/server/api/routers/auth";
import { dashboardRouter } from "@/server/api/routers/dashboard";
import { documentsRouter } from "@/server/api/routers/documents";
import { createTRPCRouter } from "@/server/api/trpc";

/**
 * Ce fichier contient la définition du routeur API tRPC principal.
 * Il importe tous les sous-routeurs et les exporte comme un routeur unique.
 */

export const appRouter = createTRPCRouter({
  auth: authRouter,
  dashboard: dashboardRouter,
  documents: documentsRouter,
  // Ajoutez d'autres routeurs ici au besoin
});

// Type d'inférence du routeur API - ne pas importer depuis d'autres fichiers
export type AppRouter = typeof appRouter;
