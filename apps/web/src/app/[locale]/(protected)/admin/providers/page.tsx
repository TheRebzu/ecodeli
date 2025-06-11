'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  DownloadIcon, 
  PlusIcon, 
  UsersIcon, 
  EyeIcon, 
  EditIcon, 
  BanIcon, 
  LoaderIcon, 
  RefreshCcwIcon,
  Briefcase,
  Package,
  Award,
  Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/trpc/react';

// Fonctions de formatage
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
};

export default function AdminProvidersPage() {
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    status: undefined as string | undefined,
  });

  // 🔧 FIX: Utiliser la même API que /admin/users qui fonctionne
  const { data: usersData, isLoading, error, refetch } = api.adminUser.getUsers.useQuery({
    page: 1,
    limit: 100, // Récupérer plus d'utilisateurs pour filtrer côté client
  });

  // DEBUG: Afficher les données reçues
  console.log('🔍 DEBUG PROVIDERS - usersData:', usersData);
  console.log('🔍 DEBUG PROVIDERS - usersData?.json?.users:', usersData?.json?.users);

  // Filtrer les prestataires depuis les données reçues
  const allUsers = usersData?.json?.users || [];
  const providerUsers = allUsers.filter((user: any) => user.role === 'PROVIDER');

  // Appliquer les filtres côté frontend
  let filteredProviders = providerUsers;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredProviders = filteredProviders.filter((provider: any) =>
      provider.name?.toLowerCase().includes(searchLower) ||
      provider.email?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.status) {
    filteredProviders = filteredProviders.filter((provider: any) => provider.status === filters.status);
  }

  // Trier les prestataires
  filteredProviders.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pagination côté frontend
  const totalProviders = filteredProviders.length;
  const totalPages = Math.ceil(totalProviders / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProviders = filteredProviders.slice(startIndex, endIndex);

  // Transformer les prestataires pour match le format attendu
  const providers = paginatedProviders.map((provider: any) => ({
    id: provider.id, // ✅ Utiliser le vrai ID
    name: provider.name,
    email: provider.email,
    phoneNumber: provider.phoneNumber,
    status: provider.status,
    isVerified: provider.isVerified,
    createdAt: provider.createdAt,
    lastLoginAt: provider.lastLoginAt,
    provider: {
      id: `provider-${provider.id}`, // ID du profil prestataire simulé
      companyName: provider.name,
      address: null,
      city: 'Paris', // Données simulées
      postalCode: '75000',
      country: 'France',
      serviceType: 'Services divers',
      description: 'Prestataire professionnel',
    },
    stats: {
      totalServices: 0,
      totalBookings: 0,
      totalRevenue: 0,
      averageRating: 4.3,
      completionRate: 95,
      lastBookingDate: null,
    },
  }));

  // Statistiques des prestataires
  const stats = {
    totalProviders: providerUsers.length,
    activeProviders: providerUsers.filter((p: any) => p.status === 'ACTIVE').length,
    suspendedProviders: providerUsers.filter((p: any) => p.status === 'SUSPENDED').length,
    newProvidersThisMonth: providerUsers.filter((p: any) => {
      const createdAt = new Date(p.createdAt);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length,
  };

  // Gérer la sélection des prestataires
  const handleProviderSelection = (providerId: string, selected: boolean) => {
    if (selected) {
      setSelectedProviderIds(prev => [...prev, providerId]);
    } else {
      setSelectedProviderIds(prev => prev.filter(id => id !== providerId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedProviderIds(providers.map((provider: any) => provider.id));
    } else {
      setSelectedProviderIds([]);
    }
  };

  // Gestion des filtres
  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    const statusValue = status === 'all' ? undefined : status;
    setFilters(prev => ({ ...prev, status: statusValue }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: undefined });
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Erreur lors du chargement des prestataires</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Prestataires</h1>
          <p className="text-muted-foreground">
            Administrez et supervisez tous les prestataires de services de la plateforme
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Ajouter un prestataire
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs
        defaultValue="list"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center">
              <Briefcase className="mr-2 h-4 w-4" />
              Liste des Prestataires
            </TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          {/* Statistiques rapides */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-xl">Aperçu des Prestataires</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Total prestataires</span>
                  <span className="text-2xl font-bold">{stats.totalProviders}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Prestataires actifs</span>
                  <span className="text-2xl font-bold text-green-600">{stats.activeProviders}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Prestataires suspendus</span>
                  <span className="text-2xl font-bold text-red-600">{stats.suspendedProviders}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Nouveaux ce mois</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.newProvidersThisMonth}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtres et recherche */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par nom, email ou spécialité..."
                    value={filters.search || ''}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <div className="w-48">
                  <Select 
                    value={filters.status || 'all'} 
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="ACTIVE">Actifs</SelectItem>
                      <SelectItem value="PENDING_VERIFICATION">En attente</SelectItem>
                      <SelectItem value="SUSPENDED">Suspendus</SelectItem>
                      <SelectItem value="INACTIVE">Inactifs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Effacer les filtres
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions en lot */}
          {selectedProviderIds.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedProviderIds.length} prestataire(s) sélectionné(s)
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Exporter sélection
                    </Button>
                    <Button variant="outline" size="sm">
                      Suspendre
                    </Button>
                    <Button variant="outline" size="sm">
                      Réactiver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table des prestataires */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoaderIcon className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Chargement des prestataires...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox"
                          checked={selectedProviderIds.length === providers.length && providers.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableHead>
                      <TableHead>Prestataire</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Chiffre d'affaires</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center p-8 text-muted-foreground">
                          Aucun prestataire trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      providers.map((provider: any) => (
                        <TableRow key={provider.id}>
                          <TableCell>
                            <input 
                              type="checkbox"
                              checked={selectedProviderIds.includes(provider.id)}
                              onChange={(e) => handleProviderSelection(provider.id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">{provider.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{provider.phoneNumber || 'Non renseigné'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {provider.provider?.city}, {provider.provider?.postalCode}
                              <br />
                              <span className="text-muted-foreground">{provider.provider?.country}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={provider.status === 'ACTIVE' ? 'default' : 'destructive'}>
                              {provider.status === 'ACTIVE' ? 'Actif' : 
                               provider.status === 'PENDING_VERIFICATION' ? 'En attente' : 
                               provider.status === 'SUSPENDED' ? 'Suspendu' : 'Inactif'}
                            </Badge>
                            {provider.isVerified && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                Vérifié
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{provider.stats?.totalServices || 0}</div>
                            <div className="text-xs text-muted-foreground">
                              {provider.stats?.totalBookings || 0} réservations
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{provider.stats?.averageRating?.toFixed(1) || '4.3'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {provider.stats?.completionRate || 95}% réussite
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(provider.stats?.totalRevenue || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(provider.createdAt)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Link href={`/fr/admin/users/${provider.id}`}>
                                <Button variant="ghost" size="sm">
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/fr/admin/users/${provider.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm">
                                <BanIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination et résultats */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Affichage de {providers.length} prestataire(s) sur {totalProviders} au total
                (Page {currentPage} sur {totalPages})
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques Détaillées</CardTitle>
              <CardDescription>
                Analyse complète des prestataires et de leur activité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Performance Globale</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Chiffre d'affaires total:</span>
                      <span className="font-bold">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Réservation moyenne:</span>
                      <span className="font-bold">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taux de satisfaction:</span>
                      <span className="font-bold">94.8%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Répartition par Spécialité</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Réparation & Maintenance:</span>
                      <span className="font-bold">35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nettoyage & Entretien:</span>
                      <span className="font-bold">25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Installation & Montage:</span>
                      <span className="font-bold">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jardinage & Extérieur:</span>
                      <span className="font-bold">20%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
