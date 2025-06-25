#!/usr/bin/env node

/**
 * Script simple pour corriger les labels manquants
 * Usage: node scripts/i18n/fix-missing-labels.js
 */

const fs = require('fs')
const path = require('path')

/**
 * Messages français par défaut pour les labels manquants
 */
const missingTranslationsFr = {
  'auth.login.emailPlaceholder': 'Entrez votre adresse email',
  'auth.login.passwordPlaceholder': 'Entrez votre mot de passe',
  'auth.register.chooseType': 'Choisissez votre type de compte',
  'auth.register.firstName': 'Prénom',
  'auth.register.lastName': 'Nom',
  'auth.register.address': 'Adresse',
  'auth.register.city': 'Ville',
  'auth.register.postalCode': 'Code postal',
  'auth.register.termsAccepted': 'J\'accepte les conditions d\'utilisation',
  'auth.register.firstNamePlaceholder': 'Entrez votre prénom',
  'auth.register.lastNamePlaceholder': 'Entrez votre nom',
  'auth.register.addressPlaceholder': 'Entrez votre adresse',
  'auth.register.cityPlaceholder': 'Entrez votre ville',
  'auth.register.postalCodePlaceholder': 'Entrez votre code postal',
  'auth.register.confirmPasswordPlaceholder': 'Confirmez votre mot de passe',
  'auth.register.phonePlaceholder': 'Entrez votre numéro de téléphone'
}

/**
 * Messages anglais par défaut
 */
const missingTranslationsEn = {
  'auth.login.emailPlaceholder': 'Enter your email address',
  'auth.login.passwordPlaceholder': 'Enter your password',
  'auth.register.chooseType': 'Choose your account type',
  'auth.register.firstName': 'First name',
  'auth.register.lastName': 'Last name',
  'auth.register.address': 'Address',
  'auth.register.city': 'City',
  'auth.register.postalCode': 'Postal code',
  'auth.register.termsAccepted': 'I accept the terms of service',
  'auth.register.firstNamePlaceholder': 'Enter your first name',
  'auth.register.lastNamePlaceholder': 'Enter your last name',
  'auth.register.addressPlaceholder': 'Enter your address',
  'auth.register.cityPlaceholder': 'Enter your city',
  'auth.register.postalCodePlaceholder': 'Enter your postal code',
  'auth.register.confirmPasswordPlaceholder': 'Confirm your password',
  'auth.register.phonePlaceholder': 'Enter your phone number'
}

/**
 * Définir une valeur dans un objet imbriqué à partir d'une clé pointée
 */
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

/**
 * Obtenir une valeur dans un objet imbriqué à partir d'une clé pointée
 */
function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.')
  let current = obj
  
  for (const key of keys) {
    if (!(key in current)) {
      return undefined
    }
    current = current[key]
  }
  
  return current
}

/**
 * Corriger les labels manquants dans un fichier de traduction
 */
function fixTranslationFile(locale, missingTranslations) {
  const filePath = path.join(process.cwd(), 'src/messages', `${locale}.json`)
  
  try {
    // Lire le fichier existant
    const content = fs.readFileSync(filePath, 'utf-8')
    const translations = JSON.parse(content)
    
    let addedCount = 0
    
    // Ajouter les traductions manquantes
    for (const [key, value] of Object.entries(missingTranslations)) {
      if (!getNestedValue(translations, key)) {
        setNestedValue(translations, key, value)
        addedCount++
        console.log(`✅ Ajouté (${locale}): ${key} = "${value}"`)
      }
    }
    
    if (addedCount > 0) {
      // Sauvegarder le fichier
      const updatedContent = JSON.stringify(translations, null, 2)
      fs.writeFileSync(filePath, updatedContent, 'utf-8')
      console.log(`💾 Fichier ${locale}.json mis à jour (${addedCount} ajouts)`)
    } else {
      console.log(`ℹ️  Aucun label manquant dans ${locale}.json`)
    }
    
    return addedCount
    
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message)
    return 0
  }
}

function main() {
  console.log('🔧 EcoDeli - Correction des Labels Manquants')
  console.log('============================================')
  console.log('')
  
  try {
    // Corriger les fichiers français et anglais
    const frAdded = fixTranslationFile('fr', missingTranslationsFr)
    const enAdded = fixTranslationFile('en', missingTranslationsEn)
    
    console.log('')
    console.log('📊 Résumé:')
    console.log(`  🇫🇷 Français: ${frAdded} labels ajoutés`)
    console.log(`  🇬🇧 Anglais: ${enAdded} labels ajoutés`)
    console.log('')
    
    if (frAdded > 0 || enAdded > 0) {
      console.log('✨ Correction terminée avec succès!')
      console.log('')
      console.log('📌 Prochaines étapes:')
      console.log('  1. Redémarrer le serveur Next.js')
      console.log('  2. Vérifier que les erreurs de traduction ont disparu')
      console.log('  3. Tester les formulaires d\'inscription')
    } else {
      console.log('✅ Tous les labels sont déjà présents!')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

main() 