import { router } from '@/lib/trpc';
import { userRouter } from './routers/user';
import { deliveryRouter } from './routers/delivery';
import { announcementRouter } from './routers/announcement';
import { merchantRouter } from './routers/merchant';
import { providerRouter } from './routers/provider';
import { paymentRouter } from './routers/payment';
import { authRouter } from './routers/auth';

export const appRouter = router({
  user: userRouter,
  delivery: deliveryRouter,
  announcement: announcementRouter,
  merchant: merchantRouter,
  provider: providerRouter,
  payment: paymentRouter,
  auth: authRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter; 