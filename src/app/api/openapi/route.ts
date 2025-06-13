import { NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/openapi";

export async function GET() {
  try {
    const openApiSpec = generateOpenApiSpec();

    // Validation basique
    if (!openApiSpec || !openApiSpec.info) {
      throw new Error("Invalid OpenAPI specification generated");
    }

    return NextResponse.json(openApiSpec, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error generating OpenAPI spec:", error);

    // Retourner une spec minimale en cas d'erreur
    const fallbackSpec = {
      openapi: "3.0.0",
      info: {
        title: "EcoDeli API",
        version: "1.0.0",
        description:
          "API documentation temporarily unavailable - Server error occurred",
      },
      paths: {
        "/api/health": {
          get: {
            tags: ["Health"],
            summary: "Health check",
            description: "Check API health status",
            responses: {
              "200": {
                description: "Health status",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "healthy" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  code: { type: "string" },
                },
              },
            },
          },
        },
      },
    };

    return NextResponse.json(fallbackSpec, {
      status: 200, // Retourner 200 avec spec minimale plutôt que 500
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}
