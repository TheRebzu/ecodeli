import { router } from '@/lib/trpc';
import { userRouter } from './routers/user';
import { deliveryRouter } from './routers/delivery';
import { announcementRouter } from './routers/announcement';
import { merchantRouter } from './routers/merchant';
import { providerRouter } from './routers/provider';
import { paymentRouter } from './routers/payment';
import { authRouter } from './routers/auth';
import { subscriptionRouter } from './routers/subscription';
import { warehouseRouter } from './routers/warehouse';
import { analyticsRouter } from './routers/analytics';
import { localizationRouter } from './routers/localization';
import { tutorialStepRouter } from './routers/tutorialStep';
import { notificationRouter } from './routers/notification';
import { invoiceRouter } from "./routers/invoice";

export const appRouter = router({
  user: userRouter,
  delivery: deliveryRouter,
  announcement: announcementRouter,
  merchant: merchantRouter,
  provider: providerRouter,
  payment: paymentRouter,
  auth: authRouter,
  subscription: subscriptionRouter,
  warehouse: warehouseRouter,
  analytics: analyticsRouter,
  localization: localizationRouter,
  tutorialStep: tutorialStepRouter,
  notification: notificationRouter,
  invoice: invoiceRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter; 