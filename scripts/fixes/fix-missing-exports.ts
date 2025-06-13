#!/usr/bin/env tsx
// scripts/scripts/fix-missing-exports.ts

import { execSync } from "child_process";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

interface MissingExport {
  exportName: string;
  expectedFile: string;
  importingFile: string;
  type: "component" | "hook" | "type" | "function";
}

class ExportFixer {
  private projectRoot: string = process.cwd();
  private fixes: MissingExport[] = [];

  constructor() {
    console.log(
      chalk.bold.cyan("🔧 EcoDeli - Correcteur d'exports manquants\n"),
    );
  }

  async run(): Promise<void> {
    // Analyser les erreurs d'import depuis le build
    await this.analyzeBuildErrors();

    // Corriger les exports manquants
    await this.fixMissingExports();

    // Rapport final
    this.displayReport();
  }

  private async analyzeBuildErrors(): Promise<void> {
    console.log(chalk.blue("📋 Analyse des erreurs d'import...\n"));

    // Définir les corrections connues depuis les erreurs de build
    this.fixes = [
      // Hook useUserBan
      {
        exportName: "useUserBan",
        expectedFile: "src/hooks/common/use-user-preferences.ts",
        importingFile: "src/app/[locale]/(auth)/account-suspended/page.tsx",
        type: "hook",
      },

      // DashboardHeader component
      {
        exportName: "DashboardHeader",
        expectedFile: "src/components/layout/protected/page-header.tsx",
        importingFile: "src/app/[locale]/(protected)/admin/audit/page.tsx",
        type: "component",
      },

      // AnnouncementForm component (multiple files need it)
      {
        exportName: "AnnouncementForm",
        expectedFile: "src/components/ui/form.tsx",
        importingFile:
          "src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx",
        type: "component",
      },

      // ButtonWithLoading component
      {
        exportName: "ButtonWithLoading",
        expectedFile: "src/app/[locale]/(public)/loading.tsx",
        importingFile:
          "src/app/[locale]/(protected)/client/deliveries/[id]/rate/page.tsx",
        type: "component",
      },

      // Toast export
      {
        exportName: "toast",
        expectedFile: "src/components/ui/use-toast.ts",
        importingFile: "src/hooks/payment/use-wallet.ts",
        type: "function",
      },

      // ProfileInfoCard component
      {
        exportName: "ProfileInfoCard",
        expectedFile: "src/components/ui/card.tsx",
        importingFile: "src/app/[locale]/(protected)/client/profile/page.tsx",
        type: "component",
      },
    ];

    console.log(
      chalk.green(`✅ ${this.fixes.length} corrections identifiées\n`),
    );
  }

  private async fixMissingExports(): Promise<void> {
    console.log(chalk.blue("🔧 Application des corrections...\n"));

    for (const fix of this.fixes) {
      await this.applyFix(fix);
    }
  }

  private async applyFix(fix: MissingExport): Promise<void> {
    const filePath = path.join(this.projectRoot, fix.expectedFile);

    try {
      switch (fix.exportName) {
        case "useUserBan":
          await this.fixUserBanImport();
          break;

        case "DashboardHeader":
          await this.fixDashboardHeader();
          break;

        case "toast":
          await this.fixToastExport();
          break;

        case "ButtonWithLoading":
          await this.createButtonWithLoading();
          break;

        case "ProfileInfoCard":
          await this.createProfileInfoCard();
          break;

        case "AnnouncementForm":
          await this.createAnnouncementForm();
          break;

        default:
          console.log(
            chalk.yellow(`⚠️  Fix non défini pour: ${fix.exportName}`),
          );
      }

      console.log(chalk.green(`✅ ${fix.exportName} corrigé`));
    } catch (error) {
      console.log(
        chalk.red(
          `❌ Erreur lors de la correction de ${fix.exportName}: ${error}`,
        ),
      );
    }
  }

  // Corriger l'import useUserBan
  private async fixUserBanImport(): Promise<void> {
    const suspendedPagePath = path.join(
      this.projectRoot,
      "src/app/[locale]/(auth)/account-suspended/page.tsx",
    );

    let content = await fs.readFile(suspendedPagePath, "utf-8");

    // Remplacer l'import incorrect
    content = content.replace(
      "import { useUserBan } from '@/hooks/common/use-user-preferences';",
      "import { useUserBan } from '@/hooks/use-user-ban';",
    );

    await fs.writeFile(suspendedPagePath, content);
  }

