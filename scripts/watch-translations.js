#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { fixMissingTranslations, validateTranslations } = require('./fix-missing-translations');

const MESSAGES_DIR = path.join(__dirname, '../src/messages');
const COMPONENTS_DIR = path.join(__dirname, '../src');

console.log('🔍 Surveillance des traductions activée...');
console.log(`📁 Dossier messages: ${MESSAGES_DIR}`);
console.log(`📁 Dossier composants: ${COMPONENTS_DIR}`);

// Surveiller les fichiers de traduction
const watcher = chokidar.watch([
  path.join(MESSAGES_DIR, '*.json'),
  path.join(COMPONENTS_DIR, '**/*.{ts,tsx,js,jsx}')
], {
  ignored: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/*.test.*',
    '**/*.spec.*'
  ],
  persistent: true
});

let debounceTimer = null;

function handleFileChange(filePath) {
  console.log(`📝 Fichier modifié: ${path.relative(process.cwd(), filePath)}`);
  
  // Débouncer pour éviter les appels multiples
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    console.log('🔍 Vérification des traductions...');
    
    const isValid = validateTranslations();
    
    if (!isValid) {
      console.log('🔧 Correction automatique des traductions...');
      fixMissingTranslations();
    }
  }, 1000);
}

watcher
  .on('change', handleFileChange)
  .on('add', handleFileChange)
  .on('ready', () => {
    console.log('✅ Surveillance initialisée');
    
    // Vérification initiale
    console.log('🔍 Vérification initiale...');
    const isValid = validateTranslations();
    
    if (!isValid) {
      console.log('🔧 Correction automatique des traductions...');
      fixMissingTranslations();
    }
  })
  .on('error', error => {
    console.error('❌ Erreur de surveillance:', error);
  });

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt de la surveillance...');
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt de la surveillance...');
  watcher.close();
  process.exit(0);
});