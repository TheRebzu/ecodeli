'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DeliverersStats } from '@/components/admin/deliverers/deliverers-stats';
import { DeliverersTable } from '@/components/admin/deliverers/deliverers-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Download, FileBarChart, RefreshCw, MessageCircle, MapPin } from 'lucide-react';
import { api } from '@/trpc/react';

export default function AdminDeliverersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // 🔧 FIX: Utiliser la même API que /admin/users qui fonctionne
  const {
    data: usersData,
    isLoading: isLoadingDeliverers,
    refetch: refetchDeliverers,
    error: deliverersError,
  } = api.adminUser.getUsers.useQuery({
    page: 1,
    limit: 100, // Récupérer plus d'utilisateurs pour filtrer côté client
  });

  // DEBUG: Afficher les données reçues
  console.log('🔍 DEBUG DELIVERERS - usersData:', usersData);
  console.log('🔍 DEBUG DELIVERERS - usersData?.json?.users:', usersData?.json?.users);

  // Filtrer les livreurs depuis les données reçues
  const allUsers = usersData?.json?.users || [];
  const delivererUsers = allUsers.filter((user: any) => user.role === 'DELIVERER');

  // Appliquer les filtres côté frontend
  let filteredDeliverers = delivererUsers;

  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredDeliverers = filteredDeliverers.filter(
      (deliverer: any) =>
        deliverer.name?.toLowerCase().includes(searchLower) ||
        deliverer.email?.toLowerCase().includes(searchLower)
    );
  }

  // Transformer les livreurs pour match le format attendu par DeliverersTable
  const deliverers = filteredDeliverers.map((deliverer: any) => ({
    id: deliverer.id, // ✅ Utiliser le vrai ID
    firstName: deliverer.name?.split(' ')[0] || 'Prénom',
    lastName: deliverer.name?.split(' ').slice(1).join(' ') || 'Nom',
    email: deliverer.email,
    phone: deliverer.phoneNumber,
    image: deliverer.image,
    status: deliverer.status,
    isVerified: deliverer.isVerified,
    verificationStatus: deliverer.isVerified ? 'APPROVED' : 'PENDING',
    createdAt: deliverer.createdAt,
    lastActiveAt: deliverer.lastLoginAt,
    totalDeliveries: 0, // Données simulées
    completedDeliveries: 0,
    rating: 4.5,
    earnings: 0,
    hasVehicle: true,
    vehicleType: 'Voiture',
    preferredZones: ['Paris', 'Lyon'],
  }));

  // Créer les données de pagination
  const safeDeliverersData = {
    deliverers,
    totalPages: 1,
    currentPage: 1,
    total: deliverers.length,
  };

  // Statistiques des livreurs
  const safeStatsData = {
    totalDeliverers: delivererUsers.length,
    activeDeliverers: delivererUsers.filter((d: any) => d.status === 'ACTIVE').length,
    pendingDeliverers: delivererUsers.filter((d: any) => d.status === 'PENDING_VERIFICATION')
      .length,
    suspendedDeliverers: delivererUsers.filter((d: any) => d.status === 'SUSPENDED').length,
    totalDeliveries: 0,
    totalEarnings: 0,
    averageRating: 4.5,
  };

  const isLoadingStats = false;

  // Fonction pour actualiser les données
  const handleRefresh = () => {
    refetchDeliverers();
  };

  // Filtrer les livreurs par statut (utilisation des données extraites)
  const getFilteredDeliverers = (status?: string) => {
    if (!safeDeliverersData?.deliverers) {
      return [];
    }

    switch (status) {
      case 'active':
        return safeDeliverersData.deliverers.filter((d: any) => d.status === 'ACTIVE');
      case 'pending':
        return safeDeliverersData.deliverers.filter(
          (d: any) => d.status === 'PENDING_VERIFICATION'
        );
      case 'suspended':
        return safeDeliverersData.deliverers.filter((d: any) => d.status === 'SUSPENDED');
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
      <DeliverersStats data={safeStatsData} isLoading={isLoadingStats} />

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
                onRefresh={handleRefresh}
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
                onRefresh={handleRefresh}
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
                onRefresh={handleRefresh}
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
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle>Zones de Couverture</CardTitle>
              <CardDescription>Visualisation des zones couvertes par les livreurs</CardDescription>
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
