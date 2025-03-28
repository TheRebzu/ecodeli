import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { errorResponse } from '../response';

export type ValidationOptions = {
  path?: boolean; // Validate path parameters
  query?: boolean; // Validate query parameters
  body?: boolean; // Validate request body
};

// Middleware for validating API requests using Zod schemas
export function withValidation<
  TPath extends ZodSchema = z.ZodObject<Record<string, unknown>>,
  TQuery extends ZodSchema = z.ZodObject<Record<string, unknown>>,
  TBody extends ZodSchema = z.ZodObject<Record<string, unknown>>,
  TResponse extends ZodSchema = z.ZodAny
>(
  schemas: {
    path?: TPath;
    query?: TQuery;
    body?: TBody;
    response?: TResponse;
  },
  options: ValidationOptions = { path: true, query: true, body: true }
) {
  return async (
    req: NextRequest,
    handler: (
      params: {
        path: z.infer<TPath>;
        query: z.infer<TQuery>;
        body: z.infer<TBody>;
      }
    ) => Promise<NextResponse>
  ) => {
    const validationResults = {
      path: { success: true, data: {} as z.infer<TPath>, error: null as z.ZodError | null },
      query: { success: true, data: {} as z.infer<TQuery>, error: null as z.ZodError | null },
      body: { success: true, data: {} as z.infer<TBody>, error: null as z.ZodError | null },
    };

    // Validate path parameters if schema provided and option enabled
    if (schemas.path && options.path) {
      try {
        const { searchParams } = new URL(req.url);
        const pathParams = Object.fromEntries(searchParams.entries());
        validationResults.path.data = schemas.path.parse(pathParams);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationResults.path.success = false;
          validationResults.path.error = error;
        }
      }
    }

    // Validate query parameters if schema provided and option enabled
    if (schemas.query && options.query) {
      try {
        const { searchParams } = new URL(req.url);
        const queryParams = Object.fromEntries(searchParams.entries());
        validationResults.query.data = schemas.query.parse(queryParams);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationResults.query.success = false;
          validationResults.query.error = error;
        }
      }
    }

    // Validate request body if schema provided and option enabled
    if (schemas.body && options.body && req.body) {
      try {
        const body = await req.json();
        validationResults.body.data = schemas.body.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationResults.body.success = false;
          validationResults.body.error = error;
        } else {
          // Handle JSON parse error
          return errorResponse(
            'Invalid JSON in request body',
            'INVALID_REQUEST_BODY',
            400
          );
        }
      }
    }

    // Check for validation errors
    const errors: Record<string, z.ZodError> = {};
    let hasErrors = false;

    if (!validationResults.path.success && validationResults.path.error) {
      errors.path = validationResults.path.error;
      hasErrors = true;
    }

    if (!validationResults.query.success && validationResults.query.error) {
      errors.query = validationResults.query.error;
      hasErrors = true;
    }

    if (!validationResults.body.success && validationResults.body.error) {
      errors.body = validationResults.body.error;
      hasErrors = true;
    }

    // Return validation errors if any
    if (hasErrors) {
      return errorResponse(
        'Validation error',
        'VALIDATION_ERROR',
        400,
        formatZodErrors(errors)
      );
    }

    // Call handler with validated data
    const response = await handler({
      path: validationResults.path.data,
      query: validationResults.query.data,
      body: validationResults.body.data,
    });

    // Validate response if schema provided
    if (schemas.response) {
      try {
        const responseData = await response.json();
        schemas.response.parse(responseData);
        // Return the original response if validation passes
        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Log the error but don't expose it to the client
          console.error('Response validation failed:', error);
          return errorResponse(
            'Internal server error',
            'INTERNAL_SERVER_ERROR',
            500
          );
        }
        throw error;
      }
    }

    // Return the handler response
    return response;
  };
}

// Helper function to format Zod errors into a more user-friendly format
export function formatZodErrors(
  errors: Record<string, z.ZodError>
): Record<string, Record<string, string[]>> {
  const formatted: Record<string, Record<string, string[]>> = {};

  for (const [location, zodError] of Object.entries(errors)) {
    formatted[location] = {};

    for (const issue of zodError.errors) {
      const path = issue.path.join('.');
      if (!formatted[location][path]) {
        formatted[location][path] = [];
      }
      formatted[location][path].push(issue.message);
    }
  }

  return formatted;
} 