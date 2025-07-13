"use client";

import { useEffect, useRef } from "react";

interface SwaggerUIProps {
  spec?: any;
  url?: string;
}

export function SwaggerUI({ spec, url }: SwaggerUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import SwaggerUI only on client side
    const loadSwagger = async () => {
      try {
        // For now, just show a placeholder since SwaggerUI is not installed
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-8 border rounded-lg bg-muted/50">
              <h3 class="text-lg font-semibold mb-2">API Documentation</h3>
              <p class="text-sm text-muted-foreground">
                SwaggerUI component will be loaded here when swagger-ui-react is installed.
              </p>
              ${url ? `<p class="text-xs mt-2">URL: ${url}</p>` : ""}
              ${spec ? `<p class="text-xs mt-1">Spec provided</p>` : ""}
            </div>
          `;
        }
      } catch (error) {
        console.error("Failed to load SwaggerUI:", error);
      }
    };

    loadSwagger();
  }, [spec, url]);

  return <div ref={containerRef} className="w-full" />;
}

export default SwaggerUI;
