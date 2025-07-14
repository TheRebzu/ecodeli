const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🧹 Nettoyage des fichiers i18n corrompus...');

function cleanI18nFile(filePath, language) {
  try {
    // Charger le fichier
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Supprimer toutes les clés numériques
    const cleanData = {};
    
    Object.keys(data).forEach(key => {
      // Garder seulement les clés qui ne sont pas numériques
      if (isNaN(key) && key !== "0") {
        cleanData[key] = data[key];
      } else {
        console.log(`❌ Suppression de la clé corrompue: "${key}"`);
      }
    });
    
    // Sauvegarder le fichier nettoyé
    fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2), 'utf8');
    
    console.log(`✅ Fichier ${language} nettoyé avec succès!`);
    console.log(`📊 Clés valides conservées: ${Object.keys(cleanData).length}`);
    
  } catch (error) {
    console.log(`❌ Erreur lors du nettoyage de ${language}:`, error.message);
  }
}

// Nettoyer les deux fichiers
cleanI18nFile(frMessagesPath, 'français');
cleanI18nFile(enMessagesPath, 'anglais');

console.log('🎉 Nettoyage terminé !'); 