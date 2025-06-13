#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes, createHash } from "crypto";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const execAsync = promisify(exec);

interface PagePath {
  route: string;
  filesystem: string;
  isDynamic: boolean;
  requiredRole?: UserRole;
  isProtected: boolean;
  isPublic: boolean;
  isAuth: boolean;
}

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  sessionToken: string;
}

interface TestResult {
  route: string;
  status: number;
  role?: UserRole;
  error?: string;
  responseTime: number;
  pageContent?: string;
  pageErrors?: string[];
  hasJavaScriptError?: boolean;
  hasRenderError?: boolean;
  errorDetails?: {
    type: string;
    message: string;
    details?: string;
  }[];
}

/**
 * Classe principale pour extraire et tester les pages
 */
class PagesChecker {
  private baseUrl: string;
  private appDir: string;
  private jwtSecret: string;
  private prisma: PrismaClient;
  private testUsers: TestUser[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    this.appDir = path.join(process.cwd(), "src/app/[locale]");
    this.jwtSecret = process.env.NEXTAUTH_SECRET || "fallback-secret";
    this.prisma = new PrismaClient();
  }

  /**
   * Initialise les utilisateurs de test depuis la base de données
   */
  async initializeTestUsers(): Promise<void> {
    console.log("🔐 Extraction des utilisateurs de test depuis les seeds...");

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: "admin" } },
          { email: { contains: "client" } },
          { email: { contains: "deliverer" } },
          { email: { contains: "merchant" } },
          { email: { contains: "provider" } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
      take: 50, // Prendre plus d'utilisateurs pour couvrir tous les rôles
    });

    // Créer les tokens de session pour chaque utilisateur
    for (const user of users) {
      // Générer un token de session simple (pour les tests uniquement)
      const payload = `${user.id}-${user.email}-${Date.now()}`;
      const sessionToken = createHash("sha256")
        .update(payload + this.jwtSecret)
        .digest("hex");

      this.testUsers.push({
        ...user,
        sessionToken,
      });
    }

    // Organiser les utilisateurs par rôle pour un meilleur reporting
    const usersByRole = this.testUsers.reduce(
      (acc, user) => {
        if (!acc[user.role]) acc[user.role] = [];
        acc[user.role].push(user);
        return acc;
      },
      {} as Record<UserRole, TestUser[]>,
    );

    console.log(
      `✅ ${this.testUsers.length} utilisateurs de test initialisés:`,
    );
    Object.entries(usersByRole).forEach(([role, users]) => {
      console.log(`   - ${role}: ${users.length} utilisateur(s)`);
      users.forEach((user) => {
        console.log(`     • ${user.email} (${user.status})`);
      });
    });
  }

  /**
   * Extrait tous les chemins des pages depuis la structure du projet
   */
  extractPagePaths(): PagePath[] {
    const pages: PagePath[] = [];

    const scanDirectory = (
      currentPath: string,
      routePrefix: string = "",
    ): void => {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        const relativePath = path.relative(this.appDir, fullPath);

        if (item.isDirectory()) {
          // Gestion des groupes de routes et paramètres dynamiques
          let newRoutePrefix = routePrefix;

          if (item.name.startsWith("(") && item.name.endsWith(")")) {
            // Groupe de routes - ne change pas l'URL
            newRoutePrefix = routePrefix;
          } else if (item.name.startsWith("[") && item.name.endsWith("]")) {
            // Paramètre dynamique
            if (item.name === "[locale]") {
              newRoutePrefix = routePrefix + "/fr"; // Locale par défaut
            } else {
              newRoutePrefix =
                routePrefix + "/[" + item.name.slice(1, -1) + "]";
            }
          } else if (item.name.startsWith("[...") && item.name.endsWith("]")) {
            // Catch-all route
            newRoutePrefix =
              routePrefix + "/[..." + item.name.slice(4, -1) + "]";
          } else {
            newRoutePrefix = routePrefix + "/" + item.name;
          }

          scanDirectory(fullPath, newRoutePrefix);
        } else if (item.name === "page.tsx" || item.name === "page.ts") {
          // C'est une page
          const route = routePrefix || "/";
          const isDynamic = route.includes("[") && route.includes("]");

          // Déterminer le type de protection
          let isProtected = false;
          let isAuth = false;
          let isPublic = false;
          let requiredRole: UserRole | undefined;

          if (relativePath.includes("(protected)")) {
            isProtected = true;
            // Analyser le rôle requis depuis le chemin
            if (relativePath.includes("/admin/")) requiredRole = UserRole.ADMIN;
            else if (relativePath.includes("/client/"))
              requiredRole = UserRole.CLIENT;
            else if (relativePath.includes("/deliverer/"))
              requiredRole = UserRole.DELIVERER;
            else if (relativePath.includes("/merchant/"))
              requiredRole = UserRole.MERCHANT;
            else if (relativePath.includes("/provider/"))
              requiredRole = UserRole.PROVIDER;
          } else if (relativePath.includes("(auth)")) {
            isAuth = true;
          } else if (relativePath.includes("(public)")) {
            isPublic = true;
          }

          pages.push({
            route,
            filesystem: relativePath,
            isDynamic,
            requiredRole,
            isProtected,
            isPublic,
            isAuth,
          });
        }
      }
    };

    scanDirectory(this.appDir);
    return pages.sort((a, b) => a.route.localeCompare(b.route));
  }

  /**
   * Génère des URLs de test pour les routes dynamiques
   */
  generateTestUrls(page: PagePath): string[] {
    if (!page.isDynamic) {
      return [page.route];
    }

    let urls: string[] = [];
    let route = page.route;

    // Remplacer les paramètres dynamiques par des valeurs de test complètes
    const dynamicParams = [
      {
        pattern: /\[id\]/g,
        values: ["1", "2", "3", "test-id", "123", "abc-123"],
      },
      {
        pattern: /\[slug\]/g,
        values: ["test-slug", "example", "demo", "article-1"],
      },
      { pattern: /\[userId\]/g, values: ["1", "2", "3", "user-123"] },
      { pattern: /\[topic\]/g, values: ["help", "faq", "guide", "tutorial"] },
      {
        pattern: /\[\.\.\.rest\]/g,
        values: ["test", "help/topic", "admin/settings", "deep/nested/path"],
      },
    ];

    // Générer toutes les combinaisons de paramètres dynamiques
    let currentRoutes = [route];

    for (const param of dynamicParams) {
      const newRoutes: string[] = [];

      for (const currentRoute of currentRoutes) {
        if (param.pattern.test(currentRoute)) {
          // Remplacer ce paramètre par toutes ses valeurs possibles
          for (const value of param.values) {
            const testUrl = currentRoute.replace(param.pattern, value);
            newRoutes.push(testUrl);
          }
        } else {
          // Garder la route sans modification
          newRoutes.push(currentRoute);
        }
      }

      currentRoutes = newRoutes;
    }

    urls = currentRoutes.filter((url) => url !== route); // Exclure la route originale

    return urls.length > 0 ? urls : [route]; // Tester toutes les variations d'URL
  }

  /**
   * Teste une URL avec curl et analyse les erreurs de page
   */
  async testUrl(url: string, user?: TestUser): Promise<TestResult> {
    const startTime = Date.now();
    const fullUrl = `${this.baseUrl}${url}`;

    try {
      // Commande curl pour récupérer à la fois le code de statut et le contenu
      let curlCommand = `curl -s -w "CURL_STATUS:%{http_code}" "${fullUrl}"`;

      if (user) {
        const cookies = `next-auth.session-token=${user.sessionToken}; next-auth.csrf-token=csrf-token-value`;
        curlCommand = `curl -s -w "CURL_STATUS:%{http_code}" -H "Cookie: ${cookies}" "${fullUrl}"`;
      }

      const { stdout } = await execAsync(curlCommand);
      const responseTime = Date.now() - startTime;

      // Séparer le contenu du code de statut
      const parts = stdout.split("CURL_STATUS:");
      const pageContent = parts[0] || "";
      const statusString = parts[1] || "0";
      const status = parseInt(statusString.trim());

      // Analyser les erreurs dans le contenu de la page
      const errorAnalysis = this.analyzePageErrors(pageContent, status);

      return {
        route: url,
        status,
        role: user?.role,
        responseTime,
        pageContent: pageContent.substring(0, 1000), // Limiter à 1000 caractères pour éviter des logs trop longs
        ...errorAnalysis,
      };
    } catch (error) {
      return {
        route: url,
        status: 0,
        role: user?.role,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
        errorDetails: [
          {
            type: "CURL_ERROR",
            message:
              error instanceof Error ? error.message : "Unknown curl error",
          },
        ],
      };
    }
  }

  /**
   * Nettoie les codes ANSI du texte
   */
  private cleanAnsiCodes(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text
      .replace(/\x1b\[[0-9;]*m/g, "")
      .replace(/\[39m|\[32m|\[31m|\[90m|\[36m|\[33m|\[22m|\[1m/g, "");
  }

  /**
   * Extrait les erreurs de build/compilation détaillées
   */
  private extractBuildErrors(
    content: string,
  ): { type: string; message: string; details?: string }[] {
    const buildErrors: { type: string; message: string; details?: string }[] =
      [];

    // Chercher les erreurs d'export/import
    const exportErrorRegex = /Error: \.\/src\/.*?\n[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const exportMatches = content.match(exportErrorRegex);

    if (exportMatches) {
      exportMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        const lines = cleanMatch.split("\n");
        const errorFile =
          lines[0].match(/Error: (\.\/src\/.*?):/)?.[1] || "Unknown file";
        const errorMessage =
          lines.find(
            (line) => line.includes("Export") || line.includes("doesn't exist"),
          ) || lines[0];

        buildErrors.push({
          type: "IMPORT_ERROR",
          message: `${errorFile}: ${errorMessage.trim()}`,
          details: cleanMatch,
        });
      });
    }

    // Chercher les erreurs de module non trouvé
    const moduleErrorRegex = /Module not found[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const moduleMatches = content.match(moduleErrorRegex);

    if (moduleMatches) {
      moduleMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        buildErrors.push({
          type: "MODULE_NOT_FOUND",
          message: cleanMatch.split("\n")[0],
          details: cleanMatch,
        });
      });
    }

    // Chercher les erreurs de syntaxe
    const syntaxErrorRegex = /SyntaxError[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const syntaxMatches = content.match(syntaxErrorRegex);

    if (syntaxMatches) {
      syntaxMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        buildErrors.push({
          type: "SYNTAX_ERROR",
          message: cleanMatch.split("\n")[0],
          details: cleanMatch,
        });
      });
    }

    // Chercher les erreurs de TypeScript
    const tsErrorRegex = /Type error[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const tsMatches = content.match(tsErrorRegex);

    if (tsMatches) {
      tsMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        buildErrors.push({
          type: "TYPESCRIPT_ERROR",
          message: cleanMatch.split("\n")[0],
          details: cleanMatch,
        });
      });
    }

    // Chercher les erreurs Next.js de compilation
    const nextBuildErrorRegex = /Failed to compile[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const nextBuildMatches = content.match(nextBuildErrorRegex);

    if (nextBuildMatches) {
      nextBuildMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        buildErrors.push({
          type: "NEXT_BUILD_ERROR",
          message: "Failed to compile",
          details: cleanMatch,
        });
      });
    }

    // Chercher les erreurs de hook React
    const hookErrorRegex = /Invalid hook call[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const hookMatches = content.match(hookErrorRegex);

    if (hookMatches) {
      hookMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        buildErrors.push({
          type: "REACT_HOOK_ERROR",
          message: cleanMatch.split("\n")[0],
          details: cleanMatch,
        });
      });
    }

    // Chercher les erreurs de hydratation
    const hydrationErrorRegex = /Hydration failed[\s\S]*?(?=\n\n|\n[A-Z]|$)/g;
    const hydrationMatches = content.match(hydrationErrorRegex);

    if (hydrationMatches) {
      hydrationMatches.forEach((match) => {
        const cleanMatch = this.cleanAnsiCodes(match);
        buildErrors.push({
          type: "HYDRATION_ERROR",
          message: "Hydration failed",
          details: cleanMatch,
        });
      });
    }

    return buildErrors;
  }

  /**
   * Analyse le contenu d'une page pour détecter les erreurs
   */
  private analyzePageErrors(
    content: string,
    status: number,
  ): {
    pageErrors?: string[];
    hasJavaScriptError?: boolean;
    hasRenderError?: boolean;
    errorDetails?: { type: string; message: string; details?: string }[];
  } {
    const errors: string[] = [];
    const errorDetails: { type: string; message: string; details?: string }[] =
      [];
    let hasJavaScriptError = false;
    let hasRenderError = false;

    if (!content || content.trim().length === 0) {
      if (status === 200) {
        errors.push("Page vide avec statut 200");
        errorDetails.push({
          type: "EMPTY_RESPONSE",
          message: "La page renvoie un contenu vide malgré un statut 200",
        });
      }
      return { pageErrors: errors, errorDetails };
    }

    // PRIORITÉ 1: Extraire les erreurs de build/compilation détaillées
    const buildErrors = this.extractBuildErrors(content);
    if (buildErrors.length > 0) {
      hasRenderError = true;
      buildErrors.forEach((buildError) => {
        errors.push(buildError.message);
        errorDetails.push(buildError);
      });
    }

    // Détecter les erreurs JavaScript courantes
    const jsErrorPatterns = [
      /ReferenceError|TypeError|SyntaxError|Error:/gi,
      /Uncaught.*Error/gi,
      /console\.error/gi,
      /\berror\b.*\bstack\b/gi,
    ];

    jsErrorPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        hasJavaScriptError = true;
        matches.forEach((match) => {
          errors.push(`Erreur JavaScript: ${match}`);
          errorDetails.push({
            type: "JAVASCRIPT_ERROR",
            message: match,
            details: "Erreur JavaScript détectée dans le contenu de la page",
          });
        });
      }
    });

    // Détecter les erreurs Next.js
    const nextErrorPatterns = [
      /Application error: a client-side exception has occurred/gi,
      /Error: .* is not defined/gi,
      /ChunkLoadError/gi,
      /Loading chunk \d+ failed/gi,
      /Failed to fetch dynamically imported module/gi,
      /__NEXT_DATA__.*"hasError":true/gi,
    ];

    nextErrorPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        hasRenderError = true;
        matches.forEach((match) => {
          errors.push(`Erreur Next.js: ${match}`);
          errorDetails.push({
            type: "NEXTJS_ERROR",
            message: match,
            details: "Erreur de rendu Next.js détectée",
          });
        });
      }
    });

    // Détecter les erreurs de build
    const buildErrorPatterns = [
      /Module not found/gi,
      /Can't resolve/gi,
      /Failed to compile/gi,
      /Syntax error:/gi,
    ];

    buildErrorPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        hasRenderError = true;
        matches.forEach((match) => {
          errors.push(`Erreur de build: ${match}`);
          errorDetails.push({
            type: "BUILD_ERROR",
            message: match,
            details: "Erreur de compilation ou de build détectée",
          });
        });
      }
    });

    // Détecter les erreurs de base de données/API
    const dbErrorPatterns = [
      /PrismaClientKnownRequestError/gi,
      /Database connection error/gi,
      /ECONNREFUSED/gi,
      /Internal Server Error/gi,
      /500 Internal Server Error/gi,
      /tRPC.*error/gi,
    ];

    dbErrorPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          errors.push(`Erreur serveur/DB: ${match}`);
          errorDetails.push({
            type: "SERVER_ERROR",
            message: match,
            details: "Erreur de serveur ou de base de données détectée",
          });
        });
      }
    });

    // Détecter les erreurs d'authentification
    const authErrorPatterns = [
      /Authentication required/gi,
      /Access denied/gi,
      /Unauthorized/gi,
      /Invalid session/gi,
      /Login required/gi,
    ];

    authErrorPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          errors.push(`Erreur d'auth: ${match}`);
          errorDetails.push({
            type: "AUTH_ERROR",
            message: match,
            details: "Erreur d'authentification détectée",
          });
        });
      }
    });

    // Détecter les pages d'erreur HTML
    if (content.includes("<title>")) {
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        const title = titleMatch[1];
        if (
          title.includes("Error") ||
          title.includes("404") ||
          title.includes("500") ||
          title.includes("Not Found")
        ) {
          errors.push(`Page d'erreur détectée: ${title}`);
          errorDetails.push({
            type: "ERROR_PAGE",
            message: title,
            details: "Page d'erreur HTML détectée via le titre",
          });
        }
      }
    }

    // Détecter les erreurs dans le contenu visible
    const contentErrorPatterns = [
      /Something went wrong/gi,
      /An error occurred/gi,
      /Page not found/gi,
      /Access forbidden/gi,
      /Session expired/gi,
    ];

    contentErrorPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          errors.push(`Erreur de contenu: ${match}`);
          errorDetails.push({
            type: "CONTENT_ERROR",
            message: match,
            details: "Message d'erreur détecté dans le contenu visible",
          });
        });
      }
    });

    return {
      pageErrors: errors.length > 0 ? errors : undefined,
      hasJavaScriptError,
      hasRenderError,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    };
  }

  /**
   * Teste toutes les pages extraites avec options de filtrage
   */
  async testAllPages(
    options: {
      filterType?: "protected" | "public" | "auth" | "all";
      filterRole?: UserRole;
      maxPagesPerType?: number;
      errorsOnly?: boolean;
    } = {},
  ): Promise<void> {
    console.log("\n📄 Extraction des pages...");
    let pages = this.extractPagePaths();

    // Appliquer les filtres si spécifiés
    if (options.filterType && options.filterType !== "all") {
      const originalCount = pages.length;
      pages = pages.filter((page) => {
        switch (options.filterType) {
          case "protected":
            return page.isProtected;
          case "public":
            return page.isPublic;
          case "auth":
            return page.isAuth;
          default:
            return true;
        }
      });
      console.log(
        `🔍 Filtre par type "${options.filterType}": ${pages.length}/${originalCount} pages`,
      );
    }

    if (options.filterRole) {
      const originalCount = pages.length;
      pages = pages.filter((page) => page.requiredRole === options.filterRole);
      console.log(
        `🔍 Filtre par rôle "${options.filterRole}": ${pages.length}/${originalCount} pages`,
      );
    }

    if (options.maxPagesPerType) {
      const originalCount = pages.length;
      pages = pages.slice(0, options.maxPagesPerType);
      console.log(
        `🔍 Limite à ${options.maxPagesPerType} pages: ${pages.length}/${originalCount} pages`,
      );
    }

    console.log(`\n📊 Résumé des pages trouvées:`);
    console.log(`   - Total: ${pages.length}`);
    console.log(`   - Protégées: ${pages.filter((p) => p.isProtected).length}`);
    console.log(`   - Publiques: ${pages.filter((p) => p.isPublic).length}`);
    console.log(`   - Auth: ${pages.filter((p) => p.isAuth).length}`);
    console.log(`   - Dynamiques: ${pages.filter((p) => p.isDynamic).length}`);

    // Sauvegarder la liste des pages
    const pagesListPath = path.join(process.cwd(), "pages-list.json");
    fs.writeFileSync(pagesListPath, JSON.stringify(pages, null, 2));
    console.log(`\n📝 Liste des pages sauvegardée dans: ${pagesListPath}`);

    console.log("\n🧪 Test des pages...");
    const results: TestResult[] = [];
    let pageCount = 0;
    let totalTests = 0;

    // Calculer le nombre total de tests
    for (const page of pages) {
      const testUrls = this.generateTestUrls(page);
      for (const url of testUrls) {
        if (page.isPublic || page.isAuth) {
          totalTests += 1;
        } else if (page.isProtected) {
          const relevantUsers = page.requiredRole
            ? this.testUsers.filter((u) => u.role === page.requiredRole)
            : this.testUsers;
          totalTests += relevantUsers.length > 0 ? relevantUsers.length : 1;
        } else {
          totalTests += 1;
        }
      }
    }

    console.log(`📊 Nombre total de tests à effectuer: ${totalTests}`);

    for (const page of pages) {
      const testUrls = this.generateTestUrls(page);
      pageCount++;

      console.log(
        `\n[${pageCount}/${pages.length}] 🔍 Page: ${page.filesystem}`,
      );
      console.log(
        `   Type: ${page.isProtected ? "🔒 Protégée" : page.isPublic ? "🌐 Publique" : "🔑 Auth"} ${page.requiredRole ? `(${page.requiredRole})` : ""}`,
      );
      console.log(`   URLs à tester: ${testUrls.length}`);

      for (const url of testUrls) {
        let testCount = 0;

        if (page.isPublic || page.isAuth) {
          // Test sans authentification
          const result = await this.testUrl(url);
          results.push(result);
          testCount++;
          const errorInfo = this.formatErrorInfo(result);

          if (options.errorsOnly) {
            if (result.errorDetails && result.errorDetails.length > 0) {
              console.log(`     ❌ ${result.status} - ${url} - sans auth`);
              this.displayDetailedErrors(result);
            }
          } else {
            console.log(
              `     ✓ ${result.status} (${result.responseTime}ms) - sans auth${errorInfo}`,
            );
          }
        } else if (page.isProtected) {
          // Test avec les utilisateurs appropriés
          const relevantUsers = page.requiredRole
            ? this.testUsers.filter((u) => u.role === page.requiredRole)
            : this.testUsers;

          if (relevantUsers.length === 0) {
            // Test sans auth pour voir l'erreur
            const result = await this.testUrl(url);
            results.push(result);
            testCount++;
            const errorInfo = this.formatErrorInfo(result);
            console.log(
              `     ✓ ${result.status} (${result.responseTime}ms) - sans auth${errorInfo}`,
            );
          } else {
            console.log(
              `     → Test avec ${relevantUsers.length} utilisateur(s):`,
            );
            for (const user of relevantUsers) {
              // Tester avec tous les utilisateurs pertinents
              const result = await this.testUrl(url, user);
              results.push(result);
              testCount++;
              const statusIcon =
                result.status === 200
                  ? "✅"
                  : result.status >= 400
                    ? "❌"
                    : "⚠️";
              const errorInfo = this.formatErrorInfo(result);
              console.log(
                `       ${statusIcon} ${result.status} (${result.responseTime}ms) - ${user.role}${errorInfo}`,
              );
            }
          }
        } else {
          // Test par défaut
          const result = await this.testUrl(url);
          results.push(result);
          testCount++;
          const errorInfo = this.formatErrorInfo(result);
          console.log(
            `     ✓ ${result.status} (${result.responseTime}ms) - défaut${errorInfo}`,
          );
        }

        console.log(`     📊 ${testCount} test(s) effectué(s) pour ${url}`);
      }
    }

    // Analyser les résultats
    this.analyzeResults(results);

    // Sauvegarder les résultats globaux
    const resultsPath = path.join(process.cwd(), "pages-test-results.json");
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📊 Résultats sauvegardés dans: ${resultsPath}`);

    // Sauvegarder les résultats séparés par type
    this.saveResultsBySeparateFiles(results, pages);
  }

  /**
   * Formate les informations d'erreur pour l'affichage
   */
  private formatErrorInfo(result: TestResult): string {
    let errorInfo = "";

    if (result.errorDetails && result.errorDetails.length > 0) {
      const errorCount = result.errorDetails.length;
      const errorTypes = [...new Set(result.errorDetails.map((e) => e.type))];
      errorInfo = ` 🚨 ${errorCount} erreur(s) [${errorTypes.join(", ")}]`;
    } else if (result.pageErrors && result.pageErrors.length > 0) {
      errorInfo = ` ⚠️ ${result.pageErrors.length} problème(s)`;
    }

    return errorInfo;
  }

  /**
   * Affiche les erreurs détaillées pour un résultat de test
   */
  private displayDetailedErrors(result: TestResult): void {
    if (result.errorDetails && result.errorDetails.length > 0) {
      result.errorDetails.forEach((detail) => {
        console.log(`       🚫 ${detail.type}: ${detail.message}`);
        if (detail.details) {
          const lines = detail.details.split("\n").slice(0, 6);
          lines.forEach((line) => {
            if (line.trim()) {
              console.log(`          ${line.trim()}`);
            }
          });
          if (detail.details.split("\n").length > 6) {
            console.log(
              `          ... (détails complets dans pages-test-results.json)`,
            );
          }
        }
      });
    }
  }

  /**
   * Sauvegarde les résultats dans des fichiers séparés par type de compte et page
   */
  private saveResultsBySeparateFiles(
    results: TestResult[],
    pages: PagePath[],
  ): void {
    console.log("\n📁 Création des fichiers séparés par type...");

    // Créer le dossier de résultats s'il n'existe pas
    const resultsDir = path.join(process.cwd(), "pages-results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }

    // Grouper par type de page
    const resultsByType: Record<string, TestResult[]> = {
      public: [],
      auth: [],
      admin: [],
      client: [],
      deliverer: [],
      merchant: [],
      provider: [],
      "protected-other": [], // Pages protégées sans rôle spécifique
      unknown: [], // Pages sans type identifié
    };

    // Associer chaque résultat à son type
    results.forEach((result) => {
      // Trouver la page correspondante
      const correspondingPage = pages.find((page) => {
        const pageUrls = this.generateTestUrls(page);
        return pageUrls.includes(result.route) || page.route === result.route;
      });

      if (!correspondingPage) {
        resultsByType["unknown"].push(result);
        return;
      }

      if (correspondingPage.isPublic) {
        resultsByType["public"].push(result);
      } else if (correspondingPage.isAuth) {
        resultsByType["auth"].push(result);
      } else if (correspondingPage.isProtected) {
        if (correspondingPage.requiredRole) {
          const roleKey = correspondingPage.requiredRole.toLowerCase();
          if (resultsByType[roleKey]) {
            resultsByType[roleKey].push(result);
          } else {
            resultsByType["protected-other"].push(result);
          }
        } else {
          resultsByType["protected-other"].push(result);
        }
      } else {
        resultsByType["unknown"].push(result);
      }
    });

    // Sauvegarder chaque type dans un fichier séparé
    Object.entries(resultsByType).forEach(([type, typeResults]) => {
      if (typeResults.length > 0) {
        // Statistiques pour ce type
        const stats = this.generateStatsForType(type, typeResults);

        // Erreurs pour ce type
        const errorsOnly = typeResults.filter(
          (r) => r.errorDetails && r.errorDetails.length > 0,
        );

        const fileData = {
          type: type,
          timestamp: new Date().toISOString(),
          total_pages: typeResults.length,
          stats,
          errors: {
            count: errorsOnly.length,
            list: errorsOnly,
          },
          all_results: typeResults,
        };

        const fileName = `${type}-results.json`;
        const filePath = path.join(resultsDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));

        console.log(
          `   📄 ${type.toUpperCase()}: ${typeResults.length} page(s), ${errorsOnly.length} erreur(s) → ${fileName}`,
        );
      }
    });

    // Créer un fichier de résumé
    this.createSummaryFile(resultsByType, resultsDir);

    console.log(`\n✅ Fichiers créés dans le dossier: ${resultsDir}`);
  }

  /**
   * Génère les statistiques pour un type de page
   */
  private generateStatsForType(type: string, results: TestResult[]): any {
    const statusCounts = results.reduce(
      (acc, result) => {
        const status = result.status.toString();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const errorTypes = results
      .filter((r) => r.errorDetails && r.errorDetails.length > 0)
      .flatMap((r) => r.errorDetails!.map((e) => e.type))
      .reduce(
        (acc, errorType) => {
          acc[errorType] = (acc[errorType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    const averageResponseTime =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + r.responseTime, 0) /
              results.length,
          )
        : 0;

    return {
      total_tests: results.length,
      status_codes: statusCounts,
      error_types: errorTypes,
      average_response_time_ms: averageResponseTime,
      errors_count: Object.values(errorTypes).reduce(
        (sum, count) => sum + count,
        0,
      ),
    };
  }

  /**
   * Crée un fichier de résumé général
   */
  private createSummaryFile(
    resultsByType: Record<string, any[]>,
    resultsDir: string,
  ): void {
    const summary = {
      timestamp: new Date().toISOString(),
      total_types: Object.keys(resultsByType).filter(
        (type) => resultsByType[type].length > 0,
      ).length,
      types_overview: {} as Record<string, any>,
      critical_errors: [] as any[],
      recommendations: [] as string[],
    };

    // Vue d'ensemble par type
    Object.entries(resultsByType).forEach(([type, results]) => {
      if (results.length > 0) {
        const errorsCount = results.filter(
          (r) => r.errorDetails && r.errorDetails.length > 0,
        ).length;
        const criticalErrors = results.filter(
          (r) => r.status >= 500 || r.status === 0,
        ).length;

        summary.types_overview[type] = {
          total_pages: results.length,
          errors: errorsCount,
          critical_errors: criticalErrors,
          success_rate: Math.round(
            ((results.length - errorsCount) / results.length) * 100,
          ),
        };

        // Collecter les erreurs critiques
        results
          .filter((r) => r.status >= 500 || r.status === 0)
          .forEach((r) => {
            summary.critical_errors.push({
              type,
              route: r.route,
              status: r.status,
              role: r.role,
              errors: r.errorDetails?.map((e) => e.message).slice(0, 2), // Première 2 erreurs
            });
          });
      }
    });

    // Recommandations
    if (summary.critical_errors.length > 0) {
      summary.recommendations.push(
        `🚨 ${summary.critical_errors.length} erreur(s) critique(s) à corriger en priorité`,
      );
    }

    const buildErrors = Object.values(resultsByType)
      .flat()
      .filter((r) =>
        r.errorDetails?.some((e) =>
          [
            "IMPORT_ERROR",
            "MODULE_NOT_FOUND",
            "SYNTAX_ERROR",
            "TYPESCRIPT_ERROR",
          ].includes(e.type),
        ),
      ).length;

    if (buildErrors > 0) {
      summary.recommendations.push(
        `🔧 ${buildErrors} erreur(s) de build/compilation à corriger`,
      );
    }

    summary.recommendations.push(
      "📊 Voir les fichiers *-results.json pour les détails par type",
    );
    summary.recommendations.push(
      "🔍 Utiliser --errors-only pour voir seulement les erreurs lors des tests",
    );

    const summaryPath = path.join(resultsDir, "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(
      `   📋 RÉSUMÉ: ${Object.keys(summary.types_overview).length} type(s), ${summary.critical_errors.length} erreur(s) critique(s) → summary.json`,
    );
  }

  /**
   * Analyse et affiche les résultats des tests
   */
  private analyzeResults(results: TestResult[]): void {
    console.log("\n📊 ANALYSE DES RÉSULTATS");
    console.log("========================");

    const statusCounts = results.reduce(
      (acc, result) => {
        const status = result.status.toString();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("\n📈 Répartition des codes de statut:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      const statusName = this.getStatusName(parseInt(status));
      console.log(`   ${status} (${statusName}): ${count}`);
    });

    // Erreurs critiques avec détails
    const errors = results.filter((r) => r.status >= 500 || r.status === 0);
    if (errors.length > 0) {
      console.log("\n🚨 ERREURS CRITIQUES:");
      errors.forEach((error) => {
        console.log(
          `   ${error.route}: ${error.status} ${error.error || ""} (${error.role || "no-auth"})`,
        );
        if (error.errorDetails && error.errorDetails.length > 0) {
          error.errorDetails.forEach((detail) => {
            console.log(`     💥 ${detail.type}: ${detail.message}`);
          });
        }
      });
    }

    // Erreurs de build/compilation
    const buildErrorTypes = [
      "IMPORT_ERROR",
      "MODULE_NOT_FOUND",
      "SYNTAX_ERROR",
      "TYPESCRIPT_ERROR",
      "NEXT_BUILD_ERROR",
      "REACT_HOOK_ERROR",
      "HYDRATION_ERROR",
    ];
    const buildErrors = results.filter((r) =>
      r.errorDetails?.some((e) => buildErrorTypes.includes(e.type)),
    );

    if (buildErrors.length > 0) {
      console.log("\n🔧 ERREURS DE BUILD/COMPILATION:");
      buildErrors.forEach((error) => {
        console.log(`   📄 ${error.route} (${error.role || "no-auth"})`);
        if (error.errorDetails) {
          error.errorDetails.forEach((detail) => {
            if (buildErrorTypes.includes(detail.type)) {
              console.log(`     🚫 ${detail.type}: ${detail.message}`);
              if (detail.details) {
                // Afficher les premières lignes de l'erreur détaillée
                const lines = detail.details.split("\n").slice(0, 8); // Augmenté à 8 lignes
                lines.forEach((line) => {
                  if (line.trim()) {
                    console.log(`        ${line.trim()}`);
                  }
                });
                if (detail.details.split("\n").length > 8) {
                  console.log(
                    `        ... (voir pages-test-results.json pour les détails complets)`,
                  );
                }
              }
            }
          });
        }
      });
    }

    // Pages non trouvées
    const notFound = results.filter((r) => r.status === 404);
    if (notFound.length > 0) {
      console.log("\n❌ PAGES NON TROUVÉES (404):");
      notFound.forEach((nf) => {
        console.log(`   ${nf.route} (${nf.role || "no-auth"})`);
      });
    }

    // Redirections non autorisées
    const unauthorized = results.filter(
      (r) => r.status === 401 || r.status === 403,
    );
    if (unauthorized.length > 0) {
      console.log("\n🔒 ACCÈS NON AUTORISÉ (401/403):");
      unauthorized.forEach((ua) => {
        console.log(`   ${ua.route}: ${ua.status} (${ua.role || "no-auth"})`);
      });
    }

    // Pages lentes
    const slowPages = results.filter((r) => r.responseTime > 2000);
    if (slowPages.length > 0) {
      console.log("\n🐌 PAGES LENTES (>2s):");
      slowPages.forEach((sp) => {
        console.log(
          `   ${sp.route}: ${sp.responseTime}ms (${sp.role || "no-auth"})`,
        );
      });
    }

    console.log("\n✅ Analyse terminée");
  }

  /**
   * Convertit un code de statut en nom lisible
   */
  private getStatusName(status: number): string {
    const statusNames: Record<number, string> = {
      0: "ERREUR_CONNEXION",
      200: "OK",
      301: "REDIRECTION_PERMANENTE",
      302: "REDIRECTION_TEMPORAIRE",
      401: "NON_AUTORISE",
      403: "INTERDIT",
      404: "NON_TROUVE",
      500: "ERREUR_SERVEUR",
    };
    return statusNames[status] || "INCONNU";
  }

  /**
   * Génère un rapport de curl pour une page spécifique
   */
  generateCurlCommands(route: string): void {
    console.log(`\n🔧 COMMANDES CURL POUR: ${route}`);
    console.log("=====================================");

    console.log("\n📝 Test sans authentification:");
    console.log(`curl -v "${this.baseUrl}${route}"`);

    console.log("\n🔐 Tests avec authentification:");
    this.testUsers.forEach((user) => {
      const cookies = `next-auth.session-token=${user.sessionToken}; next-auth.csrf-token=csrf-token-value`;
      console.log(`\n# Test avec ${user.role} (${user.email}):`);
      console.log(`curl -v -H "Cookie: ${cookies}" "${this.baseUrl}${route}"`);
    });
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * Point d'entrée principal
 */
