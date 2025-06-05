'use client';

import { ProtectedLayout } from './protected/protected-layout';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

interface LayoutDemoProps {
  locale: string;
}

export function LayoutDemo({ locale }: LayoutDemoProps) {
  const breadcrumb = [
    { label: 'Accueil', href: `/${locale}` },
    { label: 'Dashboard', href: `/${locale}/dashboard` },
    { label: 'Exemple' },
  ];

  const actions = (
    <>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Exporter
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Nouveau
      </Button>
    </>
  );

  return (
    <ProtectedLayout
      locale={locale}
      title="Exemple de Layout"
      description="Démonstration du système de layout avec sidebar dynamique selon le rôle"
      breadcrumb={breadcrumb}
      actions={actions}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Sidebar Dynamique</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Le sidebar s'adapte automatiquement selon le rôle de l'utilisateur connecté
            </p>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Routes Complètes</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Toutes les routes de l'arborescence sont intégrées dans chaque sidebar
            </p>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Responsive</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Interface adaptative avec support mobile et collapse automatique
            </p>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Badges de notification en temps réel avec compteurs dynamiques
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Fonctionnalités Implémentées</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">Sidebars par Rôle</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Admin - Gestion complète du système</li>
                <li>• Client - Services et livraisons</li>
                <li>• Livreur - Planning et trajets</li>
                <li>• Commerçant - Catalogue et commandes</li>
                <li>• Prestataire - Services et rendez-vous</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Composants Layout</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Header avec recherche et profil</li>
                <li>• Breadcrumb navigation</li>
                <li>• Actions contextuelles</li>
                <li>• Footer minimal</li>
                <li>• Sélecteur de langue et thème</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
} 