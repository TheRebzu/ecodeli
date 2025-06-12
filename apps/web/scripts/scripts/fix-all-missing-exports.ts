#!/usr/bin/env tsx
// scripts/scripts/fix-all-missing-exports.ts

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface MissingExportFix {
  file: string;
  exports: string[];
  template: string;
}

class BatchExportFixer {
  private projectRoot: string = process.cwd();

  constructor() {
    console.log(chalk.bold.cyan('🔧 EcoDeli - Correcteur batch d\'exports manquants\n'));
  }

  async run(): Promise<void> {
    const fixes: MissingExportFix[] = [
      // Types d'utilisateur
      {
        file: 'src/types/users/verification.ts',
        exports: ['CodeVerification'],
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

export default CodeVerification;`
      },
      {
        file: 'src/types/users/preferences.ts',
        exports: ['ProfilePreferences'],
        template: `// Types pour les préférences utilisateur
export interface ProfilePreferences {
  userId: string;
  language: string;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
  updatedAt: Date;
}

export { ProfilePreferences as default };`
      },
      
      // Hooks manquants
      {
        file: 'src/hooks/delivery/use-delivery-status.ts',
        exports: ['useDeliveryDetails'],
        template: `import { api } from '@/hooks/system/use-trpc';

export function useDeliveryDetails(deliveryId: string) {
  const { data: delivery, isLoading } = api.delivery.getDetails.useQuery({ deliveryId });
  
  return {
    delivery,
    isLoading,
    // TODO: Ajouter d'autres propriétés nécessaires
  };
}

// ... existing code ...`
      },
      {
        file: 'src/hooks/features/use-delivery-tracking.ts',
        exports: ['useDeliveryRating'],
        template: `import { api } from '@/hooks/system/use-trpc';

export function useDeliveryRating(deliveryId: string) {
  const rateMutation = api.delivery.rate.useMutation();
  
  const rateDelivery = async (rating: number, comment?: string) => {
    return rateMutation.mutateAsync({ deliveryId, rating, comment });
  };
  
  return {
    rateDelivery,
    isRating: rateMutation.isLoading,
    // TODO: Ajouter d'autres propriétés nécessaires
  };
}

// ... existing code ...`
      },
      {
        file: 'src/hooks/delivery/use-live-tracking.ts',
        exports: ['useLiveTrackingDetails'],
        template: `import { api } from '@/hooks/system/use-trpc';

export function useLiveTrackingDetails(deliveryId: string) {
  const { data: tracking, isLoading } = api.delivery.getLiveTracking.useQuery(
    { deliveryId },
    { refetchInterval: 5000 }
  );
  
  return {
    tracking,
    isLoading,
    // TODO: Ajouter d'autres propriétés nécessaires
  };
}

// ... existing code ...`
      },
      {
        file: 'src/hooks/common/use-storage.ts',
        exports: ['useLocalStorage'],
        template: `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(\`Error reading localStorage key "\${key}":\`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(\`Error setting localStorage key "\${key}":\`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// ... existing code ...`
      },
      
      // Composants manquants
      {
        file: 'src/components/shared/deliveries/delivery-status-badge.tsx',
        exports: ['DeliveryStatusBadge'],
        template: `import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/common';

interface DeliveryStatusBadgeProps {
  status: string;
  className?: string;
}

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={cn(getStatusColor(status), className)}>
      {status}
    </Badge>
  );
}`
      },
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
}

// ... existing code ...`
      },
      {
        file: 'src/components/shared/deliveries/delivery-code-validator.tsx',
        exports: ['DeliveryCodeValidator'],
        template: `import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DeliveryCodeValidatorProps {
  onValidate: (code: string) => Promise<boolean>;
  isValidating?: boolean;
}

export function DeliveryCodeValidator({ onValidate, isValidating = false }: DeliveryCodeValidatorProps) {
  const [code, setCode] = useState('');

  const handleValidate = async () => {
    if (code.trim()) {
      await onValidate(code.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code de validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code de validation"
          maxLength={6}
        />
        <Button 
          onClick={handleValidate} 
          disabled={!code.trim() || isValidating}
          className="w-full"
        >
          {isValidating ? 'Validation...' : 'Valider'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ... existing code ...`
      },
      {
        file: 'src/components/ui/form.tsx',
        exports: ['ClientProfileForm', 'DelivererProfileForm', 'MerchantProfileForm', 'MerchantVerificationForm', 'ProviderVerificationForm'],
        template: `import { Form } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';

// Composants de formulaires de profil
export function ClientProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire client */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function DelivererProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire livreur */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function MerchantProfileForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire marchand */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function MerchantVerificationForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire de vérification marchand */}
        </Form>
      </CardContent>
    </Card>
  );
}

export function ProviderVerificationForm({ children, ...props }: any) {
  return (
    <Card>
      <CardContent>
        <Form {...props}>
          {children}
          {/* TODO: Implémenter le formulaire de vérification prestataire */}
        </Form>
      </CardContent>
    </Card>
  );
}

// ... existing code ...`
      }
    ];

    console.log(chalk.blue('🔧 Application des corrections batch...'));

    let fixedCount = 0;
    for (const fix of fixes) {
      try {
        const filePath = path.join(this.projectRoot, fix.file);
        
        // Créer le répertoire si nécessaire
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Vérifier si le fichier existe
        let content = '';
        try {
          content = await fs.readFile(filePath, 'utf-8');
        } catch {
          // Le fichier n'existe pas, on va le créer
        }

        // Si le fichier est vide ou n'existe pas, utiliser le template
        if (!content.trim()) {
          await fs.writeFile(filePath, fix.template, 'utf-8');
          console.log(chalk.green(`✅ ${fix.file} créé avec ${fix.exports.join(', ')}`));
          fixedCount++;
        } else {
          // Ajouter les exports manquants au fichier existant
          let hasChanges = false;
          for (const exportName of fix.exports) {
            if (!content.includes(`export`) || !content.includes(exportName)) {
              // Ajouter l'export manquant (logique simplifiée)
              content += `\n\n// Export ajouté automatiquement\n${fix.template}`;
              hasChanges = true;
              break;
            }
          }
          
          if (hasChanges) {
            await fs.writeFile(filePath, content, 'utf-8');
            console.log(chalk.green(`✅ ${fix.file} mis à jour avec ${fix.exports.join(', ')}`));
            fixedCount++;
          }
        }
      } catch (err) {
        console.log(chalk.red(`❌ Erreur correction ${fix.file}: ${err}`));
      }
    }

    console.log(chalk.green(`\n✅ ${fixedCount} fichiers corrigés/créés`));
    console.log(chalk.blue('\n💡 Prochaines étapes:'));
    console.log('  1. Exécutez pnpm typecheck pour vérifier les corrections');
    console.log('  2. Exécutez pnpm build pour tester le build complet');
  }
}

// Exécution du script
const fixer = new BatchExportFixer();
fixer.run().catch(console.error); 