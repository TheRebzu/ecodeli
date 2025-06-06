#!/usr/bin/env tsx
/**
 * Script automatisé pour corriger les chemins d'imports incorrects
 * Détecte et corrige automatiquement les imports déplacés ou incorrects
 */

import fs from 'fs/promises';
import path from 'path';
import { globSync } from 'glob';

// Patterns de regex pour les imports à corriger
const REGEX_PATTERNS = [
  // Import de cn depuis document-utils (export nommé seul)
  {
    pattern: /import\s*{\s*cn\s*}\s*from\s*['"`]@\/utils\/document-utils['"`]/g,
    replacement: "import { cn } from '@/lib/utils/common'"
  },
  // Import de cn avec d'autres exports depuis document-utils (cn en premier)
  {
    pattern: /import\s*{\s*cn\s*,\s*([^}]+)\s*}\s*from\s*['"`]@\/utils\/document-utils['"`]/g,
    replacement: "import { cn } from '@/lib/utils/common';\nimport { $1 } from '@/utils/document-utils'"
  },
  // Import de cn avec d'autres exports depuis document-utils (cn en dernier)
  {
    pattern: /import\s*{\s*([^}]+),\s*cn\s*}\s*from\s*['"`]@\/utils\/document-utils['"`]/g,
    replacement: "import { $1 } from '@/utils/document-utils';\nimport { cn } from '@/lib/utils/common'"
  },
  
  // Import onboarding-context
  {
    pattern: /import\s*{\s*([^}]*)\s*}\s*from\s*['"`]@\/components\/context\/onboarding-context['"`]/g,
    replacement: "import { $1 } from '@/components/shared/onboarding/onboarding-context'"
  },
];

// Mappings simples des imports incorrects vers les corrects
const SIMPLE_MAPPINGS = {
  '@/lib/auth-error': '@/lib/auth/errors',
  '@/hooks/use-auth': '@/hooks/auth/use-auth',
  '@/lib/validation': '@/lib/utils/validation',
  './rating-stars': '@/components/ui/star-rating',
};

interface FixResult {
  file: string;
  changes: number;
  details: string[];
}

/**
 * Crée le contexte onboarding manquant
 */
async function createOnboardingContext(): Promise<void> {
  const contextDir = path.join(process.cwd(), 'src/components/shared/onboarding');
  const contextFile = path.join(contextDir, 'onboarding-context.tsx');

  try {
    // Vérifier si le fichier existe déjà
    await fs.access(contextFile);
    console.log('✓ Le fichier onboarding-context.tsx existe déjà');
    return;
  } catch {
    // Le fichier n'existe pas, le créer
  }

  // Créer le dossier si nécessaire
  await fs.mkdir(contextDir, { recursive: true });

  const contextContent = `'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

// Types pour le contexte onboarding
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingContextType {
  // État du tutoriel
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  
  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeStep: (stepId: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

// Contexte React
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider du contexte
interface OnboardingProviderProps {
  children: ReactNode;
  steps?: OnboardingStep[];
}

export function OnboardingProvider({ children, steps = [] }: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(steps);

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Fin du tutoriel
      setIsActive(false);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeStep = (stepId: string) => {
    setOnboardingSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  };

  const skipOnboarding = () => {
    setIsActive(false);
  };

  const resetOnboarding = () => {
    setIsActive(false);
    setCurrentStep(0);
    setOnboardingSteps(prev =>
      prev.map(step => ({ ...step, completed: false }))
    );
  };

  const value: OnboardingContextType = {
    isActive,
    currentStep,
    steps: onboardingSteps,
    startOnboarding,
    nextStep,
    previousStep,
    completeStep,
    skipOnboarding,
    resetOnboarding,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

// Hook pour utiliser le contexte
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding doit être utilisé dans un OnboardingProvider');
  }
  return context;
};
`;

  await fs.writeFile(contextFile, contextContent);
  console.log('✓ Fichier onboarding-context.tsx créé avec succès');
}

/**
 * Corrige les imports dans un fichier donné
 */
async function fixImportsInFile(filePath: string): Promise<FixResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  let modifiedContent = content;
  let totalChanges = 0;
  const details: string[] = [];

  // Appliquer les corrections avec regex
  for (const { pattern, replacement } of REGEX_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      modifiedContent = modifiedContent.replace(pattern, replacement);
      const changeCount = matches.length;
      totalChanges += changeCount;
      details.push(`Regex: ${changeCount} occurrence(s) corrigée(s) avec pattern`);
    }
  }

  // Appliquer les corrections par remplacement simple
  for (const [oldImport, newImport] of Object.entries(SIMPLE_MAPPINGS)) {
    if (modifiedContent.includes(oldImport)) {
      modifiedContent = modifiedContent.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
      totalChanges++;
      details.push(`Mapping: ${oldImport} → ${newImport}`);
    }
  }

  // Écrire le fichier si des modifications ont été apportées
  if (totalChanges > 0) {
    await fs.writeFile(filePath, modifiedContent);
  }

  return {
    file: filePath,
    changes: totalChanges,
    details,
  };
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔧 Démarrage de la correction automatique des imports...\n');

  try {
    // Créer le contexte onboarding manquant
    await createOnboardingContext();

    // Rechercher tous les fichiers TypeScript/JavaScript dans src/
    const files = globSync('src/**/*.{ts,tsx,js,jsx}', {
      cwd: process.cwd(),
      absolute: true,
    });

    console.log(`📁 ${files.length} fichiers trouvés\n`);

    const results: FixResult[] = [];
    let totalFiles = 0;
    let totalChanges = 0;

    // Traiter chaque fichier
    for (const file of files) {
      const result = await fixImportsInFile(file);
      if (result.changes > 0) {
        results.push(result);
        totalFiles++;
        totalChanges += result.changes;
      }
    }

    // Afficher les résultats
    console.log(`📊 Résultats de la correction:`);
    console.log(`- Fichiers modifiés: ${totalFiles}`);
    console.log(`- Total des corrections: ${totalChanges}\n`);

    if (results.length > 0) {
      console.log('📄 Détails des modifications:');
      for (const result of results) {
        console.log(`\n${result.file}:`);
        for (const detail of result.details) {
          console.log(`  - ${detail}`);
        }
      }
    } else {
      console.log('✅ Aucune correction nécessaire - tous les imports sont déjà corrects');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la correction des imports:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (import.meta.url === `file://${__filename}`) {
  main();
}

export { main as fixImports };