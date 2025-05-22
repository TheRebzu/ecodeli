import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/next-auth';
import { db } from '../db';
import { headers as getHeaders, type ReadonlyHeaders } from 'next/headers';

// Define the type for context options
type ContextOptions = {
  headers?: ReadonlyHeaders | Headers;
};

// Updated for App Router compatibility
export const createTRPCContext = async (opts: ContextOptions = {}) => {
  try {
    // Get headers from opts or try to get them from the current request
    const headers = opts.headers || getHeaders();
    // For App Router compatibility
    const session = await getServerSession(authOptions);

    return {
      db,
      session,
      headers,
    };
  } catch {
    // Fallback for when headers are not available (outside request context)
    console.warn('Creating tRPC context without headers - some features may not work');
    return {
      db,
      session: null,
    };
  }
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware d'authentification
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Vous devez être connecté' });
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
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Vous n'avez pas les autorisations nécessaires pour effectuer cette action",
    });
  }
  return next({
    ctx,
  });
});

export const adminProcedure = t.procedure.use(isAuthenticated).use(isAdmin);

// Middleware pour vérifier si l'utilisateur est un client
const isClient = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'CLIENT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux clients",
    });
  }
  return next({
    ctx,
  });
});

export const clientProcedure = t.procedure.use(isAuthenticated).use(isClient);

// Middleware pour vérifier si l'utilisateur est un livreur
const isDeliverer = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'DELIVERER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux livreurs",
    });
  }
  return next({
    ctx,
  });
});

export const delivererProcedure = t.procedure.use(isAuthenticated).use(isDeliverer);

// Middleware pour vérifier si l'utilisateur est un livreur vérifié
const isVerifiedDeliverer = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'DELIVERER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux livreurs",
    });
  }

  // Vérifier si le livreur est vérifié
  if (!ctx.session.user.isVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vous devez compléter la vérification de votre compte pour accéder à cette fonction',
    });
  }

  return next({
    ctx,
  });
});

export const verifiedDelivererProcedure = t.procedure.use(isAuthenticated).use(isVerifiedDeliverer);

// Middleware pour vérifier si l'utilisateur est un commerçant
const isMerchant = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'MERCHANT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux commerçants",
    });
  }
  return next({
    ctx,
  });
});

export const merchantProcedure = t.procedure.use(isAuthenticated).use(isMerchant);

// Middleware pour vérifier si l'utilisateur est un commerçant vérifié
const isVerifiedMerchant = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'MERCHANT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux commerçants",
    });
  }

  // Vérifier si le commerçant est vérifié
  if (!ctx.session.user.isVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vous devez compléter la vérification de votre compte pour accéder à cette fonction',
    });
  }

  return next({
    ctx,
  });
});

export const verifiedMerchantProcedure = t.procedure.use(isAuthenticated).use(isVerifiedMerchant);

// Middleware pour vérifier si l'utilisateur est un prestataire
const isProvider = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'PROVIDER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux prestataires",
    });
  }
  return next({
    ctx,
  });
});

export const providerProcedure = t.procedure.use(isAuthenticated).use(isProvider);

// Middleware pour vérifier si l'utilisateur est un prestataire vérifié
const isVerifiedProvider = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || ctx.session.user.role !== 'PROVIDER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "Cette fonction n'est accessible qu'aux prestataires",
    });
  }

  // Vérifier si le prestataire est vérifié
  if (!ctx.session.user.isVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vous devez compléter la vérification de votre compte pour accéder à cette fonction',
    });
  }

  return next({
    ctx,
  });
});

export const verifiedProviderProcedure = t.procedure.use(isAuthenticated).use(isVerifiedProvider);
