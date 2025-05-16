'use client';

import React from 'react';
import BillingDashboard from '@/components/payments/admin/billing-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

/**
 * Page d'administration de la facturation
 * Centre de contrôle pour la facturation automatique et les opérations financières
 */
export default function AdminBillingPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Gestion de la facturation</h1>
          <p className="text-muted-foreground mt-2">
            Centre de contrôle pour la facturation automatique et les opérations financières
          </p>
        </div>

        <Separator />

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Historique des opérations</h2>
                  </div>

                  <p className="text-muted-foreground">
                    L'historique des opérations de facturation sera affiché ici.
                  </p>

                  <div className="bg-muted p-8 rounded-md text-center">
                    <p className="text-muted-foreground">Fonctionnalité à implémenter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Paramètres de facturation</h2>
                  </div>

                  <p className="text-muted-foreground">
                    Configurez les paramètres de facturation automatique.
                  </p>

                  <div className="bg-muted p-8 rounded-md text-center">
                    <p className="text-muted-foreground">Fonctionnalité à implémenter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
