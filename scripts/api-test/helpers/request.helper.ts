import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { apiConfig, getApiUrl } from "../config/api.config";
import { AuthHelper } from "./auth.helper";
import { TestUser } from "../config/users.config";
import { requestLogger } from "./logger.helper";

export interface TrpcRequest<T = any> {
  input?: T;
}

export interface TrpcResponse<T = any> {
  result: {
    data: T;
  };
}

export interface TrpcError {
  error: {
    message: string;
    code: string;
    httpStatus: number;
    path?: string;
    stack?: string;
  };
}

export interface RequestOptions {
  retry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  validateStatus?: (status: number) => boolean;
}

export class RequestHelper {
  /**
   * Make authenticated tRPC request
   */
  static async trpc<TInput = any, TOutput = any>(
    user: TestUser,
    procedure: string,
    input?: TInput,
    options?: RequestOptions,
  ): Promise<TOutput> {
    const session = await AuthHelper.getSession(user);
    if (!session) {
      throw new Error(`Failed to get session for user: ${user.email}`);
    }

    const url = getApiUrl(procedure);
    const startTime = Date.now();

    requestLogger.request("POST", url, input);

    try {
      const response = await this.makeRequest<TrpcResponse<TOutput>>(
        {
          method: "POST",
          url,
          data: { input },
          headers: {
            ...apiConfig.headers,
            ...AuthHelper.getAuthHeaders(session),
          },
          timeout: options?.timeout || apiConfig.timeout,
          validateStatus: options?.validateStatus,
          maxRedirects: 5,
          withCredentials: true,
        },
        options,
      );

      const duration = Date.now() - startTime;
      requestLogger.response(response.status, response.data, duration);

      if (response.data?.result?.data !== undefined) {
        return response.data.result.data;
      }

      throw new Error("Invalid tRPC response format");
    } catch (error) {
      this.handleError(error, procedure);
      throw error;
    }
  }

  /**
   * Make public tRPC request (no auth)
   */
  static async publicTrpc<TInput = any, TOutput = any>(
    procedure: string,
    input?: TInput,
    options?: RequestOptions,
  ): Promise<TOutput> {
    const url = getApiUrl(procedure);
    const startTime = Date.now();

    requestLogger.request("POST", url, input);

    try {
      const response = await this.makeRequest<TrpcResponse<TOutput>>(
        {
          method: "POST",
          url,
          data: { input },
          headers: apiConfig.headers,
          timeout: options?.timeout || apiConfig.timeout,
          validateStatus: options?.validateStatus,
        },
        options,
      );

      const duration = Date.now() - startTime;
      requestLogger.response(response.status, response.data, duration);

      if (response.data?.result?.data !== undefined) {
        return response.data.result.data;
      }

      throw new Error("Invalid tRPC response format");
    } catch (error) {
      this.handleError(error, procedure);
      throw error;
    }
  }

  /**
   * Make raw HTTP request with auth
   */
  static async raw<T = any>(
    user: TestUser,
    config: AxiosRequestConfig,
    options?: RequestOptions,
  ): Promise<AxiosResponse<T>> {
    const session = await AuthHelper.getSession(user);
    if (!session) {
      throw new Error(`Failed to get session for user: ${user.email}`);
    }

    const startTime = Date.now();
    requestLogger.request(
      config.method?.toUpperCase() || "GET",
      config.url || "",
      config.data,
    );

    try {
      const response = await this.makeRequest<T>(
        {
          ...config,
          headers: {
            ...apiConfig.headers,
            ...config.headers,
            ...AuthHelper.getAuthHeaders(session),
          },
          withCredentials: true,
        },
        options,
      );

      const duration = Date.now() - startTime;
      requestLogger.response(response.status, response.data, duration);

      return response;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make request with retry logic
   */
  private static async makeRequest<T = any>(
    config: AxiosRequestConfig,
    options?: RequestOptions,
  ): Promise<AxiosResponse<T>> {
    const maxAttempts =
      options?.retry !== false
        ? options?.retryAttempts || apiConfig.retryAttempts
        : 1;
    const retryDelay = options?.retryDelay || apiConfig.retryDelay;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.request<T>(config);
        return response;
      } catch (error) {
        lastError = error;
        const axiosError = error as AxiosError;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (
          axiosError.response &&
          axiosError.response.status >= 400 &&
          axiosError.response.status < 500 &&
          axiosError.response.status !== 429
        ) {
          throw error;
        }

        if (attempt < maxAttempts) {
          requestLogger.warning(
            `Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${retryDelay}ms...`,
          );
          await this.sleep(retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Handle and log errors
   */
  private static handleError(error: any, context?: string): void {
    const axiosError = error as AxiosError<TrpcError>;

    if (axiosError.response?.data?.error) {
      const trpcError = axiosError.response.data.error;
      requestLogger.error(
        `tRPC Error${context ? ` in ${context}` : ""}: ${trpcError.message}`,
        {
          code: trpcError.code,
          httpStatus: trpcError.httpStatus,
          path: trpcError.path,
        },
      );
    } else if (axiosError.response) {
      requestLogger.error(
        `HTTP Error${context ? ` in ${context}` : ""}: ${axiosError.response.status} ${axiosError.response.statusText}`,
        axiosError.response.data,
      );
    } else if (axiosError.request) {
      requestLogger.error(
        `Network Error${context ? ` in ${context}` : ""}: No response received`,
        { message: axiosError.message },
      );
    } else {
      requestLogger.error(
        `Request Error${context ? ` in ${context}` : ""}: ${axiosError.message}`,
      );
    }
  }

  /**
   * Sleep helper
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Batch multiple tRPC requests
   */
  static async batchTrpc<T extends Record<string, any>>(
    user: TestUser,
    requests: Array<{ procedure: string; input?: any }>,
    options?: RequestOptions,
  ): Promise<T> {
    const results: any = {};

    // Execute requests in parallel
    const promises = requests.map(async (req) => {
      const result = await this.trpc(user, req.procedure, req.input, options);
      return { procedure: req.procedure, result };
    });

    const responses = await Promise.all(promises);

    // Map results
    responses.forEach(({ procedure, result }) => {
      const key = procedure.split(".").pop() || procedure;
      results[key] = result;
    });

    return results as T;
  }
}