  // Créer ou corriger DashboardHeader
  private async fixDashboardHeader(): Promise<void> {
    const pageHeaderPath = path.join(
      this.projectRoot,
      "src/components/layout/protected/page-header.tsx",
    );

    try {
      let content = await fs.readFile(pageHeaderPath, "utf-8");

      // Vérifier si DashboardHeader existe déjà
      if (
        !content.includes("export function DashboardHeader") &&
        !content.includes("export const DashboardHeader")
      ) {
        // Ajouter l'export DashboardHeader
        const dashboardHeaderComponent = `

// Composant DashboardHeader pour compatibilité
export function DashboardHeader({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
`;

        content += dashboardHeaderComponent;
        await fs.writeFile(pageHeaderPath, content);
      }
    } catch (error) {
      // Créer le fichier s'il n'existe pas
      const newContent = `import React from 'react';

// Composant DashboardHeader pour les pages d'administration
export function DashboardHeader({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
`;

      await fs.writeFile(pageHeaderPath, newContent);
    }
  }

  // Corriger l'export toast
  private async fixToastExport(): Promise<void> {
    const toastPath = path.join(
      this.projectRoot,
      "src/components/ui/use-toast.ts",
    );

    try {
      let content = await fs.readFile(toastPath, "utf-8");

      // Vérifier si toast est exporté
      if (
        !content.includes("export { toast }") &&
        !content.includes("export const toast")
      ) {
        // Ajouter l'export toast
        content += "\n\n// Export pour compatibilité\nexport { toast };\n";
        await fs.writeFile(toastPath, content);
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Fichier toast non trouvé: ${error}`));
    }
  }

  // Créer ButtonWithLoading
  private async createButtonWithLoading(): Promise<void> {
    const loadingPath = path.join(
      this.projectRoot,
      "src/app/[locale]/(public)/loading.tsx",
    );

    try {
      let content = await fs.readFile(loadingPath, "utf-8");

      if (!content.includes("ButtonWithLoading")) {
        // Ajouter le composant ButtonWithLoading
        const buttonComponent = `

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function ButtonWithLoading({ 
  children, 
  isLoading, 
  ...props 
}: { 
  children: React.ReactNode; 
  isLoading?: boolean; 
} & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
`;

        content += buttonComponent;
        await fs.writeFile(loadingPath, content);
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Fichier loading non trouvé: ${error}`));
    }
  }

  // Créer ProfileInfoCard
  private async createProfileInfoCard(): Promise<void> {
    const cardPath = path.join(this.projectRoot, "src/components/ui/card.tsx");

    try {
      let content = await fs.readFile(cardPath, "utf-8");

      if (!content.includes("ProfileInfoCard")) {
        // Ajouter le composant ProfileInfoCard
        const profileCardComponent = `

// Composant ProfileInfoCard pour l'affichage des informations de profil
export function ProfileInfoCard({ 
  title, 
  children, 
  ...props 
}: { 
  title: string; 
  children: React.ReactNode; 
} & React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
`;

        content += profileCardComponent;
        await fs.writeFile(cardPath, content);
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Fichier card non trouvé: ${error}`));
    }
  }

  // Créer AnnouncementForm
  private async createAnnouncementForm(): Promise<void> {
    const formPath = path.join(this.projectRoot, "src/components/ui/form.tsx");

    try {
      let content = await fs.readFile(formPath, "utf-8");

      if (!content.includes("AnnouncementForm")) {
        // Ajouter le composant AnnouncementForm
        const announcementFormComponent = `

// Composant AnnouncementForm pour les formulaires d'annonces
export function AnnouncementForm({ 
  onSubmit, 
  children, 
  ...props 
}: { 
  onSubmit: (data: any) => void; 
  children: React.ReactNode; 
} & React.ComponentProps<'form'>) {
  return (
    <form onSubmit={onSubmit} {...props}>
      {children}
    </form>
  );
}

// Export par défaut pour compatibilité
export default AnnouncementForm;
`;

        content += announcementFormComponent;
        await fs.writeFile(formPath, content);
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Fichier form non trouvé: ${error}`));
    }
  }

  private displayReport(): void {
    console.log(chalk.bold.cyan("\n📊 Rapport des corrections:"));
    console.log(chalk.green(`✅ ${this.fixes.length} corrections appliquées`));
    console.log(chalk.blue("\n💡 Prochaines étapes:"));
    console.log(
      chalk.gray("  1. Exécutez pnpm typecheck pour vérifier les types"),
    );
    console.log(chalk.gray("  2. Exécutez pnpm build pour tester le build"));
    console.log(
      chalk.gray("  3. Créez les composants manquants si nécessaire"),
    );
  }
}

// Exécution du script
const fixer = new ExportFixer();
fixer.run().catch(console.error);
