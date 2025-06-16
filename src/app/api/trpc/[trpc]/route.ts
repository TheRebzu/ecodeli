import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const handler = async (req: Request) => {
  try {
    // Gérer la requête tRPC avec une meilleure gestion d'erreur
    return await fetchRequestHandler({ endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: () => createTRPCContext(),
      onError: ({ error, path  }) => {
        console.error(`❌ tRPC Error on '${path}':`, error.message);

        // Log détaillé de l'erreur Zod si c'est une erreur de validation
        if (error.code === "BAD_REQUEST" && error.cause) {
          console.error("Validation error details:", error.cause);
        }

        // Log détaillé pour les erreurs critiques
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error("Stack trace:", error.stack);
        }
      }});
  } catch (error) {
    console.error("❌ Handler tRPC error:", error);
    return new Response(
      JSON.stringify({ message: "Erreur interne du serveur",
        code: "INTERNAL_SERVER_ERROR" }),
      {
        status: 500,
        headers: { "content-type": "application/json" }},
    );
  }
};

export const GET = handler;
export const POST = handler;
