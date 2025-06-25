#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const schemasDir = path.join(__dirname, "schemas");
const outputFile = path.join(__dirname, "schema.prisma");

// Commencer avec le contenu de base
let mergedContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

// Lire et fusionner tous les fichiers .prisma dans l'ordre
const files = fs.readdirSync(schemasDir).sort();

files.forEach((file) => {
  if (file.endsWith(".prisma")) {
    const content = fs.readFileSync(path.join(schemasDir, file), "utf8");
    mergedContent += `// From ${file}\n${content}\n\n`;
  }
});

// Écrire le fichier fusionné
fs.writeFileSync(outputFile, mergedContent);

console.log("✅ Schemas merged successfully!");
