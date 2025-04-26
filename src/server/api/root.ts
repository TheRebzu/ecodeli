import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/next-auth';
import { db } from '../db';
import { router } from './trpc';
import { authRouter } from './routers/auth.router';
import { userRouter } from './routers/user.router';
import { announcementRouter } from './routers/announcement.router';
import { deliveryRouter } from './routers/delivery.router';
import { serviceRouter } from './routers/service.router';
import { paymentRouter } from './routers/payment.router';
import { invoiceRouter } from './routers/invoice.router';
import { warehouseRouter } from './routers/warehouse.router';
import { documentRouter } from './routers/document.router';

// Exporter explicitement cette fonction
export const createTRPCContext = async (opts: { req?: Request }) => {
  const session = await getServerSession(authOptions);
  return {
    db,
    session,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const publicProcedure = t.procedure;

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

// L'application router principal qui combine tous les routeurs
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
});

// Exporter le type pour être utilisé côté client
export type AppRouter = typeof appRouter;