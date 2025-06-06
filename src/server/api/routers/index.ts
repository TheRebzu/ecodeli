import { router } from '@/server/api/trpc';
import { authRouter } from './auth/auth.router';
import { announcementRouter } from './shared/announcement.router';
import { deliveryRouter } from '../../../hooks/delivery';
import { userRouter } from './common/user.router';
import { adminRouter } from './admin';
import { serviceRouter } from '../../../schemas/service';
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