async function main() {
  const checker = new PagesChecker();

  try {
    console.log("🚀 ECODELI - VÉRIFICATEUR DE PAGES");
    console.log("===================================");

    await checker.initializeTestUsers();

    // Analyser les arguments de ligne de commande
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
      console.log("\n📖 AIDE - VÉRIFICATEUR DE PAGES ECODELI");
      console.log("==========================================");
      console.log("\n🎯 UTILISATION GÉNÉRALE:");
      console.log("   tsx scripts/pages-checker.ts [options]");
      console.log("\n🔧 OPTIONS DISPONIBLES:");
      console.log("   --help, -h           Afficher cette aide");
      console.log(
        "   --curl <route>       Générer les commandes curl pour une page",
      );
      console.log(
        "   --protected          Tester uniquement les pages protégées",
      );
      console.log(
        "   --public             Tester uniquement les pages publiques",
      );
      console.log(
        "   --auth               Tester uniquement les pages d'authentification",
      );
      console.log("   --admin              Tester uniquement les pages admin");
      console.log("   --client             Tester uniquement les pages client");
      console.log(
        "   --deliverer          Tester uniquement les pages livreur",
      );
      console.log(
        "   --merchant           Tester uniquement les pages commerçant",
      );
      console.log(
        "   --provider           Tester uniquement les pages prestataire",
      );
      console.log("   --limit=N            Limiter à N pages");
      console.log(
        "   --errors-only        Afficher seulement les pages avec erreurs détaillées",
      );
      console.log("\n📝 EXEMPLES:");
      console.log(
        "   tsx scripts/pages-checker.ts                              # Toutes les pages",
      );
      console.log(
        "   tsx scripts/pages-checker.ts --protected                  # Pages protégées",
      );
      console.log(
        "   tsx scripts/pages-checker.ts --admin --limit=5            # 5 pages admin",
      );
      console.log(
        "   tsx scripts/pages-checker.ts --errors-only                # Seulement les erreurs",
      );
      console.log(
        "   tsx scripts/pages-checker.ts --curl /fr/admin/users       # Commandes curl",
      );
      console.log(
        "   tsx scripts/quick-page-test.ts /fr/client/profile         # Test rapide",
      );
      return;
    }

    if (args.includes("--curl")) {
      const routeIndex = args.indexOf("--curl") + 1;
      if (args[routeIndex]) {
        checker.generateCurlCommands(args[routeIndex]);
        return;
      }
    }

    // Options de filtrage
    const testOptions: any = {};

    if (args.includes("--protected")) testOptions.filterType = "protected";
    if (args.includes("--public")) testOptions.filterType = "public";
    if (args.includes("--auth")) testOptions.filterType = "auth";

    if (args.includes("--admin")) testOptions.filterRole = "ADMIN";
    if (args.includes("--client")) testOptions.filterRole = "CLIENT";
    if (args.includes("--deliverer")) testOptions.filterRole = "DELIVERER";
    if (args.includes("--merchant")) testOptions.filterRole = "MERCHANT";
    if (args.includes("--provider")) testOptions.filterRole = "PROVIDER";

    const limitIndex = args.findIndex((arg) => arg.startsWith("--limit="));
    if (limitIndex !== -1) {
      const limit = parseInt(args[limitIndex].split("=")[1]);
      if (!isNaN(limit)) testOptions.maxPagesPerType = limit;
    }

    // Option pour afficher seulement les erreurs détaillées
    if (args.includes("--errors-only")) {
      testOptions.errorsOnly = true;
    }

    await checker.testAllPages(testOptions);

    console.log("\n🎯 UTILISATION:");
    console.log("   📊 ANALYSE DES RÉSULTATS:");
    console.log("   - Voir toutes les pages: cat pages-list.json | jq");
    console.log("   - Voir les résultats: cat pages-test-results.json | jq");
    console.log(
      "   - Filtrer les erreurs: cat pages-test-results.json | jq '.[] | select(.status >= 400)'",
    );
    console.log("   \n🔧 OPTIONS DE FILTRAGE:");
    console.log(
      "   - Pages protégées seulement: tsx scripts/pages-checker.ts --protected",
    );
    console.log(
      "   - Pages publiques seulement: tsx scripts/pages-checker.ts --public",
    );
    console.log(
      "   - Pages auth seulement: tsx scripts/pages-checker.ts --auth",
    );
    console.log(
      "   - Pages admin seulement: tsx scripts/pages-checker.ts --admin",
    );
    console.log(
      "   - Limiter à 10 pages: tsx scripts/pages-checker.ts --limit=10",
    );
    console.log(
      "   - Combiner filtres: tsx scripts/pages-checker.ts --protected --admin --limit=5",
    );
    console.log("   \n🛠️ OUTILS:");
    console.log(
      "   - Générer curl pour une page: tsx scripts/pages-checker.ts --curl /fr/admin/users",
    );
    console.log(
      "   - Test rapide d'une page: tsx scripts/quick-page-test.ts /fr/client/profile",
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    await checker.cleanup();
  }
}

// Exécution directe
main();

export { PagesChecker };
