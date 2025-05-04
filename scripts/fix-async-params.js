/**
 * Script pour mettre à jour l'utilisation des paramètres asynchrones dans les pages
 * dans tous les fichiers de page pertinents.
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
      
      // Vérifier si le fichier utilise params.locale directement
      if (content.includes('params.locale') && 
          (content.includes('PageProps') || content.includes('MetadataProps'))) {
        
        console.log(`Processing: ${filePath}`);
        
        // Mettre à jour le contenu pour attendre les paramètres
        let updatedContent = content;
        
        // Remplacer l'utilisation directe de params.locale dans les fonctions
        updatedContent = updatedContent.replace(
          /const\s+locale\s*=\s*params\.locale/g,
          `// Attendre la résolution des paramètres\n  const resolvedParams = await params;\n  const locale = resolvedParams.locale`
        );
        
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
      }
    }
  });
}

// Démarrer le traitement
processDirectory(appDir);
console.log('Script terminé. Les paramètres async ont été mis à jour dans les fichiers pertinents.'); 