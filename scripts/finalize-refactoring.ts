#!/usr/bin/env tsx

/**
 * Script de finalisation de la refactorisation
 * Vérifie et nettoie les dernières simulations/mocks dans le codebase
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

interface SimulationReport {
  file: string;
  line: number;
  content: string;
  type: 'simulation' | 'mock' | 'hardcoded' | 'todo';
}

const patterns = [
  // Simulations et mocks
  /simulation|simulate|mock|fake|dummy/i,
  // Données hardcodées
  /hardcode|hardcoded/i,
  // TODOs et FIXMEs
  /TODO|FIXME|not implemented|placeholder/i,
  // Console.log de simulation
  /console\.log.*simulation/i,
  // Promise.resolve vides suspects
  /Promise\.resolve\(\[\]\)/,
  // setTimeout de simulation
  /setTimeout.*simulation/i,
];

const excludePatterns = [
  // Exclure les fichiers de test et mocks légitimes
  /test|spec|mock|__tests__|\.test\.|\.spec\./i,
  // Exclure les node_modules et dist
  /node_modules|dist|build|\.next/,
  // Exclure ce script
  /finalize-refactoring/,
];

async function scanFile(filePath: string): Promise<SimulationReport[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const reports: SimulationReport[] = [];

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.test(line)) {
          const type = getSimulationType(line);
          reports.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            type
          });
        }
      });
    });

    return reports;
  } catch (error) {
    console.error(`Erreur lecture fichier ${filePath}:`, error);
    return [];
  }
}

function getSimulationType(line: string): SimulationReport['type'] {
  if (/simulation|simulate|mock|fake/i.test(line)) return 'simulation';
  if (/hardcode|hardcoded/i.test(line)) return 'hardcoded';
  if (/TODO|FIXME|not implemented/i.test(line)) return 'todo';
  return 'mock';
}

async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Exclure les répertoires et fichiers selon les patterns
      if (excludePatterns.some(pattern => pattern.test(fullPath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Erreur scan répertoire ${dir}:`, error);
  }
  
  return files;
}

async function generateReport(reports: SimulationReport[]): Promise<void> {
  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.type]) acc[report.type] = [];
    acc[report.type].push(report);
    return acc;
  }, {} as Record<string, SimulationReport[]>);

  console.log('\n🔍 RAPPORT DE REFACTORISATION - SIMULATIONS RESTANTES\n');
  console.log('=' .repeat(60));

  if (reports.length === 0) {
    console.log('✅ SUCCÈS: Aucune simulation ou mock détecté !');
    console.log('🎉 La refactorisation est complète.');
    return;
  }

  Object.entries(groupedReports).forEach(([type, typeReports]) => {
    console.log(`\n📋 ${type.toUpperCase()} (${typeReports.length} occurrences):`);
    console.log('-'.repeat(40));
    
    typeReports.forEach(report => {
      const relativePath = path.relative(projectRoot, report.file);
      console.log(`📁 ${relativePath}:${report.line}`);
      console.log(`   ${report.content}`);
      console.log('');
    });
  });

  console.log('\n⚠️  ACTIONS RECOMMANDÉES:');
  console.log('1. Examiner chaque occurrence ci-dessus');
  console.log('2. Remplacer les simulations par des implémentations réelles');
  console.log('3. Supprimer les TODOs/FIXMEs non critiques');
  console.log('4. Relancer ce script pour vérifier');
}

async function createCleanupSuggestions(reports: SimulationReport[]): Promise<void> {
  const suggestions: string[] = [
    '# SUGGESTIONS DE NETTOYAGE AUTOMATIQUE',
    '',
    'Voici les actions suggérées pour finaliser la refactorisation:',
    ''
  ];

  const simulationReports = reports.filter(r => r.type === 'simulation');
  
  if (simulationReports.length > 0) {
    suggestions.push('## Simulations à remplacer:');
    simulationReports.forEach(report => {
      const relativePath = path.relative(projectRoot, report.file);
      suggestions.push(`- [ ] ${relativePath}:${report.line} - ${report.content}`);
    });
    suggestions.push('');
  }

  const todoReports = reports.filter(r => r.type === 'todo');
  if (todoReports.length > 0) {
    suggestions.push('## TODOs à traiter:');
    todoReports.forEach(report => {
      const relativePath = path.relative(projectRoot, report.file);
      suggestions.push(`- [ ] ${relativePath}:${report.line} - ${report.content}`);
    });
    suggestions.push('');
  }

  suggestions.push('## Services créés:');
  suggestions.push('- [x] Service de notifications OneSignal');
  suggestions.push('- [x] Service d\'export Excel/PDF');
  suggestions.push('- [x] Service de génération d\'exports');
  suggestions.push('');
  
  suggestions.push('## Configuration ajoutée:');
  suggestions.push('- [x] Dépendances exceljs, puppeteer, onesignal-node');
  suggestions.push('- [x] Variables d\'environnement OneSignal');
  suggestions.push('- [x] Configuration des exports');

  const suggestionsPath = path.join(projectRoot, 'refactoring-cleanup.md');
  await fs.writeFile(suggestionsPath, suggestions.join('\n'));
  console.log(`\n📝 Suggestions sauvegardées dans: ${suggestionsPath}`);
}

async function main() {
  console.log('🚀 Démarrage de l\'analyse de refactorisation...');
  
  const srcDir = path.join(projectRoot, 'src');
  const files = await scanDirectory(srcDir);
  
  console.log(`📁 Analyse de ${files.length} fichiers...`);
  
  const allReports: SimulationReport[] = [];
  
  for (const file of files) {
    const reports = await scanFile(file);
    allReports.push(...reports);
  }
  
  await generateReport(allReports);
  await createCleanupSuggestions(allReports);
  
  console.log('\n🏁 Analyse terminée.');
  
  if (allReports.length === 0) {
    console.log('✨ Félicitations ! La refactorisation est complète.');
    process.exit(0);
  } else {
    console.log(`⚠️  ${allReports.length} éléments nécessitent encore attention.`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 