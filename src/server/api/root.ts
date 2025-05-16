import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { router, createTRPCContext } from './trpc';
import { authRouter } from './routers/auth.router';
import { userRouter } from './routers/user.router';
import { announcementRouter } from './routers/announcement.router';
import { deliveryRouter } from './routers/delivery.router';
import { serviceRouter } from './routers/service.router';
import { paymentRouter } from './routers/payment.router';
import { invoiceRouter } from './routers/invoice.router';
import { warehouseRouter } from './routers/warehouse.router';
import { documentRouter } from './routers/document.router';
import { verificationRouter } from './routers/verification.router';
import { userPreferencesRouter } from '@/server/api/routers/user-preferences.router';
import { notificationRouter } from './routers/notification.router';
import { adminUserRouter } from './routers/admin-user.router';
import { adminDashboardRouter } from './routers/admin-dashboard.router';
import { warehouseRouter as adminWarehouseRouter } from './routers/warehouse.router';
import { deliveryTrackingRouter } from './routers/delivery-tracking.router';
import { storageRouter } from './routers/storage.router';
import { clientRouter } from './routers/client.router';
import { profileRouter } from './routers/profile.router';
import { walletRouter } from './routers/wallet.router';
import { billingRouter } from './routers/billing.router';
import { financialTaskRouter } from './routers/financial-task.router';

// Re-export createTRPCContext from trpc.ts
export { createTRPCContext };

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);

// Middleware pour vérifier si l'utilisateur est un administrateur
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx,
  });
});

export const adminProcedure = t.procedure.use(isAuthenticated).use(isAdmin);

/**
 * Routeur principal qui contient tous les sous-routeurs de l'API
 */
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  announcement: announcementRouter,
  delivery: deliveryRouter,
  service: serviceRouter,
  payment: paymentRouter,
  invoice: invoiceRouter,
  warehouse: warehouseRouter,
  document: documentRouter,
  verification: verificationRouter,
  userPreferences: userPreferencesRouter,
  notification: notificationRouter,
  adminUser: adminUserRouter,
  adminDashboard: adminDashboardRouter,
  adminWarehouse: adminWarehouseRouter,
  deliveryTracking: deliveryTrackingRouter,
  storage: storageRouter,
  clientData: clientRouter,
  profile: profileRouter,
  wallet: walletRouter,
  billing: billingRouter,
  financialTask: financialTaskRouter,
});

// Type du routeur pour les imports de type
export type AppRouter = typeof appRouter;
