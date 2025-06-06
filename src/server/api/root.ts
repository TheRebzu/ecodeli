import superjson from 'superjson';
import { router, createTRPCContext } from '@/server/api/trpc';
import { authRouter } from '@/server/api/routers/auth/auth.router';
import { userRouter } from '@/server/api/routers/common/user.router';
import { announcementRouter } from '@/server/api/routers/shared/announcement.router';
import { delivererRouter } from '@/server/api/routers/deliverer/deliverer.router';
import { paymentRouter } from '@/server/api/routers/common/payment.router';
import { invoiceRouter } from '@/server/api/routers/shared/invoice.router';
import { warehouseRouter } from '@/server/api/routers/shared/warehouse.router';
import { documentRouter } from '@/server/api/routers/common/document.router';
import { verificationRouter } from '@/server/api/routers/auth/verification.router';
import { userPreferencesRouter } from '@/server/api/routers/common/user-preferences.router';
import { userRouter as adminUserRouter } from '@/server/api/routers/common/user.router';
import { adminDashboardRouter } from '@/server/api/routers/admin/admin-dashboard.router';
import { warehouseRouter as adminWarehouseRouter } from '@/server/api/routers/shared/warehouse.router';
import { deliveryTrackingRouter } from '@/server/api/routers/deliverer/deliverer-tracking.router';
import { messagingRouter } from '@/server/api/routers/messaging.router';
import { clientRouter } from '@/server/api/routers/client/client.router';
import { clientDataRouter } from '@/server/api/routers/client/client-data.router';
import { profileRouter } from '@/server/api/routers/common/profile.router';
import { walletRouter } from '@/server/api/routers/common/wallet.router';
import { withdrawalRouter } from '@/server/api/routers/shared/withdrawal.router';
import { billingRouter } from '@/server/api/routers/shared/billing.router';
import { financialTaskRouter } from '@/server/api/routers/shared/financial-task.router';
import { notificationRouter } from '@/server/api/routers/common/notification.router';
import { subscriptionRouter } from '@/server/api/routers/client/client-subscription.router';
import { providerRouter } from '@/server/api/routers/provider/provider.router';
import { uploadRouter } from '@/server/api/routers/common/upload.router';
import { geocodingRouter } from '@/server/api/routers/common/geocoding.router';

// Re-export createTRPCContext from trpc.ts
export { createTRPCContext } from '@/server/api/trpc';

/**
 * Ce fichier regroupe tous les router tRPC de l'application.
 * C'est le point d'entrée principal de l'API tRPC.
 */

/**
 * Router API principal qui regroupe tous les autres routers.
 */
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  announcement: announcementRouter,
  deliverer: delivererRouter,
  provider: providerRouter,
  payment: paymentRouter,
  invoice: invoiceRouter,
  warehouse: warehouseRouter,
  document: documentRouter,
  verification: verificationRouter,
  userPreferences: userPreferencesRouter,
  adminUser: adminUserRouter,
  adminDashboard: adminDashboardRouter,
  adminWarehouse: adminWarehouseRouter,
  deliveryTracking: deliveryTrackingRouter,
  messaging: messagingRouter,
  client: clientRouter,
  clientData: clientDataRouter,
  profile: profileRouter,
  wallet: walletRouter,
  withdrawal: withdrawalRouter,
  billing: billingRouter,
  subscription: subscriptionRouter,
  financialTask: financialTaskRouter,
  notification: notificationRouter,
  upload: uploadRouter,
  geocoding: geocodingRouter,
});

// Type d'export pour le typage côté client
export type AppRouter = typeof appRouter;
