import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '../response';
import { Session } from 'next-auth';

type HandlerFunction = (session: Session) => Promise<NextResponse>;
type MiddlewareFunction = (req: NextRequest, handler: HandlerFunction) => Promise<NextResponse>;

/**
 * Middleware to ensure the user is authenticated
 * @returns A middleware function that checks authentication and passes the session to the handler
 */
export function withAuth(): MiddlewareFunction {
  return async (
    req: NextRequest,
    handler: HandlerFunction
  ) => {
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(
        'Authentication required',
        'UNAUTHORIZED',
        401
      );
    }

    return handler(session);
  };
}

/**
 * Middleware to ensure the user has one of the required roles
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns A middleware function that checks authorization and passes the session to the handler
 */
export function withRole(allowedRoles: string[]): MiddlewareFunction {
  return async (
    req: NextRequest,
    handler: HandlerFunction
  ) => {
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(
        'Authentication required',
        'UNAUTHORIZED',
        401
      );
    }

    const userRole = session.user?.role as string | undefined;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return errorResponse(
        'Insufficient permissions',
        'FORBIDDEN',
        403
      );
    }

    return handler(session);
  };
}

/**
 * Middleware to ensure the user has all the required permissions
 * @param requiredPermissions - Array of permission codes that are required
 * @returns A middleware function that checks permissions and passes the session to the handler
 */
export function withPermissions(requiredPermissions: string[]): MiddlewareFunction {
  return async (
    req: NextRequest,
    handler: HandlerFunction
  ) => {
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(
        'Authentication required',
        'UNAUTHORIZED',
        401
      );
    }

    // Get user permissions from session
    // This assumes your session.user has a permissions field or similar
    // You might need to adapt this to your actual session structure by
    // loading permissions from the database based on user ID
    const userPermissions = [] as string[];
    
    // Example of how you might load permissions in a real implementation:
    // const userPermissions = await prisma.userPermission.findMany({
    //   where: { userId: session.user.id },
    //   select: { permission: true }
    // }).then(perms => perms.map(p => p.permission));

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return errorResponse(
        'Insufficient permissions',
        'FORBIDDEN',
        403
      );
    }

    return handler(session);
  };
}

/**
 * Middleware to ensure the user is the owner of the resource
 * @param resourceIdExtractor - Function to extract the resource ID from the request
 * @param resourceOwnerChecker - Function to check if the user is the owner of the resource
 * @returns A middleware function that checks ownership and passes the session to the handler
 */
export function withOwnership<T = string>(
  resourceIdExtractor: (req: NextRequest) => T | Promise<T>,
  resourceOwnerChecker: (userId: string, resourceId: T) => Promise<boolean>
): MiddlewareFunction {
  return async (
    req: NextRequest,
    handler: HandlerFunction
  ) => {
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(
        'Authentication required',
        'UNAUTHORIZED',
        401
      );
    }

    const userId = session.user?.id;
    
    if (!userId) {
      return errorResponse(
        'User ID not found in session',
        'UNAUTHORIZED',
        401
      );
    }

    const resourceId = await resourceIdExtractor(req);
    const isOwner = await resourceOwnerChecker(userId, resourceId);

    if (!isOwner) {
      return errorResponse(
        'You do not have permission to access this resource',
        'FORBIDDEN',
        403
      );
    }

    return handler(session);
  };
}

/**
 * Combine multiple middleware functions into one
 * @param middlewares - Array of middleware functions to combine
 * @returns A single middleware function that applies all middleware in sequence
 */
export function combineMiddlewares(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async (
    req: NextRequest,
    handler: HandlerFunction
  ) => {
    // Create a chain of middleware functions, where each middleware calls the next one
    const executeMiddlewareChain = async (index: number, session?: Session): Promise<NextResponse> => {
      if (index >= middlewares.length) {
        // All middleware has been executed, call the final handler
        return handler(session as Session);
      }

      // Execute the current middleware, passing a function that will execute the next middleware
      return middlewares[index](req, (nextSession) => {
        // Use the session from the current middleware for the next one
        return executeMiddlewareChain(index + 1, nextSession || session);
      });
    };

    // Start executing the middleware chain
    return executeMiddlewareChain(0);
  };
} 