import superjson from 'superjson';
import { router, createTRPCContext } from './trpc';

// Auth routers
import { authRouter } from './routers/auth/auth.router';
import { verificationRouter } from './routers/auth/verification.router';

// Common routers
import { userRouter } from './routers/common/user.router';
import { paymentRouter } from './routers/common/payment.router';
import { documentRouter } from './routers/common/document.router';
import { profileRouter } from './routers/common/profile.router';
import { notificationRouter } from './routers/common/notification.router';
import { userPreferencesRouter } from './routers/common/user-preferences.router';
import { walletRouter } from './routers/common/wallet.router';
import { uploadRouter } from './routers/common/upload.router';
import { geocodingRouter } from './routers/common/geocoding.router';

// Shared routers
import { announcementRouter } from './routers/shared/announcement.router';
import { warehouseRouter } from './routers/shared/warehouse.router';
import { invoiceRouter } from './routers/shared/invoice.router';
import { billingRouter } from './routers/shared/billing.router';
import { withdrawalRouter } from './routers/shared/withdrawal.router';
import { financialTaskRouter } from './routers/shared/financial-task.router';

// Admin routers
import { adminRouter } from './routers/admin/admin.router';
import { adminUserRouter } from './routers/admin/admin-users.router';
import { adminServicesRouter } from './routers/admin/admin-services.router';

// Client routers
import { clientRouter } from './routers/client/client.router';
import { storageRouter } from './routers/client/client-storage.router';

// Deliverer routers
import { delivererRouter } from './routers/deliverer/deliverer.router';
import { deliveryRouter } from './routers/deliverer/deliverer-deliveries.router';
import { deliveryTrackingRouter } from './routers/deliverer/deliverer-tracking.router';

// Provider routers
import { providerRouter } from './routers/provider/provider.router';
import { serviceRouter } from './routers/provider/provider-services.router';

// Merchant routers
import { contractRouter } from './routers/merchant/merchant-contracts.router';

// Subscription router (assuming it exists in shared or we create it)
import { subscriptionRouter } from './routers/client/client-subscription.router';

// Financial router (using admin financial)
import { financialRouter } from './routers/admin/admin-financial.router';

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
  // Auth
  auth: authRouter,
  verification: verificationRouter,
  
  // Common
  user: userRouter,
  payment: paymentRouter,
  document: documentRouter,
  profile: profileRouter,
  notification: notificationRouter,
  userPreferences: userPreferencesRouter,
  wallet: walletRouter,
  upload: uploadRouter,
  geocoding: geocodingRouter,
  
  // Shared
  announcement: announcementRouter,
  warehouse: warehouseRouter,
  invoice: invoiceRouter,
  billing: billingRouter,
  withdrawal: withdrawalRouter,
  financialTask: financialTaskRouter,
  
  // Admin
  admin: adminRouter,
  adminUser: adminUserRouter, // Direct access to admin user router
  adminServices: adminServicesRouter, // Direct access to admin services router
  adminWarehouse: warehouseRouter, // alias pour admin warehouse
  
  // Client
  client: clientRouter,
  storage: storageRouter,
  subscription: subscriptionRouter,
  
  // Deliverer
  deliverer: delivererRouter,
  delivery: deliveryRouter,
  deliveryTracking: deliveryTrackingRouter,
  
  // Provider
  provider: providerRouter,
  service: serviceRouter,
  
  // Merchant
  contract: contractRouter,
  
  // Financial
  financial: financialRouter,
  
  // Legacy aliases (renamed from fileRouter to uploadRouter for clarity)
  file: uploadRouter,
});

// Type d'export pour le typage côté client
export type AppRouter = typeof appRouter;
