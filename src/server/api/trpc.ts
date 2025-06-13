import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { getServerAuthSession } from "@/server/auth/next-auth";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";
// Import conditionnel pour éviter les erreurs côté client

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

type CreateContextOptions = {
  session: Session | null;
  headers: any; // Type spécifique à ajouter si nécessaire
};

type CreateNextContextOptionsWithAuth = CreateNextContextOptions & {
  auth?: {
    session: Session | null;
  };
};

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
    headers: opts.headers,
  };
};

/**
 * This is the actual context you'll use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (
  opts?: CreateNextContextOptionsWithAuth,
) => {
  // Version adaptée à l'App Router de Next.js
  // Si opts existe, nous sommes dans un contexte Pages Router ou un appel depuis une API Route
  if (opts) {
    // S'il y a un paramètre auth explicite, l'utiliser (cas des API routes migrées)
    if (opts.auth) {
      return createInnerTRPCContext({
        session: opts.auth.session,
        headers: opts.req?.headers || {},
      });
    }

    // Sinon, nous sommes dans le contexte Pages Router standard
    const { req, res } = opts;
    const session = await getServerAuthSession({ req, res });
    return createInnerTRPCContext({
      session,
      headers: req?.headers || {},
    });
  }

  // Sinon, nous sommes dans un contexte App Router
  let requestHeaders = {};
  let session = null;

  try {
    // Import dynamique pour éviter les erreurs côté client
    if (typeof window === "undefined") {
      const { headers } = await import("next/headers");
      const headersList = await headers();
      if (headersList) {
        requestHeaders = Object.fromEntries(headersList.entries());
      }
    }
    // Récupérer la session sans req/res avec Next.js App Router
    session = await getServerAuthSession();
  } catch (error: any) {
    // Log plus détaillé pour debugging
    if (
      error?.name === "JWEInvalid" ||
      error?.message?.includes("Invalid Compact JWE")
    ) {
      console.warn(
        "Session JWT invalide - l'utilisateur sera déconnecté:",
        error.message,
      );
    } else {
      console.error("Erreur lors de la création du contexte tRPC:", error);
    }
    // Continue avec session=null et requestHeaders={}
  }

  return createInnerTRPCContext({
    session,
    headers: requestHeaders,
  });
};

// Exporter le type Context pour la réutilisation dans d'autres fichiers
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (EXPORT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const router = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté pour accéder à cette ressource",
    });
  }
  return next({
    ctx: {
      // Infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/** Middleware qui vérifie que l'utilisateur est un livreur vérifié */
const enforceUserIsVerifiedDeliverer = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté",
    });
  }

  if (ctx.session.user.role !== UserRole.DELIVERER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Accès réservé aux livreurs",
    });
  }

  if (!ctx.session.user.isVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Votre compte doit être vérifié pour accéder à cette fonctionnalité",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/** Procédure protégée pour les livreurs vérifiés uniquement */
export const verifiedDelivererProcedure = t.procedure.use(
  enforceUserIsVerifiedDeliverer,
);

/** Middleware qui vérifie que l'utilisateur est un administrateur */
const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté pour accéder à cette ressource",
    });
  }

  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Accès réservé aux administrateurs",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/** Procédure protégée pour les administrateurs uniquement */
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

/** Middleware qui vérifie que l'utilisateur est un client */
const enforceUserIsClient = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté",
    });
  }

  if (ctx.session.user.role !== UserRole.CLIENT) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Accès réservé aux clients",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/** Procédure protégée pour les clients uniquement */
export const clientProcedure = t.procedure.use(enforceUserIsClient);

/** Middleware qui vérifie que l'utilisateur est un commerçant */
const enforceUserIsMerchant = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté",
    });
  }

  if (ctx.session.user.role !== UserRole.MERCHANT) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Accès réservé aux commerçants",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/** Procédure protégée pour les commerçants uniquement */
export const merchantProcedure = t.procedure.use(enforceUserIsMerchant);

/**
 * Middleware pour les routes financières protégées
 */
const enforceFinancialAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté pour accéder à cette ressource",
    });
  }

  // Vérifier que l'utilisateur a un compte actif
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Votre compte est inactif ou suspendu",
    });
  }

  // Vérifier l'existence du portefeuille
  const wallet = await ctx.db.wallet.findUnique({
    where: { userId: user.id },
  });

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      wallet,
    },
  });
});

/**
 * Procédures financières (authentification, compte actif et portefeuille vérifié)
 */
export const financialProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceFinancialAccess);

// Exports avec noms compatibles pour la rétrocompatibilité
export const createTRPCRouter = router;

// Export pour compatibilité
export const createCallerFactory = (router: any) => {
  return (ctx?: any) => router.createCaller(ctx);
};
