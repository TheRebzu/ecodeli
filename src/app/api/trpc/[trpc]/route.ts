import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

export const POST = async (req: Request) => {
  try {
    // Gérer la requête tRPC
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => createTRPCContext({ req }),
      onError: ({ error }) => {
        console.error('tRPC error:', error);
      },
    });
  } catch (error) {
    console.error('Erreur dans le handler tRPC:', error);
    return new Response(
      JSON.stringify({ message: 'Erreur interne du serveur' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};

// Ajouter un handler GET pour éviter les erreurs 405 Method Not Allowed
export const GET = async (req: Request) => {
  try {
    // Gérer la requête tRPC
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => createTRPCContext({ req }),
      onError: ({ error }) => {
        console.error('tRPC error:', error);
      },
    });
  } catch (error) {
    console.error('Erreur dans le handler tRPC:', error);
    return new Response(
      JSON.stringify({ message: 'Erreur interne du serveur' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}; 