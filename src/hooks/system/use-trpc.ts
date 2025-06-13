import { httpBatchLink } from "@trpc/client";
import { createTRPCProxyClient } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/root";
import superjson from "superjson";

// Fonction pour obtenir l'URL de base de l'API
export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// Configuration des liens pour les requêtes avec transformer
const links = [
  httpBatchLink({
    url: `${getBaseUrl()}/api/trpc`,
    headers: () => {
      return {
        "Content-Type": "application/json",
      };
    },
    transformer: superjson,
  }),
];

// Créer le client React
export const api = createTRPCReact<AppRouter>();

// Créer un client direct pour les appels en dehors de React
export const trpcDirect = createTRPCProxyClient<AppRouter>({
  links,
});
