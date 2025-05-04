/**
 * Script pour ajouter l'import des types PageProps et MetadataProps 
 * dans tous les fichiers de page pertinents.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Obtenir le répertoire courant en utilisant ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '../src/app');

// Fonction récursive pour parcourir les répertoires
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file === 'page.tsx') {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Vérifier si le fichier utilise déjà les types
      if (!content.includes('import { PageProps') && !content.includes('from \'@/types/next\'')) {
        // Vérifier s'il y a un export default async function
        if (content.includes('export default async function') && content.includes('params')) {
          console.log(`Processing: ${filePath}`);
          
          // Ajouter l'import des types
          let updatedContent = content;
          
          // Trouver la dernière importation
          const importLines = content.split('\n').filter(line => line.trim().startsWith('import '));
          const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
          
          if (lastImportIndex !== -1) {
            const beforeImports = content.substring(0, lastImportIndex + importLines[importLines.length - 1].length);
            const afterImports = content.substring(lastImportIndex + importLines[importLines.length - 1].length);
            
            updatedContent = beforeImports + '\nimport { PageProps, MetadataProps } from \'@/types/next\';' + afterImports;
          }
          
          // Remplacer le type des props dans la fonction
          updatedContent = updatedContent.replace(
            /params,\s*}:\s*{\s*params:\s*{\s*locale:\s*string;[^}]*}\s*}\)/g,
            'params, }: PageProps)'
          );
          
          // Remplacer le type des props dans generateMetadata si présent
          updatedContent = updatedContent.replace(
            /export async function generateMetadata\(\{\s*params,\s*}:\s*{\s*params:\s*{\s*locale:\s*string;[^}]*}\s*}\)/g,
            'export async function generateMetadata({ params, }: MetadataProps)'
          );
          
          fs.writeFileSync(filePath, updatedContent, 'utf-8');
        }
      }
    }
  });
}

// Démarrer le traitement
processDirectory(appDir);
console.log('Script terminé. Les types ont été mis à jour dans les fichiers pertinents.'); 