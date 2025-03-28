import { z } from "zod";

// Define common pagination parameters
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: "Page must be greater than 0" }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
});

// Define common sorting parameters
export const sortingSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Define common date range parameters
export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
    .refine((val) => !val || !isNaN(val.getTime()), {
      message: "Invalid start date format",
    }),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
    .refine((val) => !val || !isNaN(val.getTime()), {
      message: "Invalid end date format",
    }),
});

// Define common search parameter
export const searchSchema = z.object({
  search: z.string().optional(),
});

// Define common ID parameter
export const idSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" }),
});

// Define common status filter
export const statusSchema = z.object({
  status: z
    .enum(["ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "CANCELLED"])
    .optional(),
});

// Define a generic schema for filtering by related entity ID
export const relatedEntitySchema = (fieldName: string) =>
  z.object({
    [fieldName]: z.string().uuid({ message: `Invalid ${fieldName} format` }).optional(),
  });

// Define common error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: z.unknown().optional(),
  }),
});

// Define common success response schema
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// Define common paginated response schema
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      meta: z.object({
        total: z.number().int().nonnegative(),
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        hasMore: z.boolean(),
      }),
    }),
  });

// Type inference helpers
export type Pagination = z.infer<typeof paginationSchema>;
export type Sorting = z.infer<typeof sortingSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Search = z.infer<typeof searchSchema>;
export type IdParam = z.infer<typeof idSchema>;
export type StatusFilter = z.infer<typeof statusSchema>;

// Helper function to create a combined query schema
export function createQuerySchema<T extends z.ZodRawShape>({
  pagination = true,
  sorting = true,
  dateRange = false,
  search = false,
  status = false,
  extend = {} as T,
}: {
  pagination?: boolean;
  sorting?: boolean;
  dateRange?: boolean;
  search?: boolean;
  status?: boolean;
  extend?: T;
} = {}) {
  let schema = z.object({});

  if (pagination) {
    schema = schema.merge(paginationSchema);
  }

  if (sorting) {
    schema = schema.merge(sortingSchema);
  }

  if (dateRange) {
    schema = schema.merge(dateRangeSchema);
  }

  if (search) {
    schema = schema.merge(searchSchema);
  }

  if (status) {
    schema = schema.merge(statusSchema);
  }

  if (Object.keys(extend).length > 0) {
    schema = schema.merge(z.object(extend));
  }

  return schema;
}

// Common utility for transforming queries from URL search params
export function parseQueryParams<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> {
  const queryObj = Object.fromEntries(searchParams.entries());
  return schema.parse(queryObj);
} 