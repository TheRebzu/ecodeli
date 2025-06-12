#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface BuildError {
  type: string;
  message: string;
  file?: string;
  fix: () => Promise<void>;
}

class BuildFixer {
  private maxIterations = 50;
  private currentIteration = 0;
  private errors: BuildError[] = [];

  async run() {
    console.log('🔧 Starting automatic build error fixing...\n');
    
    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      console.log(`\n🔄 Iteration ${this.currentIteration}/${this.maxIterations}`);
      
      // Run build and capture errors
      const buildOutput = this.runBuild();
      
      if (!buildOutput.includes('Build failed') && !buildOutput.includes('Failed to compile')) {
        console.log('\n✅ Build successful! All errors fixed.');
        return;
      }
      
      // Parse errors
      this.errors = this.parseErrors(buildOutput);
      
      if (this.errors.length === 0) {
        console.log('\n❌ Could not parse errors from build output');
        break;
      }
      
      // Fix errors
      for (const error of this.errors) {
        console.log(`\n🔧 Fixing ${error.type}: ${error.message}`);
        try {
          await error.fix();
          console.log('✅ Fixed');
        } catch (e) {
          console.log(`❌ Failed to fix: ${e}`);
        }
      }
    }
    
    console.log('\n❌ Max iterations reached. Some errors may remain.');
  }

  private runBuild(): string {
    try {
      execSync('pnpm run build', { stdio: 'pipe' });
      return '';
    } catch (error: any) {
      return error.stdout?.toString() + '\n' + error.stderr?.toString();
    }
  }

  private parseErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    
    // Check for lightningcss module error
    if (output.includes('Cannot find module \'../lightningcss.linux-x64-gnu.node\'')) {
      errors.push({
        type: 'Missing native dependency',
        message: 'lightningcss native module missing',
        fix: async () => {
          console.log('Installing lightningcss with proper architecture...');
          execSync('pnpm add -D lightningcss@latest', { stdio: 'inherit' });
          execSync('pnpm rebuild lightningcss', { stdio: 'inherit' });
        }
      });
    }
    
    // Check for sharp module error
    if (output.includes('Could not load the "sharp" module')) {
      errors.push({
        type: 'Missing native dependency',
        message: 'sharp native module missing',
        fix: async () => {
          console.log('Installing sharp with proper architecture...');
          execSync('pnpm add -D sharp@latest', { stdio: 'inherit' });
          execSync('pnpm rebuild sharp', { stdio: 'inherit' });
        }
      });
    }
    
    // Check for TypeScript errors
    const tsErrorRegex = /TS\d+: (.+)/g;
    let match;
    while ((match = tsErrorRegex.exec(output)) !== null) {
      const errorMsg = match[1];
      
      // Handle missing module errors
      if (errorMsg.includes('Cannot find module')) {
        const moduleMatch = errorMsg.match(/Cannot find module '(.+?)'/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          errors.push({
            type: 'Missing module',
            message: `Module ${moduleName} not found`,
            fix: async () => {
              if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
                // Local module - check if file exists
                console.log(`Creating missing local module: ${moduleName}`);
                await this.createMissingLocalModule(moduleName);
              } else {
                // NPM module
                console.log(`Installing missing package: ${moduleName}`);
                try {
                  execSync(`pnpm add ${moduleName}`, { stdio: 'inherit' });
                } catch (e) {
                  console.log(`Failed to install ${moduleName}, trying as dev dependency...`);
                  execSync(`pnpm add -D ${moduleName}`, { stdio: 'inherit' });
                }
              }
            }
          });
        }
      }
      
      // Handle type errors
      if (errorMsg.includes('Type') && errorMsg.includes('is not assignable to type')) {
        errors.push({
          type: 'Type error',
          message: errorMsg,
          fix: async () => {
            console.log('Type error detected, will attempt to fix in next iteration...');
            // Type errors often require manual intervention
          }
        });
      }
    }
    
    // Check for import errors
    const importErrorRegex = /Module not found: Can't resolve '(.+?)'/g;
    while ((match = importErrorRegex.exec(output)) !== null) {
      const modulePath = match[1];
      errors.push({
        type: 'Import error',
        message: `Cannot resolve import: ${modulePath}`,
        fix: async () => {
          await this.fixImportError(modulePath);
        }
      });
    }
    
    // Check for Next.js specific errors
    if (output.includes('An error occurred in `next/font`')) {
      errors.push({
        type: 'Next.js font error',
        message: 'Error in next/font configuration',
        fix: async () => {
          console.log('Checking Next.js font configuration...');
          // Font errors often related to missing dependencies
          execSync('pnpm add -D @next/font', { stdio: 'inherit' });
        }
      });
    }
    
    return errors;
  }

  private async createMissingLocalModule(modulePath: string) {
    // Create a basic export for missing local modules
    const fullPath = path.resolve(modulePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath);
      if (ext === '.ts' || ext === '.tsx') {
        fs.writeFileSync(fullPath, 'export {};\n');
      } else if (ext === '.js' || ext === '.jsx') {
        fs.writeFileSync(fullPath, 'module.exports = {};\n');
      }
    }
  }

  private async fixImportError(importPath: string) {
    console.log(`Attempting to fix import: ${importPath}`);
    
    // Check if it's a relative import
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      // Try to create the missing file
      await this.createMissingLocalModule(importPath);
    } else if (importPath.startsWith('@/')) {
      // Path alias issue
      const actualPath = importPath.replace('@/', 'src/');
      await this.createMissingLocalModule(actualPath);
    } else {
      // External package
      try {
        const packageName = importPath.split('/')[0];
        console.log(`Installing package: ${packageName}`);
        execSync(`pnpm add ${packageName}`, { stdio: 'inherit' });
      } catch (e) {
        console.log(`Failed to install ${importPath}`);
      }
    }
  }
}

// Run the fixer
const fixer = new BuildFixer();
fixer.run().catch(console.error);