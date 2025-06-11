'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, TrendingUp, Package, Truck, CheckCircle, AlertCircle } from 'lucide-react';

type MerchantDashboardProps = {
  locale: string;
};

export default function MerchantDashboard({ locale }: MerchantDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Tableau de bord marchand</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-blue-500" />
              Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
              Ventes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1 250 €</p>
            <p className="text-sm text-muted-foreground">Ce mois-ci</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Truck className="mr-2 h-5 w-5 text-yellow-500" />
              Livraisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">8</p>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-purple-500" />
              Planifiées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-muted-foreground">Pour demain</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Dernières commandes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-medium">Commande #1254</p>
                    <p className="text-sm text-muted-foreground">3 articles - Marie Dupont</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">85,50 €</p>
                    <p className="text-sm text-muted-foreground">Il y a 10 min</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-medium">Commande #1253</p>
                    <p className="text-sm text-muted-foreground">1 article - Jean Martin</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">24,99 €</p>
                    <p className="text-sm text-muted-foreground">Il y a 34 min</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-medium">Commande #1252</p>
                    <p className="text-sm text-muted-foreground">2 articles - Sophie Bernard</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">42,80 €</p>
                    <p className="text-sm text-muted-foreground">Il y a 58 min</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Statut de vérification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium mb-1">Compte vérifié</h3>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Votre compte a été vérifié et est entièrement fonctionnel.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
