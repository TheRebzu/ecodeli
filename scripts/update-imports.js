const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fonction pour mettre à jour les imports dans un fichier
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Mettre à jour les imports de validation
    if (content.includes("from '@/lib/validations") || content.includes("from '@/lib/validators")) {
      content = content.replace(/from ['"]@\/lib\/validations\/(.*)['"]/g, "from '@/lib/validation/\'");
      content = content.replace(/from ['"]@\/lib\/validators\/(.*)['"]/g, "from '@/lib/validation/\'");
      updated = true;
    }
    
    // Mettre à jour les imports d'authentification
    if (content.includes("from '@/auth.config") || content.includes("from '@/auth")) {
      content = content.replace(/from ['"]@\/auth\.config['"]/g, "from '@/lib/auth/auth.config'");
      content = content.replace(/from ['"]@\/auth['"]/g, "from '@/lib/auth/auth'");
      updated = true;
    }
    
    // Mettre à jour les imports de services avec noms incorrects
    if (content.includes(".serviceService")) {
      content = content.replace(/\.serviceService/g, "Service");
      updated = true;
    }
    
    // Écrire le fichier mis à jour si des changements ont été effectués
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(Imports mis à jour dans \);
    }
  } catch (error) {
    console.error(Erreur lors de la mise à jour des imports dans \:, error);
  }
}

// Trouver tous les fichiers TypeScript et TSX
const files = glob.sync('./src/**/*.{ts,tsx}');

// Mettre à jour les imports dans chaque fichier
files.forEach(updateImportsInFile);

console.log('Migration des imports terminée');
