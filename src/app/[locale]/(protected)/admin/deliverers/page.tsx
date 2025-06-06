'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DeliverersStats } from '@/components/admin/deliverers/deliverers-stats';
import { DeliverersTable } from '@/components/admin/deliverers/deliverers-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Download, 
  FileBarChart, 
  RefreshCw, 
  MessageCircle,
  MapPin
} from 'lucide-react';
import { api } from '@/trpc/react';

export default function AdminDeliverersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Récupération des données réelles depuis la base de données
  const { data: deliverersData, isLoading: isLoadingDeliverers, refetch: refetchDeliverers, error: deliverersError } = api.admin.deliverers.getAll.useQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
  });

  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats, error: statsError } = api.admin.deliverers.getStats.useQuery();

  // Extraction des données wrappées dans json (gestion du format tRPC)
  const safeDeliverersData = deliverersData?.json || deliverersData;
  const safeStatsData = statsData?.json || statsData;

  // Fonction pour actualiser les données
  const handleRefresh = () => {
    refetchDeliverers();
    refetchStats();
  };

  // Filtrer les livreurs par statut (utilisation des données extraites)
  const getFilteredDeliverers = (status?: string) => {
    if (!safeDeliverersData?.deliverers) return [];
    
    switch (status) {
      case 'active':
        return safeDeliverersData.deliverers.filter(d => d.status === 'ACTIVE');
      case 'pending':
        return safeDeliverersData.deliverers.filter(d => d.status === 'PENDING_VERIFICATION');
      case 'suspended':
        return safeDeliverersData.deliverers.filter(d => d.status === 'SUSPENDED');
      default:
        return safeDeliverersData.deliverers;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Livreurs</h1>
          <p className="text-muted-foreground">
            Supervisez et gérez tous les livreurs de la plateforme EcoDeli
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button variant="outline" size="sm">
            <FileBarChart className="mr-2 h-4 w-4" />
            Rapports
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="mr-2 h-4 w-4" />
            Message groupé
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <DeliverersStats 
        data={safeStatsData} 
        isLoading={isLoadingStats} 
      />

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Tous les livreurs
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Actifs
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            En attente
          </TabsTrigger>
          <TabsTrigger value="suspended" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Suspendus
          </TabsTrigger>
          <TabsTrigger value="zones" className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            Zones de couverture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Tous les Livreurs</CardTitle>
              <CardDescription>
                Liste complète de tous les livreurs inscrits sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeliverersTable
                deliverers={getFilteredDeliverers()}
                isLoading={isLoadingDeliverers}
                totalPages={safeDeliverersData?.totalPages || 1}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Livreurs Actifs</CardTitle>
              <CardDescription>
                Livreurs actuellement actifs et disponibles pour les livraisons
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeliverersTable
                deliverers={getFilteredDeliverers('active')}
                isLoading={isLoadingDeliverers}
                totalPages={1}
                currentPage={1}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>En Attente de Vérification</CardTitle>
              <CardDescription>
                Livreurs en attente de vérification de leurs documents
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeliverersTable
                deliverers={getFilteredDeliverers('pending')}
                isLoading={isLoadingDeliverers}
                totalPages={1}
                currentPage={1}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Livreurs Suspendus</CardTitle>
              <CardDescription>
                Livreurs temporairement suspendus nécessitant une attention
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeliverersTable
                deliverers={getFilteredDeliverers('suspended')}
                isLoading={isLoadingDeliverers}
                totalPages={1}
                currentPage={1}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Zones de Couverture</CardTitle>
              <CardDescription>
                Visualisation des zones couvertes par les livreurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 mb-4" />
                  <p>Carte des zones de couverture</p>
                  <p className="text-sm">Fonctionnalité à implémenter</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
