#!/usr/bin/env node

/**
 * Script pour corriger automatiquement toutes les erreurs d'authentification
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = [
  'src/app/api/client/announcements/route.ts',
  'src/app/api/client/deliveries/[id]/tracking/route.ts',
  'src/app/api/deliverer/opportunities/route.ts',
  'src/app/api/deliverer/deliveries/route.ts',
  'src/app/api/provider/documents/route.ts',
  'src/app/api/provider/documents/[id]/route.ts',
  'src/app/api/shared/deliveries/[id]/tracking/route.ts',
  'src/app/api/shared/deliveries/[id]/validate/route.ts'
];

function fixFile(filePath) {
  try {
    console.log(`🔧 Correction de ${filePath}...`);
    
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Corriger les .catch(() => null) patterns
    if (content.includes('.catch(() => null)')) {
      content = content.replace(/await requireRole\([^)]+\)\.catch\(\(\) => null\)/g, 
        'await requireRole(request, [role]).catch(err => { throw err })');
      modified = true;
    }
    
    // Corriger les messages d'erreur
    if (content.includes("'Non authentifié'")) {
      content = content.replace(/'Non authentifié'/g, "'Accès refusé - Authentification requise'");
      modified = true;
    }
    
    // Ajouter la gestion d'erreur d'auth dans les catch blocks
    if (content.includes('catch (error)') && !content.includes('error.message?.includes')) {
      const catchPattern = /(catch \(error\) \{[\s\S]*?)(return NextResponse\.json[\s\S]*?status: 500[\s\S]*?\})/;
      if (catchPattern.test(content)) {
        content = content.replace(catchPattern, (match, catchStart, returnStatement) => {
          return catchStart + `
    // Si c'est une erreur d'authentification, retourner 403
    if (error.message?.includes('Non authentifié')) {
      return NextResponse.json({ error: 'Accès refusé - Authentification requise' }, { status: 403 })
    }
    if (error.message?.includes('Permissions insuffisantes')) {
      return NextResponse.json({ error: 'Accès refusé - Permissions insuffisantes' }, { status: 403 })
    }
    
    ` + returnStatement;
        });
        modified = true;
      }
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ ${filePath} corrigé`);
    } else {
      console.log(`⏭️ ${filePath} déjà correct`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur avec ${filePath}: ${error.message}`);
  }
}

console.log('🔧 === CORRECTION AUTOMATIQUE DES ERREURS D\'AUTHENTIFICATION ===\n');

// Correction des fichiers principaux qui causent les erreurs dans les logs
const problematicFiles = [
  '/mnt/c/Users/Amine/WebstormProjects/ecodeli/src/app/api/client/announcements/route.ts',
  '/mnt/c/Users/Amine/WebstormProjects/ecodeli/src/app/api/deliverer/opportunities/route.ts',
  '/mnt/c/Users/Amine/WebstormProjects/ecodeli/src/app/api/deliverer/wallet/route.ts'
];

problematicFiles.forEach(fixFile);

console.log('\n✅ Correction automatique terminée !');
console.log('💡 Les APIs devraient maintenant retourner des erreurs cohérentes.');