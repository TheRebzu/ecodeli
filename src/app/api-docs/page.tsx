"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    SwaggerUIBundle: any;
  }
}

export default function ApiDocsPage() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSwaggerUI = async () => {
      // Load Swagger UI CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css";
      document.head.appendChild(cssLink);

      // Load Swagger UI JS
      const script = document.createElement("script");
      script.src =
        "https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js";
      script.onload = () => {
        if (wrapperRef.current && window.SwaggerUIBundle) {
          window.SwaggerUIBundle({
            url: "/api/openapi",
            dom_id: "#swagger-ui",
            deepLinking: true,
            presets: [
              window.SwaggerUIBundle.presets.apis,
              window.SwaggerUIBundle.presets.standalone,
            ],
            plugins: [window.SwaggerUIBundle.plugins.DownloadUrl],
            layout: "StandaloneLayout",
            tryItOutEnabled: true,
            requestInterceptor: (request: any) => {
              // Add any custom headers or modifications here
              return request;
            },
            responseInterceptor: (response: any) => {
              // Handle responses here
              return response;
            },
          });
        }
      };
      document.head.appendChild(script);
    };

    loadSwaggerUI();

    // Cleanup
    return () => {
      const existingLinks = document.querySelectorAll(
        'link[href*="swagger-ui"]',
      );
      const existingScripts = document.querySelectorAll(
        'script[src*="swagger-ui"]',
      );

      existingLinks.forEach((link) => link.remove());
      existingScripts.forEach((script) => script.remove());
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📚 API EcoDeli - Documentation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Documentation complète de l'API EcoDeli pour les développeurs.
            Testez les endpoints directement depuis cette interface.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✅ OpenAPI 3.0.3
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              🔒 JWT Authentication
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              🌍 Multilingue
            </span>
          </div>
        </div>

        <div
          ref={wrapperRef}
          id="swagger-ui"
          className="swagger-ui-container"
        />
      </div>
    </div>
  );
}
