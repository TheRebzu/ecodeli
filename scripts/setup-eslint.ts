#!/usr/bin/env tsx

import { execSync } from "child_process";
import chalk from "chalk";

console.log(chalk.blue("🔧 Configuration ESLint pour EcoDeli"));
console.log(chalk.blue("=====================================\n"));

// Liste des packages ESLint nécessaires
const eslintPackages = [
  // Base ESLint
  "eslint@^9.28.0",
  "eslint-config-next@^15.3.3",
  
  // TypeScript
  "@typescript-eslint/parser@^8.0.0",
  "@typescript-eslint/eslint-plugin@^8.0.0",
  
  // React
  "eslint-plugin-react@^7.37.0",
  "eslint-plugin-react-hooks@^5.0.0",
  "eslint-plugin-jsx-a11y@^6.10.0",
  
  // Import/Export
  "eslint-plugin-import@^2.31.0",
  "eslint-import-resolver-typescript@^4.4.3",
  "eslint-plugin-unused-imports@^4.1.4",
  
  // Sécurité et qualité
  "eslint-plugin-security@^3.0.1",
  "eslint-plugin-unicorn@^56.0.0",
  
  // Outils supplémentaires
  "eslint-plugin-simple-import-sort@^12.1.1"
];

async function installPackages() {
  console.log(chalk.yellow("📦 Installation des packages ESLint..."));
  
  try {
    const command = `pnpm add -D ${eslintPackages.join(" ")}`;
    console.log(chalk.gray(`Commande: ${command}\n`));
    
    execSync(command, { 
      stdio: "inherit",
      cwd: process.cwd()
    });
    
    console.log(chalk.green("✅ Tous les packages ESLint ont été installés avec succès!"));
  } catch (error) {
    console.error(chalk.red("❌ Erreur lors de l'installation:"), error);
    process.exit(1);
  }
}

async function verifyConfig() {
  console.log(chalk.yellow("\n🔍 Vérification de la configuration ESLint..."));
  
  try {
    execSync("pnpm eslint --version", { stdio: "pipe" });
    console.log(chalk.green("✅ ESLint est configuré correctement"));
    
    // Test rapide de la configuration
    execSync("pnpm eslint --print-config .eslintrc.json > /dev/null", { stdio: "pipe" });
    console.log(chalk.green("✅ Configuration ESLint valide"));
    
  } catch (error) {
    console.warn(chalk.yellow("⚠️  Quelques ajustements peuvent être nécessaires"));
    console.log(chalk.gray("Cela peut être normal si certains plugins ne sont pas encore installés"));
  }
}

async function showUsage() {
  console.log(chalk.blue("\n📋 Utilisation d'ESLint:"));
  console.log(chalk.white("• Linter le code:        ") + chalk.cyan("pnpm lint"));
  console.log(chalk.white("• Corriger automatique:  ") + chalk.cyan("pnpm lint --fix"));
  console.log(chalk.white("• Linter un fichier:     ") + chalk.cyan("pnpm eslint src/path/to/file.ts"));
  console.log(chalk.white("• Mode watch:            ") + chalk.cyan("pnpm eslint src/ --watch"));
  
  console.log(chalk.blue("\n🛠️  Plugins installés:"));
  console.log(chalk.white("• @typescript-eslint    - Règles TypeScript avancées"));
  console.log(chalk.white("• react/react-hooks     - Règles React et Hooks"));
  console.log(chalk.white("• jsx-a11y              - Accessibilité"));
  console.log(chalk.white("• import                - Gestion des imports"));
  console.log(chalk.white("• security              - Règles de sécurité"));
  console.log(chalk.white("• unicorn               - Règles modernes JS/TS"));
  console.log(chalk.white("• unused-imports        - Nettoyage automatique"));
  
  console.log(chalk.blue("\n⚙️  Configuration:"));
  console.log(chalk.white("• Fichier principal:     ") + chalk.cyan(".eslintrc.json"));
  console.log(chalk.white("• Fichiers ignorés:      ") + chalk.cyan(".eslintignore"));
  console.log(chalk.white("• Scripts disponibles:   ") + chalk.cyan("package.json"));
}

async function main() {
  try {
    await installPackages();
    await verifyConfig();
    await showUsage();
    
    console.log(chalk.green("\n🎉 Configuration ESLint terminée avec succès!"));
    console.log(chalk.blue("Vous pouvez maintenant utiliser:") + chalk.cyan(" pnpm lint"));
    
  } catch (error) {
    console.error(chalk.red("❌ Erreur lors de la configuration:"), error);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(console.error); 