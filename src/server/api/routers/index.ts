import { router } from '@/server/api/trpc';
import { authRouter } from './auth.router';
import { announcementRouter } from './announcement.router';
import { deliveryRouter } from './delivery.router';
import { userRouter } from './user.router';
import { adminRouter } from './admin';
// Importez vos autres routeurs ici

/**
 * Routeur principal de l'application
 * Regroupe tous les sous-routeurs
 */
export const appRouter = router({
  auth: authRouter,
  announcement: announcementRouter,
  delivery: deliveryRouter,
  user: userRouter,
  admin: adminRouter,
  // Ajoutez vos autres routeurs ici
});

export type AppRouter = typeof appRouter;
