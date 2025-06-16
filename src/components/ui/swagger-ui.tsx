"use client";

import { useEffect, useRef, useState } from "react";
import SwaggerUI from "swagger-ui-react";

interface SwaggerUIComponentProps {
  url?: string;
  spec?: object;
  docExpansion?: "none" | "list" | "full";
  defaultModelsExpandDepth?: number;
  deepLinking?: boolean;
  showExtensions?: boolean;
  showCommonExtensions?: boolean;
  filter?: boolean | string;
  supportedSubmitMethods?: string[];
  tryItOutEnabled?: boolean;
  requestInterceptor?: (request: any) => any;
  responseInterceptor?: (response: any) => any;
  showMutatedRequest?: boolean;
  defaultModelExpandDepth?: number;
  defaultModelRendering?: "example" | "model";
  presets?: any[];
  plugins?: any[];
  layout?: string;
  validatorUrl?: string | null;
  withCredentials?: boolean;
}

export default function SwaggerUIComponent({
  url = "/api/openapi",
  spec,
  docExpansion = "list",
  defaultModelsExpandDepth = 1,
  deepLinking = true,
  showExtensions = true,
  showCommonExtensions = true,
  filter = true,
  supportedSubmitMethods = ["get", "post", "put", "delete", "patch"],
  tryItOutEnabled = true,
  showMutatedRequest = true,
  defaultModelExpandDepth = 1,
  defaultModelRendering = "example",
  validatorUrl = null,
  withCredentials = true,
  ...props
}: SwaggerUIComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiSpec, setApiSpec] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom request interceptor to add authentication headers
  const requestInterceptor = (req: any) => {
    // Add CSRF token and session cookies for tRPC endpoints
    if (req.url.includes("/api/trpc")) {
      req.credentials = "include";
      req.headers["Content-Type"] = "application/json";
    }
    return req;
  };

  // Custom response interceptor for better error handling
  const responseInterceptor = (res: any) => {
    // Handle tRPC error format
    if (res.status >= 400 && res.obj?.error) {
      console.warn("API Error:", res.obj.error);
    }
    return res;
  };

  // Load API spec and check completeness
  useEffect(() => {
    const loadApiSpec = async () => {
      try {
        const response = await fetch(url);
        const data = await response.json();
        setApiSpec(data);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load API specification");
        setIsLoading(false);
      }
    };

    if (!spec) {
      loadApiSpec();
    } else {
      setApiSpec(spec);
      setIsLoading(false);
    }
  }, [url, spec]);

  useEffect(() => {
    // Custom CSS for better integration with the app theme
    const style = document.createElement("style");
    style.textContent = `
      .swagger-ui {
        font-family: inherit;
      }
      .swagger-ui .topbar {
        display: none;
      }
      .swagger-ui .info {
        margin: 20px 0;
      }
      .swagger-ui .scheme-container {
        background: transparent;
        box-shadow: none;
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
      }
      .swagger-ui .opblock {
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        margin-bottom: 10px;
      }
      .swagger-ui .opblock.opblock-get .opblock-summary {
        border-color: hsl(var(--primary));
      }
      .swagger-ui .opblock.opblock-post .opblock-summary {
        border-color: hsl(var(--secondary));
      }
      .swagger-ui .opblock.opblock-put .opblock-summary {
        border-color: hsl(var(--accent));
      }
      .swagger-ui .opblock.opblock-delete .opblock-summary {
        border-color: hsl(var(--destructive));
      }
      .swagger-ui .btn {
        border-radius: var(--radius);
      }
      .swagger-ui .btn.execute {
        background-color: hsl(var(--primary));
        border-color: hsl(var(--primary));
      }
      .swagger-ui .btn.execute:hover {
        background-color: hsl(var(--primary) / 0.9);
      }
      .swagger-ui input[type="text"],
      .swagger-ui input[type="password"],
      .swagger-ui input[type="email"],
      .swagger-ui textarea,
      .swagger-ui select {
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
      }
      .swagger-ui .response-col_status {
        font-family: var(--font-mono);
      }
      .swagger-ui .highlight-code {
        background-color: hsl(var(--muted));
        border-radius: var(--radius);
      }
      .swagger-ui .model-box {
        background-color: hsl(var(--muted) / 0.5);
        border-radius: var(--radius);
      }
      .swagger-ui .parametername {
        font-weight: 600;
      }
      .swagger-ui .parametertype {
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check API documentation completeness
  const getDocumentationStats = () => {
    if (!apiSpec?.paths) return { endpoints: 0, documented: 0 };

    const endpoints = Object.keys(apiSpec.paths).length;
    const documented = Object.values(apiSpec.paths).filter((path: any) =>
      Object.values(path).some(
        (method: any) => method.summary || method.description,
      ),
    ).length;

    return { endpoints, documented };
  };

  const stats = getDocumentationStats();
  const completeness =
    stats.endpoints > 0
      ? Math.round((stats.documented / stats.endpoints) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Chargement de la documentation API...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded-lg bg-destructive/10 border-destructive/20">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Erreur de chargement
        </h3>
        <p className="text-destructive/80 mb-4">{error}</p>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Solutions possibles :</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-destructive/70">
            <li>Vérifiez que le serveur Next.js est en cours d'exécution</li>
            <li>
              Consultez la{" "}
              <a href="/fr/developers/api-manual" className="underline">
                documentation manuelle
              </a>
            </li>
            <li>Actualisez la page</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="swagger-ui-container">
      {/* Documentation Status Banner */}
      <div className="mb-6 p-4 border rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">État de la documentation</h4>
            <p className="text-sm text-muted-foreground">
              {stats.documented} sur {stats.endpoints} endpoints documentés (
              {completeness}%)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-sm font-medium">{completeness}%</span>
          </div>
        </div>

        {completeness < 100 && (
          <div className="mt-3 text-sm text-muted-foreground">
            <p>🚧 Documentation en cours de développement.</p>
            <p>
              Pour une documentation complète, consultez la{" "}
              <a
                href="/fr/developers/api-manual"
                className="text-primary hover:underline"
              >
                version manuelle
              </a>
              .
            </p>
          </div>
        )}
      </div>

      <SwaggerUI
        url={spec ? undefined : url}
        spec={apiSpec || spec}
        docExpansion={docExpansion}
        defaultModelsExpandDepth={defaultModelsExpandDepth}
        deepLinking={deepLinking}
        showExtensions={showExtensions}
        showCommonExtensions={showCommonExtensions}
        filter={filter}
        supportedSubmitMethods={supportedSubmitMethods}
        tryItOutEnabled={tryItOutEnabled}
        requestInterceptor={requestInterceptor}
        responseInterceptor={responseInterceptor}
        showMutatedRequest={showMutatedRequest}
        defaultModelExpandDepth={defaultModelExpandDepth}
        defaultModelRendering={defaultModelRendering}
        validatorUrl={validatorUrl}
        withCredentials={withCredentials}
        {...props}
      />
    </div>
  );
}
