import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { delivererRegisterSchema } from '@/schemas/auth/deliverer-register.schema';
import { clientRegisterSchema } from '@/schemas/auth/client-register.schema';
import { merchantRegisterSchema } from '@/schemas/auth/merchant-register.schema';
import { providerRegisterSchema } from '@/schemas/auth/provider-register.schema';
import { UserRole } from '@/schemas/auth/register.schema';
import { z } from 'zod';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Process based on role
    const { role } = body;

    let result;

    switch (role) {
      case UserRole.CLIENT:
        // Validate client schema
        const clientData = clientRegisterSchema.parse(body);
        result = await authService.registerClient(clientData);
        break;

      case UserRole.DELIVERER:
        // Validate deliverer schema
        const delivererData = delivererRegisterSchema.parse(body);
        result = await authService.registerDeliverer(delivererData);
        break;

      case UserRole.MERCHANT:
        // Validate merchant schema
        const merchantData = merchantRegisterSchema.parse(body);
        result = await authService.registerMerchant(merchantData);
        break;

      case UserRole.PROVIDER:
        // Validate provider schema
        const providerData = providerRegisterSchema.parse(body);
        result = await authService.registerProvider(providerData);
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Rôle d'utilisateur non valide" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Registration error:', error);

    // Handle zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        {
          success: false,
          message: `Validation error: ${firstError.message}`,
          path: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Une erreur est survenue lors de l'inscription",
      },
      { status: 500 }
    );
  }
}
