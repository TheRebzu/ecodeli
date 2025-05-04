"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const prettier_1 = __importDefault(require("prettier"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const translation_config_js_1 = __importDefault(require("./translation.config.js"));
class AutoTranslator {
    constructor(options) {
        this.translationMap = {};
        this.existingKeys = new Set();
        this.report = {
            totalFiles: 0,
            totalEntries: 0,
            alreadyTranslated: 0,
            topFiles: []
        };
        this.fileStringCounts = new Map();
        this.rootDir = path_1.default.resolve(process.cwd());
        this.messagesDir = path_1.default.join(this.rootDir, 'src', 'messages');
        this.backupDir = path_1.default.join(this.rootDir, 'backup', 'messages', new Date().toISOString().replace(/:/g, '-'));
        this.isDryRun = options.dryRun;
        if (options.backup) {
            this.createBackup();
        }
        // Charger les fichiers de traduction existants
        this.loadExistingTranslations();
    }
    /**
     * Crée une sauvegarde des fichiers de traduction
     */
    createBackup() {
        if (this.isDryRun) {
            console.log(chalk_1.default.yellow('Mode dry-run: skipping backup creation'));
            return;
        }
        if (!fs_1.default.existsSync(this.messagesDir)) {
            console.error(chalk_1.default.red(`Le répertoire des messages n'existe pas: ${this.messagesDir}`));
            return;
        }
        fs_1.default.mkdirSync(this.backupDir, { recursive: true });
        const messageFiles = fs_1.default.readdirSync(this.messagesDir);
        messageFiles.forEach(file => {
            if (file.endsWith('.json')) {
                const source = path_1.default.join(this.messagesDir, file);
                const dest = path_1.default.join(this.backupDir, file);
                fs_1.default.copyFileSync(source, dest);
            }
        });
        console.log(chalk_1.default.green(`Sauvegarde créée dans: ${this.backupDir}`));
    }
    /**
     * Charge les fichiers de traduction existants
     */
    loadExistingTranslations() {
        const allLocales = [translation_config_js_1.default.sourceLang, ...translation_config_js_1.default.targetLangs];
        allLocales.forEach(locale => {
            const filePath = path_1.default.join(this.messagesDir, `${locale}.json`);
            if (fs_1.default.existsSync(filePath)) {
                try {
                    const content = fs_1.default.readFileSync(filePath, 'utf8');
                    this.translationMap[locale] = JSON.parse(content);
                    // Collecter toutes les clés existantes
                    this.collectExistingKeys(this.translationMap[locale]);
                }
                catch (error) {
                    console.error(chalk_1.default.red(`Erreur lors du chargement de ${filePath}:`), error);
                    this.translationMap[locale] = {};
                }
            }
            else {
                console.log(chalk_1.default.yellow(`Fichier ${filePath} non trouvé, création d'un nouveau fichier`));
                this.translationMap[locale] = {};
            }
        });
    }
    /**
     * Collecte toutes les clés de traduction existantes
     */
    collectExistingKeys(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'string') {
                this.existingKeys.add(fullKey);
            }
            else {
                this.collectExistingKeys(value, fullKey);
            }
        }
    }
    /**
     * Analyse tous les fichiers du projet pour trouver les chaînes à traduire
     */
    async analyzeFiles() {
        const entries = [];
        // Motifs d'exclusion pour glob
        const excludePatterns = translation_config_js_1.default.ignorePaths.map((p) => `!${p}/**/*`);
        // Trouver tous les fichiers TypeScript/JavaScript/React
        const files = glob_1.glob.sync([
            'src/**/*.{ts,tsx,js,jsx}',
            ...excludePatterns
        ], { cwd: this.rootDir });
        this.report.totalFiles = files.length;
        for (const file of files) {
            const filePath = path_1.default.join(this.rootDir, file);
            const result = await this.analyzeFile(filePath);
            entries.push(...result.entries);
            this.report.totalEntries += result.totalStrings;
            this.report.alreadyTranslated += result.alreadyTranslated;
            if (result.entries.length > 0) {
                this.fileStringCounts.set(file, result.entries.length);
            }
        }
        // Trier les fichiers par nombre de chaînes à traduire
        this.report.topFiles = [...this.fileStringCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file, count]) => ({ file, count }));
        return entries;
    }
    /**
     * Analyse un fichier pour trouver les chaînes à traduire
     */
    async analyzeFile(filePath) {
        const entries = [];
        let totalStrings = 0;
        let alreadyTranslated = 0;
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            // Vérifier si le fichier utilise déjà les traductions
            const usesTranslation = content.includes('useTranslations') ||
                content.includes('getTranslations');
            // Analyser avec Babel
            const ast = parser.parse(content, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript', 'decorators-legacy'],
                errorRecovery: true
            });
            // Trouver les chaînes qui sont déjà traduites
            if (usesTranslation) {
                (0, traverse_1.default)(ast, {
                    CallExpression(nodePath) {
                        const callee = nodePath.node.callee;
                        // Détecter les appels à t() ou similaires
                        if ((t.isIdentifier(callee) && callee.name === 't') ||
                            (t.isMemberExpression(callee) &&
                                t.isIdentifier(callee.property) &&
                                callee.property.name === 't')) {
                            totalStrings++;
                            alreadyTranslated++;
                        }
                    }
                });
            }
            // Trouver les chaînes de texte à extraire
            (0, traverse_1.default)(ast, {
                StringLiteral(nodePath) {
                    const { node, parent } = nodePath;
                    // Ignorer les chaînes vides ou trop courtes
                    if (node.value.length < translation_config_js_1.default.extraction.minLength ||
                        node.value.length > translation_config_js_1.default.extraction.maxLength) {
                        return;
                    }
                    // Ignorer les chaînes qui matchent les patterns à ignorer
                    if (translation_config_js_1.default.ignorePatterns.some((pattern) => pattern.test(node.value))) {
                        return;
                    }
                    // Ignorer les imports, requires, et autres cas spéciaux
                    if (t.isImportDeclaration(parent) ||
                        (t.isCallExpression(parent) &&
                            t.isIdentifier(parent.callee) &&
                            parent.callee.name === 'require')) {
                        return;
                    }
                    // Pour les JSX, vérifier si c'est un attribut qui nécessite traduction
                    if (t.isJSXAttribute(parent)) {
                        const attrName = parent.name.name;
                        // Ignorer les attributs qui ne nécessitent généralement pas de traduction
                        if (['className', 'id', 'style', 'type', 'name', 'value', 'href', 'src'].includes(attrName)) {
                            return;
                        }
                        // Vérifier les attributs qui sont généralement traduisibles
                        if (['title', 'alt', 'placeholder', 'label', 'aria-label'].includes(attrName)) {
                            totalStrings++;
                        }
                        else {
                            // Ignorer les autres attributs
                            return;
                        }
                    }
                    else {
                        totalStrings++;
                    }
                    // Extraire le contexte
                    const fileRelative = path_1.default.relative(this.rootDir, filePath);
                    const pathParts = fileRelative.split(path_1.default.sep);
                    const componentName = path_1.default.basename(filePath, path_1.default.extname(filePath));
                    // Générer une clé basée sur le chemin et le contenu
                    const moduleName = pathParts[1] || 'common';
                    const subModule = pathParts[2] || '';
                    const featurePrefix = subModule ? `${moduleName}.${subModule}` : moduleName;
                    // Nettoyer le texte pour la clé
                    const cleanedText = node.value
                        .trim()
                        .toLowerCase()
                        .replace(/[^\w\s]/g, '')
                        .replace(/\s+/g, '_')
                        .slice(0, 20);
                    const key = `${featurePrefix}.${componentName}.${cleanedText}`;
                    // Vérifier si cette clé existe déjà
                    if (this.existingKeys.has(key)) {
                        alreadyTranslated++;
                        return;
                    }
                    // Trouver le numéro de ligne dans le fichier source
                    const line = content.substring(0, node.start || 0).split('\n').length;
                    // Contextualiser la chaîne (montrer quelques lignes autour)
                    const lines = content.split('\n');
                    const startLine = Math.max(0, line - 3);
                    const endLine = Math.min(lines.length, line + 2);
                    const context = lines.slice(startLine, endLine).join('\n');
                    entries.push({
                        key,
                        value: node.value,
                        file: fileRelative,
                        line,
                        context
                    });
                },
                JSXText(nodePath) {
                    const { node } = nodePath;
                    const text = node.value.trim();
                    // Ignorer les espaces et textes trop courts
                    if (text.length < translation_config_js_1.default.extraction.minLength ||
                        text.length > translation_config_js_1.default.extraction.maxLength ||
                        !text ||
                        text.match(/^\s+$/)) {
                        return;
                    }
                    // Ignorer selon les patterns configurés
                    if (translation_config_js_1.default.ignorePatterns.some((pattern) => pattern.test(text))) {
                        return;
                    }
                    totalStrings++;
                    // Contexte et clé
                    const fileRelative = path_1.default.relative(this.rootDir, filePath);
                    const pathParts = fileRelative.split(path_1.default.sep);
                    const componentName = path_1.default.basename(filePath, path_1.default.extname(filePath));
                    const moduleName = pathParts[1] || 'common';
                    const subModule = pathParts[2] || '';
                    const featurePrefix = subModule ? `${moduleName}.${subModule}` : moduleName;
                    const cleanedText = text
                        .toLowerCase()
                        .replace(/[^\w\s]/g, '')
                        .replace(/\s+/g, '_')
                        .slice(0, 20);
                    const key = `${featurePrefix}.${componentName}.${cleanedText}`;
                    // Vérifier si cette clé existe déjà
                    if (this.existingKeys.has(key)) {
                        alreadyTranslated++;
                        return;
                    }
                    // Trouver le numéro de ligne
                    const line = content.substring(0, node.start || 0).split('\n').length;
                    // Contexte
                    const lines = content.split('\n');
                    const startLine = Math.max(0, line - 3);
                    const endLine = Math.min(lines.length, line + 2);
                    const context = lines.slice(startLine, endLine).join('\n');
                    entries.push({
                        key,
                        value: text,
                        file: fileRelative,
                        line,
                        context
                    });
                }
            });
        }
        catch (error) {
            console.error(chalk_1.default.red(`Erreur lors de l'analyse de ${filePath}:`), error);
        }
        return {
            entries,
            totalStrings,
            alreadyTranslated
        };
    }
    /**
     * Met à jour les fichiers de traduction avec les nouvelles entrées
     */
    async updateTranslationFiles(entries) {
        if (entries.length === 0) {
            console.log(chalk_1.default.yellow('Aucune nouvelle chaîne à traduire'));
            return;
        }
        // Mettre à jour la langue source
        entries.forEach(entry => {
            this.setNestedValue(this.translationMap[translation_config_js_1.default.sourceLang], entry.key, entry.value);
        });
        // Pour chaque langue cible, ajouter les entrées manquantes
        for (const targetLang of translation_config_js_1.default.targetLangs) {
            if (!this.translationMap[targetLang]) {
                this.translationMap[targetLang] = JSON.parse(JSON.stringify(this.translationMap[translation_config_js_1.default.sourceLang]));
            }
            else {
                entries.forEach(entry => {
                    // Ne pas écraser les traductions existantes
                    if (!this.hasNestedValue(this.translationMap[targetLang], entry.key)) {
                        this.setNestedValue(this.translationMap[targetLang], entry.key, entry.value);
                    }
                });
            }
        }
        // Écrire les fichiers de traduction
        if (!this.isDryRun) {
            for (const locale in this.translationMap) {
                const filePath = path_1.default.join(this.messagesDir, `${locale}.json`);
                const content = JSON.stringify(this.translationMap[locale], null, 2);
                try {
                    fs_1.default.writeFileSync(filePath, content);
                    console.log(chalk_1.default.green(`Fichier mis à jour: ${filePath}`));
                }
                catch (error) {
                    console.error(chalk_1.default.red(`Erreur lors de l'écriture de ${filePath}:`), error);
                }
            }
        }
        else {
            console.log(chalk_1.default.yellow('Mode dry-run: fichiers non modifiés'));
        }
    }
    /**
     * Vérifie si une valeur imbriquée existe dans un objet
     */
    hasNestedValue(obj, key) {
        const parts = key.split('.');
        let current = obj;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                return current.hasOwnProperty(part) && typeof current[part] === 'string';
            }
            if (!current[part] || typeof current[part] !== 'object') {
                return false;
            }
            current = current[part];
        }
        return false;
    }
    /**
     * Définit une valeur imbriquée dans un objet
     */
    setNestedValue(obj, key, value) {
        const parts = key.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }
    /**
     * Remplace les chaînes hardcodées dans les fichiers source
     */
    async replaceInSourceCode(entries) {
        if (this.isDryRun) {
            console.log(chalk_1.default.yellow('Mode dry-run: aucun remplacement effectué'));
            return;
        }
        // Regrouper les entrées par fichier pour optimiser les remplacements
        const entriesByFile = {};
        entries.forEach(entry => {
            if (!entriesByFile[entry.file]) {
                entriesByFile[entry.file] = [];
            }
            entriesByFile[entry.file].push(entry);
        });
        for (const file in entriesByFile) {
            const filePath = path_1.default.join(this.rootDir, file);
            await this.replaceInFile(filePath, entriesByFile[file]);
        }
    }
    /**
     * Remplace les chaînes hardcodées dans un fichier
     */
    async replaceInFile(filePath, entries) {
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            // Analyser avec Babel
            const ast = parser.parse(content, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript', 'decorators-legacy'],
                errorRecovery: true
            });
            // Vérifier si le fichier est un composant client ou serveur
            const isClientComponent = content.includes("'use client'") || content.includes('"use client"');
            // Vérifier si le fichier importe déjà useTranslations/getTranslations
            let hasImportedTranslations = false;
            let translationImportType = '';
            (0, traverse_1.default)(ast, {
                ImportDeclaration(path) {
                    if (path.node.source.value === 'next-intl') {
                        path.node.specifiers.forEach((specifier) => {
                            if (t.isImportSpecifier(specifier) &&
                                t.isIdentifier(specifier.imported) &&
                                specifier.imported.name === 'useTranslations') {
                                hasImportedTranslations = true;
                                translationImportType = 'client';
                            }
                        });
                    }
                    else if (path.node.source.value === 'next-intl/server') {
                        path.node.specifiers.forEach((specifier) => {
                            if (t.isImportSpecifier(specifier) &&
                                t.isIdentifier(specifier.imported) &&
                                specifier.imported.name === 'getTranslations') {
                                hasImportedTranslations = true;
                                translationImportType = 'server';
                            }
                        });
                    }
                }
            });
            // Ajout des imports nécessaires
            let modifiedAst = ast;
            // Regrouper les entrées par module/clé de traduction parent
            const entriesByPrefix = {};
            entries.forEach(entry => {
                const parts = entry.key.split('.');
                // Le préfixe est typiquement le module (ex: common, auth, etc.)
                const prefix = parts[0];
                if (!entriesByPrefix[prefix]) {
                    entriesByPrefix[prefix] = [];
                }
                entriesByPrefix[prefix].push(entry);
            });
            // Préparer les modifications
            const modifications = [];
            // Ajouter l'import si nécessaire
            if (!hasImportedTranslations) {
                const importStatement = isClientComponent
                    ? "import { useTranslations } from 'next-intl';"
                    : "import { getTranslations } from 'next-intl/server';";
                // Trouver la position après les autres imports
                let insertPosition = 0;
                let foundImports = false;
                (0, traverse_1.default)(ast, {
                    Program(path) {
                        const body = path.node.body;
                        for (let i = 0; i < body.length; i++) {
                            if (t.isImportDeclaration(body[i])) {
                                foundImports = true;
                                insertPosition = (body[i].end || 0) + 1;
                            }
                            else if (foundImports) {
                                break;
                            }
                        }
                    }
                });
                modifications.push({
                    start: insertPosition,
                    end: insertPosition,
                    code: '\n' + importStatement + '\n'
                });
            }
            // Ajouter une déclaration de traduction dans le corps de la fonction principale
            let translationDeclaration = '';
            let translationDeclarationPos = 0;
            // Trouver la position pour insérer la déclaration de traduction
            if (Object.keys(entriesByPrefix).length > 0 && !this.isDryRun) {
                // Détecter le composant fonctionnel principal
                let foundComponent = false;
                (0, traverse_1.default)(ast, {
                    FunctionDeclaration(path) {
                        if (!foundComponent && path.node.id && path.node.id.name.match(/[A-Z]/)) {
                            // C'est probablement un composant React
                            foundComponent = true;
                            // Trouver la position après la déclaration des variables locales
                            const body = path.node.body;
                            if (body && body.body && body.body.length > 0) {
                                translationDeclarationPos = (body.body[0].start || 0);
                            }
                        }
                    },
                    ArrowFunctionExpression(path) {
                        if (!foundComponent && path.parent && t.isVariableDeclarator(path.parent)) {
                            const id = path.parent.id;
                            if (t.isIdentifier(id) && id.name.match(/[A-Z]/)) {
                                // C'est probablement un composant React
                                foundComponent = true;
                                // Trouver la position après la déclaration des variables locales
                                const body = path.node.body;
                                if (t.isBlockStatement(body) && body.body && body.body.length > 0) {
                                    translationDeclarationPos = (body.body[0].start || 0);
                                }
                            }
                        }
                    }
                });
                // Si on a trouvé au moins un composant, ajouter la déclaration de traduction
                if (foundComponent) {
                    // Préparer les déclarations pour chaque préfixe
                    for (const prefix in entriesByPrefix) {
                        if (isClientComponent) {
                            translationDeclaration += `const t${prefix.charAt(0).toUpperCase() + prefix.slice(1)} = useTranslations('${prefix}');\n  `;
                        }
                        else {
                            // Pour les composants serveur, on doit utiliser dans async generateMetadata, etc.
                            // Ne pas ajouter de déclaration car elle sera ajoutée à l'intérieur de la fonction async
                        }
                    }
                    if (translationDeclaration) {
                        modifications.push({
                            start: translationDeclarationPos,
                            end: translationDeclarationPos,
                            code: translationDeclaration
                        });
                    }
                }
            }
            // Remplacer les chaînes hardcodées
            entries.forEach(entry => {
                const parts = entry.key.split('.');
                const prefix = parts[0];
                const restKey = parts.slice(1).join('.');
                // Rechercher la chaîne exacte dans le contenu
                const lines = content.split('\n');
                const line = lines[entry.line - 1];
                if (!line)
                    return;
                const exactMatch = line.includes(`"${entry.value}"`)
                    ? `"${entry.value}"`
                    : line.includes(`'${entry.value}'`)
                        ? `'${entry.value}'`
                        : null;
                if (exactMatch) {
                    const lineOffset = content.split('\n').slice(0, entry.line - 1).join('\n').length + 1;
                    const startPos = content.indexOf(exactMatch, lineOffset);
                    if (startPos !== -1) {
                        const translationFunc = isClientComponent
                            ? `t${prefix.charAt(0).toUpperCase() + prefix.slice(1)}('${restKey}')`
                            : `t('${prefix}.${restKey}')`;
                        modifications.push({
                            start: startPos,
                            end: startPos + exactMatch.length,
                            code: `{${translationFunc}}`
                        });
                    }
                }
            });
            // Appliquer les modifications en partant de la fin pour ne pas décaler les positions
            if (modifications.length > 0 && !this.isDryRun) {
                // Trier par position décroissante
                modifications.sort((a, b) => b.start - a.start);
                let modifiedContent = content;
                modifications.forEach(mod => {
                    modifiedContent =
                        modifiedContent.substring(0, mod.start) +
                            mod.code +
                            modifiedContent.substring(mod.end);
                });
                // Formater le code
                try {
                    const prettierConfig = await prettier_1.default.resolveConfig(filePath);
                    const formattedContent = await prettier_1.default.format(modifiedContent, {
                        ...(prettierConfig || {}),
                        parser: 'typescript',
                        filepath: filePath
                    });
                    // Sauvegarder le fichier modifié
                    fs_1.default.writeFileSync(filePath, formattedContent);
                    console.log(chalk_1.default.green(`Fichier mis à jour: ${filePath}`));
                }
                catch (error) {
                    console.warn(chalk_1.default.yellow(`Erreur de formatage pour ${filePath}, sauvegarde sans formatage`), error);
                    // Sauvegarde sans formatage en cas d'erreur
                    fs_1.default.writeFileSync(filePath, modifiedContent);
                }
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`Erreur lors du remplacement dans ${filePath}:`), error);
        }
    }
    /**
     * Génère un rapport de l'analyse
     */
    generateReport() {
        console.log(chalk_1.default.blue('\n========== Rapport d\'analyse de traduction =========='));
        console.log(chalk_1.default.blue(`Fichiers analysés: ${this.report.totalFiles}`));
        console.log(chalk_1.default.blue(`Chaînes trouvées: ${this.report.totalEntries}`));
        console.log(chalk_1.default.blue(`Déjà traduites: ${this.report.alreadyTranslated}`));
        console.log(chalk_1.default.blue(`Nouvelles traductions nécessaires: ${this.report.totalEntries - this.report.alreadyTranslated}`));
        if (this.report.topFiles.length > 0) {
            console.log(chalk_1.default.blue('\nTop fichiers nécessitant des traductions:'));
            this.report.topFiles.forEach(({ file, count }) => {
                console.log(chalk_1.default.blue(`- ${file} (${count} chaînes)`));
            });
        }
        // Générer un rapport JSON
        const reportPath = path_1.default.join(this.rootDir, 'translation-report.json');
        fs_1.default.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
        console.log(chalk_1.default.green(`\nRapport complet généré: ${reportPath}`));
    }
}
// Configuration des commandes CLI
commander_1.program
    .version('1.0.0')
    .description('Outil d\'automatisation des traductions pour Next.js')
    .option('--analyze', 'Analyser uniquement sans modifier les fichiers')
    .option('--extract', 'Extraire les chaînes et mettre à jour les fichiers de traduction')
    .option('--update', 'Mettre à jour le code source avec les références de traduction')
    .option('--all', 'Exécuter tout le processus')
    .option('--check', 'Vérifier l\'état des traductions sans modifier les fichiers')
    .option('--report', 'Générer un rapport détaillé')
    .option('--backup', 'Créer une sauvegarde avant toute modification')
    .option('--dry-run', 'Exécuter sans modifier les fichiers (simulation)');
