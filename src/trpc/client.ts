// This file re-exports the tRPC client from our main configuration
// to support components that import from this path
import { api } from "@/trpc/react";
import { useMemo } from "react";

// Export the trpc client for compatibility
export { api as trpc };

// Helper hook for compatibility with components that use useTrpc
export function useTrpc() {
  return useMemo(
    () => ({
      client: api,
    }),
    [],
  );
}
