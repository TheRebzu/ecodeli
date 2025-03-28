import { NextResponse } from 'next/server';
import { createSafeActionClient } from 'next-safe-action';
import { ZodSchema } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Standard response type definitions
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export type ApiError = {
  message: string;
  code: string;
  details?: unknown;
};

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type PaginatedResponse<T = unknown> = ApiResponse<{
  items: T[];
  meta: PaginatedMeta;
}>;

// Helper function to create standard API responses
export function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

// Helper function to create error responses
export function apiError(message: string, code: string, details?: unknown): ApiResponse {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
}

// Helper function to create paginated responses
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    success: true,
    data: {
      items,
      meta: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    },
  };
}

// NextResponse helpers
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(apiResponse(data), { status });
}

export function errorResponse(
  message: string,
  code: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(apiError(message, code, details), { status });
}

export function paginatedSuccessResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  status = 200
): NextResponse {
  return NextResponse.json(paginatedResponse(items, total, page, limit), { status });
}

// Simple next-safe-action client
export const actionClient = createSafeActionClient();

// Authentication middleware for server actions
export async function withAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Authentication required');
  }
  return { session };
}

// Role-based middleware for server actions
export async function withRole(allowedRoles: string[]) {
  const { session } = await withAuth();
  
  if (!allowedRoles.includes(session.user?.role as string)) {
    throw new Error('Insufficient permissions');
  }
  
  return { session };
}

// Create a server action with authentication
export function createAuthenticatedAction<Input>(schema: ZodSchema<Input>) {
  return actionClient
    .use(async () => {
      try {
        const { session } = await withAuth();
        return { success: true, ctx: { session } };
      } catch (error) {
        if (error instanceof Error) {
          return {
            success: false,
            error: {
              message: error.message,
              code: 'UNAUTHORIZED',
            },
          } as ApiResponse;
        }
        throw error;
      }
    })
    .schema(schema);
}

// Create a server action with role-based authentication
export function createRoleBasedAction<Input>(
  schema: ZodSchema<Input>,
  allowedRoles: string[]
) {
  return actionClient
    .use(async () => {
      try {
        const { session } = await withRole(allowedRoles);
        return { success: true, ctx: { session } };
      } catch (error) {
        if (error instanceof Error) {
          return {
            success: false,
            error: {
              message: error.message,
              code: error.message === 'Authentication required' ? 'UNAUTHORIZED' : 'FORBIDDEN',
            },
          } as ApiResponse;
        }
        throw error;
      }
    })
    .schema(schema);
} 