import { NextResponse } from 'next/server';
import { createTRPCContext } from '@/server/api/root';
import { TRPCError } from '@trpc/server';
import { UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/server/auth/next-auth';
import { authRouter } from '@/server/api/routers/auth.router';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();

    // Make sure role is valid
    if (!body.role || !Object.values(UserRole).includes(body.role)) {
      return NextResponse.json({ error: 'Rôle utilisateur invalide' }, { status: 400 });
    }

    // Get session and create tRPC context
    const session = await getServerSession(authOptions);
    const context = await createTRPCContext({ headers: request.headers });

    // Create a caller for the auth router
    const caller = authRouter.createCaller(context);

    // Call the register procedure with the input data
    try {
      const result = await caller.register(body);

      return NextResponse.json(
        {
          success: true,
          message: 'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.',
          user: result,
        },
        { status: 201 }
      );
    } catch (trpcError) {
      if (trpcError instanceof TRPCError) {
        return NextResponse.json({ error: trpcError.message }, { status: 400 });
      }
      throw trpcError;
    }
  } catch (error) {
    console.error('Register error:', error);

    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}
