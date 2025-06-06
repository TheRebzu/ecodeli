import superjson from 'superjson';
import { router, createTRPCContext } from './trpc';
import { authRouter } from './routers/auth.router';
import { userRouter } from './routers/user.router';
import { announcementRouter } from './routers/announcement.router';
import { deliveryRouter } from './routers/delivery.router';
import { delivererRouter } from './routers/deliverer.router';
import { serviceRouter } from './routers/service.router';
import { paymentRouter } from './routers/payment.router';
import { invoiceRouter } from './routers/invoice.router';
import { warehouseRouter } from './routers/warehouse.router';
import { documentRouter } from './routers/document.router';
import { verificationRouter } from './routers/verification.router';
import { userPreferencesRouter } from '@/server/api/routers/user-preferences.router';
import { adminUserRouter } from './routers/admin-user.router';
import { adminDashboardRouter } from './routers/admin-dashboard.router';
import { warehouseRouter as adminWarehouseRouter } from './routers/warehouse.router';
import { deliveryTrackingRouter } from './routers/delivery-tracking.router';
import { storageRouter } from './routers/storage.router';
import { clientRouter } from './routers/client.router';
import { profileRouter } from './routers/profile.router';
import { walletRouter } from '@/server/api/routers/wallet.router';
import { withdrawalRouter } from '@/server/api/routers/withdrawal.router';
import { billingRouter } from './routers/billing.router';
import { financialTaskRouter } from './routers/financial-task.router';
import { financialRouter } from './routers/financial.router';
import { notificationRouter } from './routers/notification.router';
import { subscriptionRouter } from './routers/subscription.router';
import { fileRouter } from './routers/file.router';
import { providerRouter } from './routers/provider.router';
import { contractRouter } from './routers/contract.router';
import { uploadRouter } from './routers/upload.router';
import { geocodingRouter } from './routers/geocoding.router';
import { adminRouter } from './routers/admin.router';

// Re-export createTRPCContext from trpc.ts
export { createTRPCContext } from './trpc';

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
  delivery: deliveryRouter,
  deliverer: delivererRouter,
  service: serviceRouter,
  provider: providerRouter,
  payment: paymentRouter,
  invoice: invoiceRouter,
  warehouse: warehouseRouter,
  document: documentRouter,
  verification: verificationRouter,
  userPreferences: userPreferencesRouter,
  admin: adminRouter,
  adminUser: adminUserRouter,
  adminDashboard: adminDashboardRouter,
  adminWarehouse: adminWarehouseRouter,
  deliveryTracking: deliveryTrackingRouter,
  storage: storageRouter,
  client: clientRouter,
  profile: profileRouter,
  wallet: walletRouter,
  withdrawal: withdrawalRouter,
  billing: billingRouter,
  subscription: subscriptionRouter,
  financial: financialRouter,
  financialTask: financialTaskRouter,
  notification: notificationRouter,
  file: fileRouter,
  contract: contractRouter,
  upload: uploadRouter,
  geocoding: geocodingRouter,
});

// Type d'export pour le typage côté client
export type AppRouter = typeof appRouter;
