import { ZodIssue } from "zod";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string>;
  zodIssues?: ZodIssue[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ServerActionResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

export type ServerActionHandler<T, R> = (data: T) => Promise<ServerActionResponse<R>>;

export interface UploadResponse {
  success: boolean;
  url: string;
  key: string;
  filename: string;
  message?: string;
}

export interface ServerConfig {
  apiUrl: string;
  baseUrl: string;
  environment: "development" | "test" | "production";
  version: string;
  features: Record<string, boolean>;
}

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, any>;
  signature: string;
}

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: ApiMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  withCredentials?: boolean;
  cache?: RequestCache;
}

export type ApiHandler<T = any> = (
  req: Request,
  params: { params: Record<string, string> }
) => Promise<Response>;

/**
 * Type for API endpoints config
 */
export interface ApiEndpoint<T = any, R = any> {
  path: string;
  method: ApiMethod;
  requireAuth?: boolean;
  roles?: string[];
  schema?: any; // Zod schema reference
  handler: (data: T) => Promise<R>;
} 