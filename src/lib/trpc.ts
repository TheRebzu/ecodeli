import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Define session type that includes the role property
type UserSession = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type Session = {
  user?: UserSession;
  expires: string;
};

type CreateContextOptions = {
  session: Session | null;
  prisma: typeof prisma;
};

export const createInnerContext = ({ session, prisma }: CreateContextOptions) => {
  return {
    session,
    prisma,
  };
};

export const createContext = async () => {
  const session = await getServerSession() as Session | null;
  
  return createInnerContext({
    session,
    prisma,
  });
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  })
);

// Role-based procedures
export const adminProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (ctx.session?.user?.role !== 'ADMIN') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    return next({ ctx });
  })
);

export const delivererProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (ctx.session?.user?.role !== 'DELIVERER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Deliverer access required' });
    }
    return next({ ctx });
  })
);

export const merchantProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (ctx.session?.user?.role !== 'MERCHANT') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Merchant access required' });
    }
    return next({ ctx });
  })
);

export const providerProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (ctx.session?.user?.role !== 'PROVIDER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Provider access required' });
    }
    return next({ ctx });
  })
);

export const clientProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (ctx.session?.user?.role !== 'CLIENT') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Client access required' });
    }
    return next({ ctx });
  })
); 