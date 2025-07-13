import { useState } from "react";

export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (
    url: string,
    options?: RequestInit & { data?: any },
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Extract data from options if provided
      const { data: requestData, ...fetchOptions } = options || {};

      // Determine if we're sending FormData
      const isFormData = requestData instanceof FormData;

      // Prepare headers - don't set Content-Type for FormData (browser will set with boundary)
      const headers: HeadersInit = {};
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      // Merge with provided headers, but don't override FormData Content-Type
      if (fetchOptions.headers) {
        Object.assign(headers, fetchOptions.headers);
        if (isFormData && headers["Content-Type"]) {
          delete headers["Content-Type"];
        }
      }

      // Prepare body
      let body: BodyInit | undefined;
      if (requestData) {
        if (isFormData) {
          body = requestData;
        } else {
          body = JSON.stringify(requestData);
        }
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const request = execute; // Alias pour compatibilité

  return { data, loading, error, execute, request };
}
