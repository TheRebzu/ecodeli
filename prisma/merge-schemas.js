#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const schemasDir = path.join(__dirname, "schemas");
const outputFile = path.join(__dirname, "schema.prisma");

// Lire le fichier de base
let mergedContent = fs.readFileSync(outputFile, "utf8");
mergedContent += "\\n\\n// ========== MERGED SCHEMAS ==========\\n\\n";

// Lire et fusionner tous les fichiers .prisma dans l'ordre
const files = fs.readdirSync(schemasDir).sort();

files.forEach((file) => {
  if (file.endsWith(".prisma")) {
    const content = fs.readFileSync(path.join(schemasDir, file), "utf8");
    mergedContent += `\\n// From ${file}\\n${content}\\n`;
  }
});

// Écrire le fichier fusionné
fs.writeFileSync(outputFile + ".merged", mergedContent);

console.log("✅ Schemas merged successfully!");
