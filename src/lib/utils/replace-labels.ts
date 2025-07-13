import fs from "fs";
import path from "path";
import { ExtractedLabel } from "./extract-labels";

/**
 * Configuration pour le remplacement de labels
 */
export interface ReplaceConfig {
  // Fichier JSON des labels extraits
  labelsFile: string;
  // Pattern de remplacement pour les traductions
  translationFunction: string;
  // Créer des backups avant modification
  createBackups: boolean;
  // Mode dry-run (simulation)
  dryRun: boolean;
  // Namespace par défaut
  defaultNamespace: string;
}

/**
 * Structure d'un remplacement effectué
 */
export interface Replacement {
  file: string;
  line: number;
  column: number;
  original: string;
  replacement: string;
  translationKey: string;
  namespace: string;
}

/**
 * Classe pour remplacer les labels hardcodés
 */
export class LabelReplacer {
  private config: ReplaceConfig;
  private replacements: Replacement[] = [];

  constructor(config: Partial<ReplaceConfig> = {}) {
    this.config = {
      labelsFile: "scripts/i18n/extracted-labels.json",
      translationFunction: "t",
      createBackups: true,
      dryRun: false,
      defaultNamespace: "common",
      ...config,
    };
  }

  /**
   * Charger les labels extraits
   */
  private loadExtractedLabels(): ExtractedLabel[] {
    try {
      const content = fs.readFileSync(this.config.labelsFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Impossible de charger les labels depuis ${this.config.labelsFile}: ${error}`,
      );
    }
  }

  /**
   * Générer le code de remplacement pour une traduction
   */
  private generateReplacementCode(label: ExtractedLabel): string {
    const namespace = label.namespace || this.config.defaultNamespace;
    const key = `${namespace}.${label.suggestedKey}`;

    // Détecter le contexte pour choisir le bon pattern
    if (this.isJSXContext(label.context)) {
      return `{${this.config.translationFunction}('${key}')}`;
    } else if (this.isAttributeContext(label.context)) {
      return `${this.config.translationFunction}('${key}')`;
    } else {
      return `${this.config.translationFunction}('${key}')`;
    }
  }

  /**
   * Vérifier si c'est un contexte JSX
   */
  private isJSXContext(context: string): boolean {
    return /<[^>]*>.*<\/[^>]*>/.test(context) || />\s*[^<]*\s*</.test(context);
  }

  /**
   * Vérifier si c'est un contexte d'attribut
   */
  private isAttributeContext(context: string): boolean {
    return /(?:placeholder|title|alt|aria-label)\s*=/.test(context);
  }

  /**
   * Créer un backup du fichier
   */
  private createBackup(filePath: string): void {
    if (!this.config.createBackups) return;

    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created: ${backupPath}`);
  }

  /**
   * Remplacer les labels dans un fichier
   */
  private async replaceInFile(
    filePath: string,
    labels: ExtractedLabel[],
  ): Promise<void> {
    let content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    let hasChanges = false;

    // Trier les labels par position (de la fin vers le début pour éviter les décalages)
    const sortedLabels = labels
      .filter((label) => label.file === filePath)
      .sort((a, b) => b.line - a.line || b.column - a.column);

    for (const label of sortedLabels) {
      const lineIndex = label.line - 1;
      const line = lines[lineIndex];

      if (line && line.includes(label.text)) {
        const replacement = this.generateReplacementCode(label);

        // Trouver et remplacer le texte exact avec les guillemets
        const patterns = [
          `"${label.text}"`,
          `'${label.text}'`,
          `>${label.text}<`,
        ];

        let replaced = false;
        for (const pattern of patterns) {
          if (line.includes(pattern)) {
            const newLine = line.replace(
              pattern,
              pattern.startsWith(">") ? `>${replacement}<` : replacement,
            );

            if (newLine !== line) {
              lines[lineIndex] = newLine;
              hasChanges = true;
              replaced = true;

              this.replacements.push({
                file: filePath,
                line: label.line,
                column: label.column,
                original: pattern,
                replacement,
                translationKey: label.suggestedKey,
                namespace: label.namespace || this.config.defaultNamespace,
              });

              console.log(
                `${filePath}:${label.line} - "${label.text}" → ${replacement}`,
              );
              break;
            }
          }
        }

        if (!replaced) {
          console.warn(
            `Could not replace "${label.text}" in ${filePath}:${label.line}`,
          );
        }
      }
    }

    if (hasChanges && !this.config.dryRun) {
      this.createBackup(filePath);

      // Ajouter l'import de useTranslations si nécessaire
      const updatedContent = this.ensureTranslationImport(
        lines.join("\n"),
        filePath,
      );
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Updated ${filePath}`);
    }
  }

  /**
   * S'assurer que l'import useTranslations est présent
   */
  private ensureTranslationImport(content: string, filePath: string): string {
    // Vérifier si c'est un fichier React
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")) {
      return content;
    }

    // Vérifier si l'import existe déjà
    if (
      content.includes("useTranslations") ||
      content.includes("import.*next-intl")
    ) {
      return content;
    }

    // Ajouter l'import après les autres imports
    const lines = content.split("\n");
    let importInserted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Trouver la dernière ligne d'import
      if (line.startsWith("import ") && !importInserted) {
        // Chercher la fin des imports
        let j = i;
        while (
          j < lines.length &&
          (lines[j].startsWith("import ") || lines[j].trim() === "")
        ) {
          j++;
        }

        // Insérer l'import
        lines.splice(j, 0, "import { useTranslations } from 'next-intl'");
        importInserted = true;
        break;
      }
    }

    // Si aucun import trouvé, ajouter au début
    if (!importInserted) {
      lines.unshift("import { useTranslations } from 'next-intl'");
    }

    // Ajouter le hook dans le composant si nécessaire
    return this.ensureTranslationHook(lines.join("\n"));
  }

  /**
   * S'assurer que le hook useTranslations est utilisé dans le composant
   */
  private ensureTranslationHook(content: string): string {
    // Vérifier si le hook est déjà utilisé
    if (
      content.includes("useTranslations(") ||
      content.includes("= useTranslations")
    ) {
      return content;
    }

    // Trouver le début du composant et ajouter le hook
    const lines = content.split("\n");
    let hookInserted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Détecter le début d'un composant React
      if (
        line.includes("export default function") ||
        line.includes("export function") ||
        (line.includes("const ") && line.includes("= (") && !hookInserted)
      ) {
        // Chercher l'accolade ouvrante
        let j = i;
        while (j < lines.length && !lines[j].includes("{")) {
          j++;
        }

        if (j < lines.length) {
          // Insérer le hook après l'accolade ouvrante
          lines.splice(
            j + 1,
            0,
            `  const ${this.config.translationFunction} = useTranslations()`,
          );
          hookInserted = true;
          break;
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Mettre à jour les fichiers de traduction
   */
  private async updateTranslationFiles(
    labels: ExtractedLabel[],
  ): Promise<void> {
    const translationsByNamespace = labels.reduce(
      (acc, label) => {
        const namespace = label.namespace || this.config.defaultNamespace;
        if (!acc[namespace]) acc[namespace] = [];
        acc[namespace].push(label);
        return acc;
      },
      {} as Record<string, ExtractedLabel[]>,
    );

    for (const locale of ["fr", "en"]) {
      const filePath = `src/messages/${locale}.json`;

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const translations = JSON.parse(content);

        // Ajouter les nouvelles traductions
        for (const [namespace, namespaceLabels] of Object.entries(
          translationsByNamespace,
        )) {
          if (!translations[namespace]) {
            translations[namespace] = {};
          }

          for (const label of namespaceLabels) {
            if (!translations[namespace][label.suggestedKey]) {
              // Pour le français, utiliser le texte original
              // Pour l'anglais, marquer comme à traduire
              translations[namespace][label.suggestedKey] =
                locale === "fr" ? label.text : `[TO_TRANSLATE] ${label.text}`;
            }
          }
        }

        if (!this.config.dryRun) {
          this.createBackup(filePath);
          fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
          console.log(`Updated ${filePath}`);
        }
      } catch (error) {
        console.error(`Error updating ${filePath}:`, error);
      }
    }
  }

  /**
   * Lancer le remplacement complet
   */
  async replace(): Promise<Replacement[]> {
    console.log("Starting label replacement...");

    if (this.config.dryRun) {
      console.log("DRY RUN MODE - No files will be modified");
    }

    const labels = this.loadExtractedLabels();
    console.log(`Loaded ${labels.length} labels to replace`);

    // Grouper les labels par fichier
    const fileGroups = labels.reduce(
      (acc, label) => {
        if (!acc[label.file]) acc[label.file] = [];
        acc[label.file].push(label);
        return acc;
      },
      {} as Record<string, ExtractedLabel[]>,
    );

    // Remplacer dans chaque fichier
    for (const [filePath, fileLabels] of Object.entries(fileGroups)) {
      try {
        await this.replaceInFile(filePath, fileLabels);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }

    // Mettre à jour les fichiers de traduction
    await this.updateTranslationFiles(labels);

    console.log(`Completed ${this.replacements.length} replacements`);
    return this.replacements;
  }

  /**
   * Générer un rapport de remplacement
   */
  generateReport(): string {
    const reportLines = [
      "# Rapport de remplacement de labels",
      `Date: ${new Date().toISOString()}`,
      `Mode: ${this.config.dryRun ? "DRY RUN" : "PRODUCTION"}`,
      `Total remplacements: ${this.replacements.length}`,
      "",
      "## Remplacements par fichier:",
    ];

    const byFile = this.replacements.reduce(
      (acc, replacement) => {
        if (!acc[replacement.file]) acc[replacement.file] = [];
        acc[replacement.file].push(replacement);
        return acc;
      },
      {} as Record<string, Replacement[]>,
    );

    for (const [file, replacements] of Object.entries(byFile)) {
      reportLines.push(`- ${file}: ${replacements.length} remplacements`);
    }

    reportLines.push("", "## Détails des remplacements:", "");

    for (const replacement of this.replacements) {
      reportLines.push(
        `### ${replacement.file}:${replacement.line}`,
        `**Clé:** ${replacement.namespace}.${replacement.translationKey}`,
        `**Original:** \`${replacement.original}\``,
        `**Remplacement:** \`${replacement.replacement}\``,
        "",
      );
    }

    return reportLines.join("\n");
  }

  /**
   * Sauvegarder le rapport
   */
  async saveReport(): Promise<void> {
    const outputDir = path.dirname(this.config.labelsFile);
    const reportPath = path.join(outputDir, "replacement-report.md");

    fs.writeFileSync(reportPath, this.generateReport());
    console.log(`Report saved to: ${reportPath}`);
  }
}

/**
 * Fonction utilitaire pour lancer le remplacement
 */
export async function replaceLabels(
  config?: Partial<ReplaceConfig>,
): Promise<Replacement[]> {
  const replacer = new LabelReplacer(config);
  const replacements = await replacer.replace();
  await replacer.saveReport();
  return replacements;
}