commander_1.program.parse(process.argv);
const options = commander_1.program.opts();
// Mode dry-run par défaut si aucune option de modification spécifiée
const dryRun = options.dryRun || (!options.extract && !options.update && !options.all);
// Fonction principale
async function main() {
    // Vérifier les dépendances
    try {
        console.log(chalk_1.default.blue('Vérification des dépendances...'));
        (0, child_process_1.execSync)('npx prettier --version', { stdio: 'ignore' });
    }
    catch (error) {
        console.log(chalk_1.default.yellow('Installation des dépendances nécessaires...'));
        (0, child_process_1.execSync)('pnpm add --save-dev prettier @babel/parser @babel/traverse @babel/generator @babel/types glob chalk commander', { stdio: 'inherit' });
    }
    console.log(chalk_1.default.blue('Initialisation du traducteur automatique...'));
    const translator = new AutoTranslator({
        dryRun,
        backup: options.backup || false
    });
    // Analyse des fichiers
    console.log(chalk_1.default.blue('Analyse des fichiers...'));
    const entries = await translator.analyzeFiles();
    if (options.analyze || options.check || options.report) {
        translator.generateReport();
    }
    // Extraction et mise à jour des fichiers de traduction
    if (options.extract || options.all) {
        console.log(chalk_1.default.blue('Mise à jour des fichiers de traduction...'));
        await translator.updateTranslationFiles(entries);
    }
    // Remplacement dans le code source
    if (options.update || options.all) {
        console.log(chalk_1.default.blue('Remplacement des chaînes dans le code source...'));
        await translator.replaceInSourceCode(entries);
    }
    console.log(chalk_1.default.green('\nTraitement terminé!'));
    if (dryRun) {
        console.log(chalk_1.default.yellow('Mode dry-run: aucun fichier n\'a été modifié.'));
        console.log(chalk_1.default.yellow('Pour appliquer les modifications, exécutez à nouveau sans l\'option --dry-run.'));
    }
}
main().catch(error => {
    console.error(chalk_1.default.red('Erreur fatale:'), error);
    process.exit(1);
});
//# sourceMappingURL=auto-translate.js.map