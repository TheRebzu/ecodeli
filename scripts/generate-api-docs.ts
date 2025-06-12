#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { generateOpenApiSpec } from '../src/lib/openapi';

async function generateApiDocumentation() {
  console.log('🚀 Generating API documentation...');

  try {
    // Generate OpenAPI specification
    console.log('📝 Generating OpenAPI specification...');
    const spec = generateOpenApiSpec();

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'docs', 'api');
    await fs.mkdir(outputDir, { recursive: true });

    // Write OpenAPI spec to file
    const specPath = path.join(outputDir, 'openapi.json');
    await fs.writeFile(specPath, JSON.stringify(spec, null, 2));
    console.log(`✅ OpenAPI specification generated: ${specPath}`);

    // Generate markdown documentation
    console.log('📖 Generating markdown documentation...');
    const markdownContent = generateMarkdownDocs(spec);
    const markdownPath = path.join(outputDir, 'README.md');
    await fs.writeFile(markdownPath, markdownContent);
    console.log(`✅ Markdown documentation generated: ${markdownPath}`);

    // Generate TypeScript client types
    console.log('🔧 Generating TypeScript types...');
    const typesContent = generateTypeScriptTypes(spec);
    const typesPath = path.join(outputDir, 'types.ts');
    await fs.writeFile(typesPath, typesContent);
    console.log(`✅ TypeScript types generated: ${typesPath}`);

    console.log('🎉 API documentation generation completed successfully!');
    console.log('\nGenerated files:');
    console.log(`  - ${specPath} (OpenAPI specification)`);
    console.log(`  - ${markdownPath} (Markdown documentation)`);
    console.log(`  - ${typesPath} (TypeScript types)`);
    console.log('\nYou can now:');
    console.log('  - View the interactive docs at /developers/api-docs');
    console.log('  - Use the generated types for API client development');
    console.log('  - Share the OpenAPI spec with external developers');

  } catch (error) {
    console.error('❌ Error generating API documentation:', error);
    process.exit(1);
  }
}

function generateMarkdownDocs(spec: any): string {
  const { info, servers, tags, paths } = spec;

  let markdown = `# ${info.title}\n\n`;
  markdown += `${info.description}\n\n`;
  
  if (info.version) {
    markdown += `**Version:** ${info.version}\n\n`;
  }

  if (servers && servers.length > 0) {
    markdown += `## Servers\n\n`;
    servers.forEach((server: any) => {
      markdown += `- **${server.description || 'Server'}:** \`${server.url}\`\n`;
    });
    markdown += '\n';
  }

  if (tags && tags.length > 0) {
    markdown += `## API Categories\n\n`;
    tags.forEach((tag: any) => {
      markdown += `### ${tag.name}\n`;
      if (tag.description) {
        markdown += `${tag.description}\n\n`;
      }
    });
  }

  if (paths) {
    markdown += `## Endpoints\n\n`;
    Object.entries(paths).forEach(([path, methods]: [string, any]) => {
      markdown += `### \`${path}\`\n\n`;
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
        markdown += `#### ${method.toUpperCase()}\n`;
        if (operation.summary) {
          markdown += `**Summary:** ${operation.summary}\n\n`;
        }
        if (operation.description) {
          markdown += `${operation.description}\n\n`;
        }
        if (operation.tags) {
          markdown += `**Tags:** ${operation.tags.join(', ')}\n\n`;
        }
      });
    });
  }

  markdown += `## Authentication\n\n`;
  markdown += `This API supports multiple authentication methods:\n\n`;
  markdown += `- **Session Authentication:** Browser session cookies\n`;
  markdown += `- **Bearer Token:** JWT tokens for API access\n\n`;

  markdown += `## Error Handling\n\n`;
  markdown += `All errors follow a consistent format:\n\n`;
  markdown += `\`\`\`json\n`;
  markdown += `{\n`;
  markdown += `  "error": {\n`;
  markdown += `    "message": "Error description",\n`;
  markdown += `    "code": "ERROR_CODE",\n`;
  markdown += `    "data": { /* Additional error data */ }\n`;
  markdown += `  }\n`;
  markdown += `}\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `## Rate Limiting\n\n`;
  markdown += `API requests are rate limited to ensure fair usage:\n\n`;
  markdown += `- **Authenticated users:** 1000 requests per hour\n`;
  markdown += `- **Unauthenticated users:** 100 requests per hour\n\n`;

  markdown += `## Support\n\n`;
  markdown += `For API support, please contact us at support@ecodeli.com\n`;

  return markdown;
}

function generateTypeScriptTypes(spec: any): string {
  const { components } = spec;
  
  let types = `// Generated TypeScript types for EcoDeli API\n`;
  types += `// This file is auto-generated. Do not edit manually.\n\n`;

  if (components?.schemas) {
    types += `export namespace EcoDeliAPI {\n`;
    
    Object.entries(components.schemas).forEach(([name, schema]: [string, any]) => {
      types += `  export interface ${name} {\n`;
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([prop, propSchema]: [string, any]) => {
          const isRequired = schema.required?.includes(prop);
          const optional = isRequired ? '' : '?';
          let propType = 'any';
          
          if (propSchema.type === 'string') {
            if (propSchema.enum) {
              propType = propSchema.enum.map((e: string) => `'${e}'`).join(' | ');
            } else {
              propType = 'string';
            }
          } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
            propType = 'number';
          } else if (propSchema.type === 'boolean') {
            propType = 'boolean';
          } else if (propSchema.type === 'array') {
            const itemType = propSchema.items?.type || 'any';
            propType = `${itemType}[]`;
          } else if (propSchema.type === 'object') {
            propType = 'Record<string, any>';
          }
          
          types += `    ${prop}${optional}: ${propType};\n`;
        });
      }
      types += `  }\n\n`;
    });
    
    types += `}\n\n`;
  }

  // Add API response types
  types += `export interface ApiResponse<T = any> {\n`;
  types += `  result?: {\n`;
  types += `    data: T;\n`;
  types += `  };\n`;
  types += `  error?: {\n`;
  types += `    message: string;\n`;
  types += `    code: string;\n`;
  types += `    data?: any;\n`;
  types += `  };\n`;
  types += `}\n\n`;

  // Add pagination types
  types += `export interface PaginatedResponse<T> {\n`;
  types += `  data: T[];\n`;
  types += `  meta: {\n`;
  types += `    page: number;\n`;
  types += `    limit: number;\n`;
  types += `    total: number;\n`;
  types += `    totalPages: number;\n`;
  types += `    hasNext: boolean;\n`;
  types += `    hasPrev: boolean;\n`;
  types += `  };\n`;
  types += `}\n`;

  return types;
}

// Run the script if called directly
if (require.main === module) {
  generateApiDocumentation().catch(console.error);
}

export { generateApiDocumentation };