import { router } from '@/server/api/trpc';
import { authRouter } from './auth.router';
// Importez vos autres routeurs ici

export const appRouter = router({
  auth: authRouter,
  // Ajoutez vos autres routeurs ici
});

export type AppRouter = typeof appRouter;
