import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

/**
 * @openapi
 * /api/trpc/public.health:
 *   post:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: Check API health status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input:
 *                 type: object
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "healthy"
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EcoDeli API",
      version: "1.0.0",
      description:
        "API documentation for EcoDeli platform - A comprehensive delivery and services platform",
      contact: {
        name: "EcoDeli API Support",
        email: "support@ecodeli.com"},
      license: {
        name: "Private License"}},
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Development server"},
      {
        url: "https://api.ecodeli.com",
        description: "Production server"}],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"},
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token"}},
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                code: { type: "string" },
                data: { type: "object" }}}}},
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: {
              type: "string",
              enum: ["CLIENT", "MERCHANT", "DELIVERER", "PROVIDER", "ADMIN"]},
            isVerified: { type: "boolean" },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "SUSPENDED"]},
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }}},
        Announcement: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            type: {
              type: "string",
              enum: ["DELIVERY", "SERVICE", "STORAGE"]},
            status: {
              type: "string",
              enum: [
                "DRAFT",
                "PUBLISHED",
                "ASSIGNED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED"]},
            pricing: {
              type: "object",
              properties: {
                amount: { type: "number" },
                currency: { type: "string", default: "EUR" }}},
            location: {
              type: "object",
              properties: {
                address: { type: "string" },
                latitude: { type: "number" },
                longitude: { type: "number" }}},
            clientId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }}},
        Delivery: {
          type: "object",
          properties: {
            id: { type: "string" },
            announcementId: { type: "string" },
            delivererId: { type: "string" },
            status: {
              type: "string",
              enum: [
                "PENDING",
                "ACCEPTED",
                "IN_PROGRESS",
                "DELIVERED",
                "CANCELLED"]},
            pickupLocation: {
              type: "object",
              properties: {
                address: { type: "string" },
                latitude: { type: "number" },
                longitude: { type: "number" }}},
            deliveryLocation: {
              type: "object",
              properties: {
                address: { type: "string" },
                latitude: { type: "number" },
                longitude: { type: "number" }}},
            estimatedDeliveryTime: { type: "string", format: "date-time" },
            actualDeliveryTime: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }}},
        Service: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            categoryId: { type: "string" },
            providerId: { type: "string" },
            pricing: {
              type: "object",
              properties: {
                basePrice: { type: "number" },
                currency: { type: "string", default: "EUR" },
                unit: { type: "string" }}},
            availability: {
              type: "object",
              properties: {
                schedules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
                      startTime: { type: "string", format: "time" },
                      endTime: { type: "string", format: "time" }}}}}},
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }}},
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100 },
            total: { type: "integer", minimum: 0 },
            totalPages: { type: "integer", minimum: 0 },
            hasNext: { type: "boolean" },
            hasPrev: { type: "boolean" }}}},
      responses: {
        UnauthorizedError: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: {
                  message:
                    "Vous devez être connecté pour accéder à cette ressource",
                  code: "UNAUTHORIZED"}}}}},
        ForbiddenError: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: {
                  message: "Accès interdit",
                  code: "FORBIDDEN"}}}}},
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: {
                  message: "Ressource non trouvée",
                  code: "NOT_FOUND"}}}}},
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                error: {
                  message: "Erreur de validation",
                  code: "BAD_REQUEST",
                  data: {
                    zodError: {
                      fieldErrors: {},
                      formErrors: []}}}}}}}},
      parameters: {
        pageParam: {
          name: "page",
          in: "query",
          description: "Page number",
          schema: {
            type: "integer",
            minimum: 1,
            default: 1}},
        limitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10}},
        searchParam: {
          name: "search",
          in: "query",
          description: "Search query",
          schema: {
            type: "string"}}}},
    tags: [
      {
        name: "Authentication",
        description: "User authentication and session management"},
      {
        name: "Users",
        description: "User management operations"},
      {
        name: "Announcements",
        description: "Client announcements for deliveries and services"},
      {
        name: "Deliveries",
        description: "Delivery management and tracking"},
      {
        name: "Services",
        description: "Service provider offerings and bookings"},
      {
        name: "Payments",
        description: "Payment processing and wallet management"},
      {
        name: "Storage",
        description: "Storage box reservations and management"},
      {
        name: "Admin",
        description: "Administrative functions"},
      {
        name: "Real-time",
        description: "Live tracking and notifications"}],
    security: [
      {
        sessionAuth: []},
      {
        bearerAuth: []}]},
  apis: [
    path.join(process.cwd(), "src/server/api/routers/**/*.ts"),
    path.join(process.cwd(), "src/app/api/**/*.ts"),
    filename, // Include this file for inline documentation
  ]};

export const specs = swaggerJsdoc(options);

export const generateOpenApiSpec = () => {
  return specs;
};

// Export OpenAPI configuration for use in documentation generation
export const openApiConfig = options;
