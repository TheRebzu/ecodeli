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

export default function AdminDeliverersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  // Données simulées pour les statistiques
  const statsData = {
    totalDeliverers: 156,
    activeDeliverers: 142,
    verifiedDeliverers: 134,
    pendingVerification: 8,
    suspendedDeliverers: 6,
    averageRating: 4.6,
    totalDeliveries: 2847,
    averageEarnings: 850,
    vehicledDeliverers: 89,
    topPerformers: [
      { id: '1', name: 'Jean Dupont', rating: 4.9, deliveries: 156 },
      { id: '2', name: 'Marie Martin', rating: 4.8, deliveries: 142 },
      { id: '3', name: 'Pierre Durand', rating: 4.7, deliveries: 138 },
      { id: '4', name: 'Sophie Bernard', rating: 4.7, deliveries: 125 },
    ],
    growthRate: 12.5,
    activeZones: 25,
  };

  // Données simulées pour les livreurs
  const deliverersData = {
    deliverers: [
      {
        id: '1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+33 6 12 34 56 78',
        image: undefined,
        status: 'ACTIVE' as const,
        isVerified: true,
        verificationStatus: 'APPROVED' as const,
        createdAt: new Date('2024-01-15'),
        lastActiveAt: new Date('2024-12-05'),
        totalDeliveries: 156,
        completedDeliveries: 152,
        rating: 4.9,
        earnings: 1250,
        hasVehicle: true,
        vehicleType: 'Vélo électrique',
        preferredZones: ['Centre-ville', 'Quartier Nord'],
      },
      {
        id: '2',
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@example.com',
        phone: '+33 6 98 76 54 32',
        image: undefined,
        status: 'ACTIVE' as const,
        isVerified: true,
        verificationStatus: 'APPROVED' as const,
        createdAt: new Date('2024-02-20'),
        lastActiveAt: new Date('2024-12-05'),
        totalDeliveries: 142,
        completedDeliveries: 138,
        rating: 4.8,
        earnings: 980,
        hasVehicle: false,
        vehicleType: undefined,
        preferredZones: ['Centre-ville'],
      },
      {
        id: '3',
        firstName: 'Pierre',
        lastName: 'Durand',
        email: 'pierre.durand@example.com',
        phone: '+33 6 11 22 33 44',
        image: undefined,
        status: 'PENDING_VERIFICATION' as const,
        isVerified: false,
        verificationStatus: 'PENDING' as const,
        createdAt: new Date('2024-11-01'),
        lastActiveAt: new Date('2024-12-04'),
        totalDeliveries: 5,
        completedDeliveries: 4,
        rating: 4.2,
        earnings: 45,
        hasVehicle: true,
        vehicleType: 'Scooter',
        preferredZones: ['Quartier Sud'],
      },
      {
        id: '4',
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 'sophie.bernard@example.com',
        phone: '+33 6 55 66 77 88',
        image: undefined,
        status: 'SUSPENDED' as const,
        isVerified: true,
        verificationStatus: 'APPROVED' as const,
        createdAt: new Date('2024-03-10'),
        lastActiveAt: new Date('2024-11-28'),
        totalDeliveries: 89,
        completedDeliveries: 82,
        rating: 4.1,
        earnings: 650,
        hasVehicle: false,
        vehicleType: undefined,
        preferredZones: ['Quartier Est', 'Quartier Ouest'],
      },
    ],
    total: 156,
    totalPages: 16,
    currentPage: 1,
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
          <Button variant="outline" size="sm">
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
      <DeliverersStats data={statsData} />

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
                deliverers={deliverersData.deliverers}
                isLoading={false}
                totalPages={deliverersData.totalPages}
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
                deliverers={deliverersData.deliverers.filter(d => d.status === 'ACTIVE')}
                isLoading={false}
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
                deliverers={deliverersData.deliverers.filter(d => d.status === 'PENDING_VERIFICATION')}
                isLoading={false}
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
                deliverers={deliverersData.deliverers.filter(d => d.status === 'SUSPENDED')}
                isLoading={false}
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
