'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, DollarSign, Users, Package, CheckCircle } from 'lucide-react';

type ProviderDashboardProps = {
  locale: string;
};

export default function ProviderDashboard({ locale }: ProviderDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Tableau de bord prestataire</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-500" />
              Rendez-vous à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-green-500" />
              Revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">850 €</p>
            <p className="text-sm text-muted-foreground">Ce mois-ci</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-500" />
              Clients servis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">12</p>
            <p className="text-sm text-muted-foreground">Ce mois-ci</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Prochains rendez-vous</CardTitle>
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
                    <p className="font-medium">Jean Dupont</p>
                    <p className="text-sm text-muted-foreground">Plomberie - Fuite robinet</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">14h30 - 16h00</p>
                    <p className="text-sm text-muted-foreground">Aujourd'hui</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-medium">Marie Laurent</p>
                    <p className="text-sm text-muted-foreground">
                      Électricité - Installation luminaire
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">10h00 - 11h30</p>
                    <p className="text-sm text-muted-foreground">Demain</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-medium">Pierre Martin</p>
                    <p className="text-sm text-muted-foreground">
                      Plomberie - Remplacement chauffe-eau
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">14h00 - 17h00</p>
                    <p className="text-sm text-muted-foreground">24 juin</p>
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
