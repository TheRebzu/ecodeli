import { router } from '@/server/api/trpc';
import { authRouter } from './auth.router';
import { announcementRouter } from './announcement.router';
import { deliveryRouter } from './delivery.router';
import { userRouter } from './user.router';
import { adminRouter } from './admin';
import { serviceRouter } from './service.router';
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
  service: serviceRouter,
  // Ajoutez vos autres routeurs ici
});

export type AppRouter = typeof appRouter;
