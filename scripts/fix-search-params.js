/**
 * Script pour ajouter searchParams à toutes les signatures de fonctions
 * utilisant PageProps ou MetadataProps.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      
      // Vérifier si le fichier utilise PageProps ou MetadataProps
      if (content.includes('PageProps') || content.includes('MetadataProps')) {
        console.log(`Processing: ${filePath}`);
        
        // Mettre à jour le contenu pour ajouter searchParams aux fonctions
        let updatedContent = content;
        
        // Ajouter searchParams aux signatures de fonction
        updatedContent = updatedContent.replace(
          /export\s+(default\s+)?async\s+function\s+\w+\(\{\s*params,\s*\}:\s*(PageProps|MetadataProps)/g,
          'export $1async function $2({ params, searchParams }: $3'
        );
        
        // Pour les fonctions generateMetadata
        updatedContent = updatedContent.replace(
          /export\s+async\s+function\s+generateMetadata\(\{\s*params,\s*\}:\s*(PageProps|MetadataProps)/g,
          'export async function generateMetadata({ params, searchParams }: $1'
        );
        
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
      }
    }
  });
}

// Démarrer le traitement
processDirectory(appDir);
console.log('Script terminé. searchParams a été ajouté aux signatures de fonction.'); 