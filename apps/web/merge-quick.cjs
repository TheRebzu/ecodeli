#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.resolve(process.cwd(), 'prisma/schemas');
const OUTPUT_SCHEMA = path.resolve(process.cwd(), 'prisma/schema.prisma');

const DOMAIN_ORDER = [
  'shared', 'users', 'client', 'deliveries', 'services', 'appointments', 
  'storage', 'payments', 'billing', 'merchant', 'admin', 'messages'
];

function getDomainFiles(domain) {
  const domainPath = path.join(SCHEMAS_DIR, domain);
  if (!fs.existsSync(domainPath)) return [];
  return fs.readdirSync(domainPath)
    .filter(file => file.endsWith('.prisma'))
    .map(file => path.join(domainPath, file));
}

function processSchemaFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('generator ') && 
           !trimmed.startsWith('datasource ') &&
           !trimmed.match(/^provider\s*=/) &&
           !trimmed.match(/^url\s*=/);
  });
  return filteredLines.join('\n');
}

function generateHeader() {
  return `// Ce fichier est généré automatiquement à partir des fichiers fragmentés dans /prisma/schemas/
// Ne pas modifier directement - éditer les fichiers sources puis reconstruire

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

${DOMAIN_ORDER.map(domain => `// Import schémas du domaine ${domain}`).join('\n')}

`;
}

function main() {
  console.log('🔄 Fusion des schémas Prisma...');
  let mergedContent = generateHeader();
  
  for (const domain of DOMAIN_ORDER) {
    const files = getDomainFiles(domain);
    if (files.length > 0) {
      mergedContent += `\n// ----- DOMAINE: ${domain.toUpperCase()} -----\n\n`;
      files.forEach(file => {
        console.log(`📖 ${path.relative(process.cwd(), file)}`);
        const content = processSchemaFile(file);
        mergedContent += content + '\n';
      });
    }
  }
  
  fs.writeFileSync(OUTPUT_SCHEMA, mergedContent);
  console.log(`✅ Schéma fusionné: ${Math.round(mergedContent.length / 1024)} KB`);
}

main();