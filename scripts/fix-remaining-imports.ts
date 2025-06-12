#!/usr/bin/env tsx

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

class RemainingImportFixer {
  private projectRoot: string = process.cwd();

  constructor() {
    console.log(chalk.bold.cyan('🔧 EcoDeli - Correcteur d\'imports restants\n'));
  }

  async run(): Promise<void> {
    // Corriger CodeVerification default export
    await this.fixCodeVerification();
    
    // Corriger ProfilePreferences
    await this.fixProfilePreferences();
    
    // Créer DeliveryNotes
    await this.createDeliveryNotes();
    
    // Créer InvoiceList
    await this.createInvoiceList();
    
    // Créer SubscriptionManager
    await this.createSubscriptionManager();
    
    // Créer ProfileDocumentsList
    await this.createProfileDocumentsList();
    
    // Créer dashboard config
    await this.createDashboardConfig();
    
    // Corriger badge avec AnnouncementStatusBadge
    await this.fixBadgeComponent();
    
    // Créer JsonView
    await this.createJsonView();
    
    // Créer VerificationStatusBanner
    await this.createVerificationStatusBanner();
    
    // Créer AnnouncementStatsCards
    await this.createAnnouncementStatsCards();
    
    // Créer useDeliveryContact hook
    await this.createUseDeliveryContact();
    
    // Créer DocumentPreview default export
    await this.createDocumentPreview();

    console.log(chalk.green('\n✅ Correction des imports restants terminée'));
  }

  private async fixCodeVerification(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/types/users/verification.ts');
    const content = `// Types pour la vérification utilisateur
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
export default CodeVerification;`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green('✅ CodeVerification default export ajouté'));
  }

  private async fixProfilePreferences(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/types/users/preferences.ts');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('ProfilePreferences')) {
      content += `
// Alias pour compatibilité
export type ProfilePreferences = UserPreferences;`;
      
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ ProfilePreferences ajouté'));
    }
  }

  private async createDeliveryNotes(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/deliverer/deliveries/delivery-notes.tsx');
    const content = `import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
}`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green('✅ DeliveryNotes créé'));
  }

  private async createInvoiceList(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/merchant/billing/invoice-list.tsx');
    const content = `import { Card, CardContent } from '@/components/ui/card';
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
}`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green('✅ InvoiceList créé'));
  }

  private async createSubscriptionManager(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/client/payments/subscription-manager.tsx');
    const content = `import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
}`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green('✅ SubscriptionManager créé'));
  }

  private async createProfileDocumentsList(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/shared/documents/document-list.tsx');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('ProfileDocumentsList')) {
      content += `
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
}`;

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ ProfileDocumentsList ajouté'));
    }
  }

  private async createDashboardConfig(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/config/dashboard.ts');
    const content = `// Configuration du dashboard
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
};`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green('✅ Dashboard config créé'));
  }

  private async fixBadgeComponent(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/ui/badge.tsx');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('AnnouncementStatusBadge')) {
      content += `
// Component pour les statuts d'annonces
interface AnnouncementStatusBadgeProps {
  status: string;
  className?: string;
}

export function AnnouncementStatusBadge({ status, className }: AnnouncementStatusBadgeProps) {
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
}`;

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ AnnouncementStatusBadge ajouté'));
    }
  }

  private async createJsonView(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/admin/deliverers/document-review.tsx');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('JsonView')) {
      content += `
import { Card, CardContent } from '@/components/ui/card';

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
}`;

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ JsonView ajouté'));
    }
  }

  private async createVerificationStatusBanner(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/admin/verification/verification-list.tsx');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('VerificationStatusBanner')) {
      content += `
import { Alert, AlertDescription } from '@/components/ui/alert';
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
}`;

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ VerificationStatusBanner ajouté'));
    }
  }

  private async createAnnouncementStatsCards(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/admin/announcements/announcement-stats.tsx');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('AnnouncementStatsCards')) {
      content += `
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AnnouncementStatsCardsProps {
  stats: {
    total: number;
    active: number;
    pending: number;
    expired: number;
  };
}

export function AnnouncementStatsCards({ stats }: AnnouncementStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Actives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">En attente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Expirées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
        </CardContent>
      </Card>
    </div>
  );
}`;

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ AnnouncementStatsCards ajouté'));
    }
  }

  private async createUseDeliveryContact(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/deliverer/deliveries/delivery-contact.tsx');
    let content = '';
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {}

    if (!content.includes('useDeliveryContact')) {
      content += `
// Hook pour la gestion des contacts de livraison
export function useDeliveryContact(deliveryId: string) {
  const [contactInfo, setContactInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulation de chargement des infos de contact
    setIsLoading(false);
  }, [deliveryId]);

  return {
    contactInfo,
    isLoading,
    updateContact: setContactInfo
  };
}`;

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green('✅ useDeliveryContact ajouté'));
    }
  }

  private async createDocumentPreview(): Promise<void> {
    const filePath = path.join(this.projectRoot, 'src/components/shared/documents/document-preview.tsx');
    const content = `import { Card, CardContent } from '@/components/ui/card';

interface DocumentPreviewProps {
  document: {
    id: string;
    name: string;
    type: string;
    url?: string;
  };
  className?: string;
}

function DocumentPreview({ document, className }: DocumentPreviewProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold">{document.name}</h3>
          <p className="text-sm text-muted-foreground">{document.type}</p>
          {document.url && (
            <div className="w-full h-48 bg-muted rounded flex items-center justify-center">
              <span className="text-muted-foreground">Aperçu du document</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DocumentPreview;`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green('✅ DocumentPreview default export créé'));
  }
}

// Exécution du script
const fixer = new RemainingImportFixer();
fixer.run().catch(console.error); 