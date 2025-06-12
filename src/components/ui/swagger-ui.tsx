'use client';

import { useEffect, useRef } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIComponentProps {
  url?: string;
  spec?: object;
  docExpansion?: 'none' | 'list' | 'full';
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
  defaultModelRendering?: 'example' | 'model';
  presets?: any[];
  plugins?: any[];
  layout?: string;
  validatorUrl?: string | null;
  withCredentials?: boolean;
}

export default function SwaggerUIComponent({
  url = '/api/openapi',
  spec,
  docExpansion = 'list',
  defaultModelsExpandDepth = 1,
  deepLinking = true,
  showExtensions = true,
  showCommonExtensions = true,
  filter = true,
  supportedSubmitMethods = ['get', 'post', 'put', 'delete', 'patch'],
  tryItOutEnabled = true,
  showMutatedRequest = true,
  defaultModelExpandDepth = 1,
  defaultModelRendering = 'example',
  validatorUrl = null,
  withCredentials = true,
  ...props
}: SwaggerUIComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom request interceptor to add authentication headers
  const requestInterceptor = (req: any) => {
    // Add CSRF token and session cookies for tRPC endpoints
    if (req.url.includes('/api/trpc')) {
      req.credentials = 'include';
      req.headers['Content-Type'] = 'application/json';
    }
    return req;
  };

  // Custom response interceptor for better error handling
  const responseInterceptor = (res: any) => {
    // Handle tRPC error format
    if (res.status >= 400 && res.obj?.error) {
      console.warn('API Error:', res.obj.error);
    }
    return res;
  };

  useEffect(() => {
    // Custom CSS for better integration with the app theme
    const style = document.createElement('style');
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
      .swagger-ui .parameter__name {
        font-weight: 600;
      }
      .swagger-ui .parameter__type {
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div ref={containerRef} className="swagger-ui-container">
      <SwaggerUI
        url={spec ? undefined : url}
        spec={spec}
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