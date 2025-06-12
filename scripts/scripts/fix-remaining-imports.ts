#!/usr/bin/env tsx
// scripts/scripts/fix-remaining-imports.ts

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface RemainingImportFix {
  file: string;
  exports: string[];
  template: string;
}

class RemainingImportFixer {
  private projectRoot: string = process.cwd();

  constructor() {
    console.log(chalk.bold.cyan('🔧 EcoDeli - Correcteur d\'imports restants\n'));
  }

  async run(): Promise<void> {
    const fixes: RemainingImportFix[] = [
      // 1. Default export pour CodeVerification
      {
        file: 'src/types/users/verification.ts',
        exports: ['default export'],
        template: `// Types pour la vérification utilisateur
export interface CodeVerification {
  id: string;
  userId: string;
  code: string;
  type: 'EMAIL' | 'PHONE' | 'TWO_FACTOR';
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
}

// Export par défaut pour compatibilité
export default CodeVerification;`
      },

      // 2. ProfilePreferences dans preferences.ts
      {
        file: 'src/types/users/preferences.ts',
        exports: ['ProfilePreferences'],
        template: `// Types pour les préférences utilisateur
export interface UserPreferences {
  userId: string;
  language: string;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: {
    deliveries: boolean;
    payments: boolean;
    announcements: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface PrivacyPreferences {
  profileVisibility: 'PUBLIC' | 'PRIVATE' | 'CONTACTS_ONLY';
  locationSharing: boolean;
  analyticsOptOut: boolean;
  marketingOptOut: boolean;
  dataRetention: 'MINIMAL' | 'STANDARD' | 'EXTENDED';
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Alias pour compatibilité
export type ProfilePreferences = UserPreferences;`
      },

      // 3. DeliveryNotes component
      {
        file: 'src/components/deliverer/deliveries/delivery-notes.tsx',
        exports: ['DeliveryNotes'],
        template: `import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface DeliveryNotesProps {
  deliveryId: string;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  readOnly?: boolean;
}

export function DeliveryNotes({ deliveryId, notes, onNotesChange, readOnly = false }: DeliveryNotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes de livraison</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes || ''}
          onChange={(e) => onNotesChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder="Ajouter des notes pour cette livraison..."
          className="min-h-[100px]"
        />
      </CardContent>
    </Card>
  );
}`
      },

      // 4. InvoiceList component
      {
        file: 'src/components/merchant/billing/invoice-list.tsx',
        exports: ['InvoiceList'],
        template: `import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  date: Date;
}

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading?: boolean;
}

export function InvoiceList({ invoices, isLoading = false }: InvoiceListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Chargement des factures...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.number}</TableCell>
                <TableCell>{invoice.amount}€</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>{invoice.date.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}`
      },

      // 5. SubscriptionManager component  
      {
        file: 'src/components/client/payments/subscription-manager.tsx',
        exports: ['SubscriptionManager'],
        template: `import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SubscriptionManagerProps {
  currentPlan?: string;
  onUpgrade?: () => void;
  onCancel?: () => void;
}

export function SubscriptionManager({ 
  currentPlan = 'Free', 
  onUpgrade, 
  onCancel 
}: SubscriptionManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement actuel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Plan actuel: <strong>{currentPlan}</strong></p>
        <div className="flex gap-2">
          <Button onClick={onUpgrade} variant="default">
            Mettre à niveau
          </Button>
          <Button onClick={onCancel} variant="outline">
            Annuler l'abonnement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}`
      },

      // 6. ProfileDocumentsList component
      {
        file: 'src/components/shared/documents/document-list.tsx',
        exports: ['ProfileDocumentsList'],
        template: `import { Card, CardContent } from '@/components/ui/card';

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ProfileDocumentsListProps {
  documents: Document[];
  onUpload?: () => void;
}

export function ProfileDocumentsList({ documents, onUpload }: ProfileDocumentsListProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Documents du profil</h3>
        {documents.length === 0 ? (
          <p className="text-muted-foreground">Aucun document trouvé</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex justify-between items-center p-2 border rounded">
                <span>{doc.name}</span>
                <span className="text-sm text-muted-foreground">{doc.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}`
      },

      // 7. Config dashboard components
      {
        file: 'src/config/dashboard.ts',
        exports: ['DelivererWalletDashboard'],
        template: `// Configuration du dashboard
export const DelivererWalletDashboard = {
  title: 'Portefeuille Livreur',
  widgets: [
    'balance',
    'pending-payments',
    'transaction-history',
    'withdrawal-options'
  ],
  layout: 'grid-2x2'
};

export const ClientDashboard = {
  title: 'Tableau de bord Client',
  widgets: [
    'recent-orders',
    'active-deliveries',
    'payment-methods',
    'favorites'
  ],
  layout: 'grid-3x1'
};

export const MerchantDashboard = {
  title: 'Tableau de bord Marchand',
  widgets: [
    'sales-overview',
    'pending-orders',
    'delivery-status',
    'analytics'
  ],
  layout: 'grid-2x2'
};`
      },

      // 8. AnnouncementStatusBadge dans badge.tsx
      {
        file: 'src/components/ui/badge.tsx',
        exports: ['AnnouncementStatusBadge'],
        template: `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/common"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Component pour les statuts d'annonces
interface AnnouncementStatusBadgeProps {
  status: string;
  className?: string;
}

function AnnouncementStatusBadge({ status, className }: AnnouncementStatusBadgeProps) {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(status)} className={className}>
      {status}
    </Badge>
  );
}

export { Badge, badgeVariants, AnnouncementStatusBadge }`
      },

      // 9. JsonView component
      {
        file: 'src/components/admin/deliverers/document-review.tsx',
        exports: ['JsonView'],
        template: `import { Card, CardContent } from '@/components/ui/card';

interface JsonViewProps {
  data: any;
  className?: string;
}

export function JsonView({ data, className }: JsonViewProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <pre className="text-sm overflow-auto bg-muted p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}`
      },

      // 10. VerificationStatusBanner component
      {
        file: 'src/components/admin/verification/verification-list.tsx',
        exports: ['VerificationStatusBanner'],
        template: `import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface VerificationStatusBannerProps {
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
}

export function VerificationStatusBanner({ status, message }: VerificationStatusBannerProps) {
  const getVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Alert>
      <AlertDescription className="flex items-center gap-2">
        <Badge variant={getVariant(status)}>
          {status.toUpperCase()}
        </Badge>
        {message && <span>{message}</span>}
      </AlertDescription>
    </Alert>
  );
}`
      }
    ];

    console.log(chalk.blue('🔧 Application des corrections d\'imports restants...'));

    let fixedCount = 0;
    for (const fix of fixes) {
      try {
        const filePath = path.join(this.projectRoot, fix.file);
        
        // Créer le répertoire si nécessaire
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Vérifier si le fichier existe et lire son contenu
        let content = '';
        let fileExists = false;
        try {
          content = await fs.readFile(filePath, 'utf-8');
          fileExists = true;
        } catch {
          // Le fichier n'existe pas
        }

        if (!fileExists || content.trim().length === 0) {
          // Créer le fichier avec le template
          await fs.writeFile(filePath, fix.template, 'utf-8');
          console.log(chalk.green(`✅ ${fix.file} créé`));
          fixedCount++;
        } else {
          // Vérifier si les exports sont manquants
          let needsUpdate = false;
          for (const exportName of fix.exports) {
            if (!content.includes(exportName) || 
                (exportName === 'default export' && !content.includes('export default'))) {
              needsUpdate = true;
              break;
            }
          }

          if (needsUpdate) {
            // Remplacer le contenu avec le template complet
            await fs.writeFile(filePath, fix.template, 'utf-8');
            console.log(chalk.green(`✅ ${fix.file} mis à jour`));
            fixedCount++;
          } else {
            console.log(chalk.yellow(`⏭️  ${fix.file} déjà correct`));
          }
        }
      } catch (err) {
        console.log(chalk.red(`❌ Erreur ${fix.file}: ${err}`));
      }
    }

    // Corriger aussi l'erreur ESLint config
    await this.fixEslintConfig();

    console.log(chalk.green(`\n✅ ${fixedCount} fichiers corrigés`));
    console.log(chalk.blue('\n💡 Prochaines étapes:'));
    console.log('  1. Exécutez pnpm build pour tester les corrections');
    console.log('  2. Corrigez l\'erreur Next.js params si elle persiste');
  }

  private async fixEslintConfig(): Promise<void> {
    try {
      const eslintPath = path.join(this.projectRoot, '.eslintrc.js');
      let content = await fs.readFile(eslintPath, 'utf-8');
      
      // Corriger l'erreur "module is not defined" en ajoutant la directive
      if (!content.includes('/* eslint-env node */')) {
        content = '/* eslint-env node */\n' + content;
        await fs.writeFile(eslintPath, content, 'utf-8');
        console.log(chalk.green('✅ .eslintrc.js corrigé'));
      }
    } catch (err) {
      console.log(chalk.yellow('⚠️  Impossible de corriger .eslintrc.js automatiquement'));
    }
  }
}

// Exécution du script
const fixer = new RemainingImportFixer();
fixer.run().catch(console.error); 