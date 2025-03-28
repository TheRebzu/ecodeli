"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

// Import types for server actions
import type { ActionImplementation } from "next-safe-action";
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodObject, ZodTypeAny } from 'zod';
import { errorResponse } from '../response';

// Define a simplified type for the action hook functions
type SafeActionHook<TInput, TOutput> = {
  execute: (input?: TInput) => Promise<any>;
  reset: () => void;
  status: 'idle' | 'executing' | 'hasSucceeded' | 'hasErrored';
  data: TOutput | null;
  serverError: unknown;
};

export type ValidationOptions = {
  path?: boolean; 
  query?: boolean;
  body?: boolean;
};

export function withValidation<
  TPath extends ZodObject<any> = ZodObject<any>,
  TQuery extends ZodObject<any> = ZodObject<any>,
  TBody extends ZodObject<any> = ZodObject<any>,
  TResponse extends ZodTypeAny = ZodTypeAny
>(
  schemas: {
    path?: TPath;
    query?: TQuery;
    body?: TBody;
    response?: TResponse;
  },
  options: ValidationOptions = { path: true, query: true, body: true }
) {
  // Rest of the implementation remains the same
}

/**
 * Custom hook for using server actions with next-safe-action
 */
export function useServerAction<TInput, TOutput>(
  action: ActionImplementation<TInput, TOutput>,
  options?: {
    onSuccess?: (data: TOutput) => void;
    onError?: (error: unknown) => void;
    onSettled?: () => void;
    onExecute?: () => void;
    revalidate?: boolean | string[];
    resetOnSuccess?: boolean;
    toastOnError?: boolean;
    toastOnSuccess?: boolean;
    successMessage?: string;
    revalidatePaths?: string[];
  }
) {
  const {
    onSuccess,
    onError,
    onSettled,
    onExecute,
    revalidate = true,
    resetOnSuccess = true,
    toastOnError = true,
    toastOnSuccess = false,
    successMessage = "Operation completed successfully",
    revalidatePaths = [],
  } = options || {};

  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  
  const actionHook = useAction(action, {
    onSuccess: (data) => {
      if (revalidate) {
        // Revalidate the current path by default
        router.refresh();
        
        // Revalidate additional paths if provided
        if (Array.isArray(revalidatePaths) && revalidatePaths.length > 0) {
          revalidatePaths.forEach((path) => {
            if (path !== pathname) {
              fetch(path, { method: "GET", cache: "reload" });
            }
          });
        }
      }

      if (toastOnSuccess) {
        toast(successMessage);
      }

      if (onSuccess) {
        onSuccess(data as TOutput);
      }

      if (resetOnSuccess) {
        actionHook.reset();
      }

      if (onSettled) {
        onSettled();
      }
    },
    onError: (error) => {
      if (toastOnError && error) {
        toast({
          title: "Error",
          description: typeof error === "string" ? error : "An error occurred",
          variant: "destructive"
        });
      }

      if (onError) {
        onError(error);
      }

      if (onSettled) {
        onSettled();
      }
    },
  });

  const execute = useCallback(
    async (input?: TInput) => {
      if (onExecute) {
        onExecute();
      }

      startTransition(() => {
        actionHook.execute(input as TInput);
      });

      return actionHook;
    },
    [actionHook, onExecute]
  );

  return {
    ...actionHook,
    execute,
    isPending,
  };
}

export default useServerAction; 