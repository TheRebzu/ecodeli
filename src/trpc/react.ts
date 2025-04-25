// Re-export tRPC client hooks for React components
import { api as apiClient } from "@/lib/trpc-client";

export const api = apiClient;
