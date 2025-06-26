const fs = require('fs')
const path = require('path')

function cleanSchema() {
  console.log('🧹 Nettoyage du schéma Prisma...')
  
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma')
  let content = fs.readFileSync(schemaPath, 'utf8')
  
  // Supprimer les doublons de modèles et enums
  const lines = content.split('\n')
  const cleanedLines = []
  const seenModels = new Set()
  const seenEnums = new Set()
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Détecter les modèles
    if (line.startsWith('model ')) {
      const modelName = line.split(' ')[1]
      if (seenModels.has(modelName)) {
        console.log(`⚠️  Suppression du modèle dupliqué: ${modelName}`)
        // Ignorer ce modèle et tout son contenu jusqu'à la fin
        while (i < lines.length && !lines[i].trim().startsWith('}')) {
          i++
        }
        continue
      } else {
        seenModels.add(modelName)
      }
    }
    
    // Détecter les enums
    if (line.startsWith('enum ')) {
      const enumName = line.split(' ')[1]
      if (seenEnums.has(enumName)) {
        console.log(`⚠️  Suppression de l'enum dupliqué: ${enumName}`)
        // Ignorer cet enum et tout son contenu jusqu'à la fin
        while (i < lines.length && !lines[i].trim().startsWith('}')) {
          i++
        }
        continue
      } else {
        seenEnums.add(enumName)
      }
    }
    
    cleanedLines.push(lines[i])
  }
  
  // Écrire le schéma nettoyé
  const cleanedContent = cleanedLines.join('\n')
  fs.writeFileSync(schemaPath, cleanedContent)
  
  console.log('✅ Schéma nettoyé avec succès!')
  console.log(`📊 Modèles uniques: ${seenModels.size}`)
  console.log(`📊 Enums uniques: ${seenEnums.size}`)
}

// Exécution du script
if (require.main === module) {
  cleanSchema()
}

module.exports = { cleanSchema } 