import { NextRequest, NextResponse } from "next/server";

interface ErrorResponse {
  success: boolean;
  message: string;
  error?: string;
  stack?: string;
  statusCode: number;
}

/**
 * Error handling middleware for API routes
 */
export const withErrorHandler = (handler: (req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    try {
      // Execute the route handler
      return await handler(req);
    } catch (error) {
      // Format the error response
      return formatErrorResponse(error);
    }
  };
};

/**
 * Format error into a standardized API response
 */
export const formatErrorResponse = (error: unknown): NextResponse<ErrorResponse> => {
  console.error("API Error:", error);
  
  // Default error response
  const defaultResponse: ErrorResponse = {
    success: false,
    message: "Une erreur s'est produite sur le serveur",
    statusCode: 500,
  };
  
  // Check if it's a known error type
  if (error instanceof Error) {
    const response: ErrorResponse = {
      ...defaultResponse,
      message: error.message || defaultResponse.message,
      error: error.name,
    };
    
    // Add stack trace in development
    if (process.env.NODE_ENV === "development" && error.stack) {
      response.stack = error.stack;
    }
    
    // Handle specific error types
    if (error.name === "ValidationError") {
      response.statusCode = 400;
    } else if (error.name === "UnauthorizedError") {
      response.statusCode = 401;
    } else if (error.name === "ForbiddenError") {
      response.statusCode = 403;
    } else if (error.name === "NotFoundError") {
      response.statusCode = 404;
    }
    
    return NextResponse.json(response, { status: response.statusCode });
  }
  
  // For unknown errors
  return NextResponse.json(defaultResponse, { status: defaultResponse.statusCode });
};

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Non authentifié") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Ressource non trouvée") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  constructor(message = "Requête invalide") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflit avec l'état actuel de la ressource") {
    super(message);
    this.name = "ConflictError";
  }
} 