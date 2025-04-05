import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'EcoDeli API',
        version: '1.0.0',
        description: 'API documentation for EcoDeli - A platform connecting individuals, merchants, and service providers for eco-friendly deliveries',
        contact: {
          name: 'EcoDeli Support',
          email: 'support@ecodeli.me',
        },
      },
      servers: [
        {
          url: '/api',
          description: 'Current environment',
        },
      ],
      tags: [
        {
          name: 'trips',
          description: 'Planned trip operations',
        },
        {
          name: 'deliveries',
          description: 'Delivery operations',
        },
        {
          name: 'warehouses',
          description: 'Warehouse operations',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });
  return spec;
}; 