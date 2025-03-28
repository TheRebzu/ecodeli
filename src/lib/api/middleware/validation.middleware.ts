import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

interface ValidationOptions {
  source?: "body" | "query" | "params" | "all";
}

/**
 * Middleware for validating request data using Zod schemas
 */
export const withValidation = <T>(schema: ZodSchema<T>, options: ValidationOptions = {}) => {
  return async (req: NextRequest) => {
    const { source = "body" } = options;
    
    try {
      // Extract data based on source
      let dataToValidate: any;
      
      if (source === "body") {
        dataToValidate = await req.json().catch(() => ({}));
      } else if (source === "query") {
        dataToValidate = Object.fromEntries(req.nextUrl.searchParams);
      } else if (source === "params") {
        // For route params, would need to be passed in separately
        dataToValidate = {};
      } else if (source === "all") {
        const body = await req.json().catch(() => ({}));
        const query = Object.fromEntries(req.nextUrl.searchParams);
        dataToValidate = { ...body, ...query };
      }
      
      // Validate data with Zod schema
      const validatedData = schema.parse(dataToValidate);
      
      // Set validated data on request object
      // This is a bit hacky but NextRequest doesn't support adding properties directly
      // We'll use a custom header to pass on validation info
      const modifiedReq = new NextRequest(req.url, {
        ...req,
        headers: new Headers(req.headers),
      });
      modifiedReq.headers.set(
        'x-validated-data',
        JSON.stringify(validatedData)
      );
      
      // Continue to the next middleware/route handler
      return NextResponse.next({
        request: modifiedReq,
      });
    } catch (error) {
      // Return validation error response
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        
        return NextResponse.json(
          {
            success: false,
            message: "Erreur de validation",
            errors: formattedErrors,
          },
          { status: 400 }
        );
      }
      
      // For any other errors
      console.error("Validation middleware error:", error);
      return NextResponse.json(
        { success: false, message: "Erreur de validation" },
        { status: 500 }
      );
    }
  };
};

/**
 * Format Zod errors into a more user-friendly structure
 */
const formatZodErrors = (error: ZodError) => {
  return error.errors.reduce((acc: Record<string, string>, curr) => {
    const path = curr.path.join('.');
    acc[path || 'general'] = curr.message;
    return acc;
  }, {});
};

/**
 * Helper function to extract validated data from request
 */
export const getValidatedData = <T>(req: NextRequest): T | null => {
  try {
    const validatedDataStr = req.headers.get('x-validated-data');
    if (validatedDataStr) {
      return JSON.parse(validatedDataStr) as T;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving validated data:", error);
    return null;
  }
}; 