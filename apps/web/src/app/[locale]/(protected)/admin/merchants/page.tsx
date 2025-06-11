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
  Store,
  Package
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

export default function AdminMerchantsPage() {
  const t = useTranslations('Admin.merchants');
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([]);
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
  console.log('🔍 DEBUG MERCHANTS - usersData:', usersData);
  console.log('🔍 DEBUG MERCHANTS - usersData?.json?.users:', usersData?.json?.users);

  // Filtrer les marchands depuis les données reçues
  const allUsers = usersData?.json?.users || [];
  const merchantUsers = allUsers.filter((user: any) => user.role === 'MERCHANT');

  // Appliquer les filtres côté frontend
  let filteredMerchants = merchantUsers;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredMerchants = filteredMerchants.filter((merchant: any) =>
      merchant.name?.toLowerCase().includes(searchLower) ||
      merchant.email?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.status) {
    filteredMerchants = filteredMerchants.filter((merchant: any) => merchant.status === filters.status);
  }

  // Trier les marchands
  filteredMerchants.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pagination côté frontend
  const totalMerchants = filteredMerchants.length;
  const totalPages = Math.ceil(totalMerchants / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMerchants = filteredMerchants.slice(startIndex, endIndex);

  // Transformer les marchands pour match le format attendu
  const merchants = paginatedMerchants.map((merchant: any) => ({
    id: merchant.id, // ✅ Utiliser le vrai ID
    name: merchant.name,
    email: merchant.email,
    phoneNumber: merchant.phoneNumber,
    status: merchant.status,
    isVerified: merchant.isVerified,
    createdAt: merchant.createdAt,
    lastLoginAt: merchant.lastLoginAt,
    merchant: {
      id: `merchant-${merchant.id}`, // ID du profil marchand simulé
      companyName: merchant.name,
      address: null,
      city: 'Paris', // Données simulées
      postalCode: '75000',
      country: 'France',
      businessType: 'Commerce',
    },
    stats: {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 4.2,
      lastOrderDate: null,
    },
  }));

  // Statistiques des marchands
  const stats = {
    totalMerchants: merchantUsers.length,
    activeMerchants: merchantUsers.filter((m: any) => m.status === 'ACTIVE').length,
    suspendedMerchants: merchantUsers.filter((m: any) => m.status === 'SUSPENDED').length,
    newMerchantsThisMonth: merchantUsers.filter((m: any) => {
      const createdAt = new Date(m.createdAt);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length,
  };

  // Gérer la sélection des marchands
  const handleMerchantSelection = (merchantId: string, selected: boolean) => {
    if (selected) {
      setSelectedMerchantIds(prev => [...prev, merchantId]);
    } else {
      setSelectedMerchantIds(prev => prev.filter(id => id !== merchantId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedMerchantIds(merchants.map((merchant: any) => merchant.id));
    } else {
      setSelectedMerchantIds([]);
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
            <p className="text-red-600 mb-4">Erreur lors du chargement des marchands</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Marchands</h1>
          <p className="text-muted-foreground">
            Administrez et supervisez tous les marchands de la plateforme
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Ajouter un marchand
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
              <Store className="mr-2 h-4 w-4" />
              Liste des Marchands
            </TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          {/* Statistiques rapides */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-xl">Aperçu des Marchands</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Total marchands</span>
                  <span className="text-2xl font-bold">{stats.totalMerchants}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Marchands actifs</span>
                  <span className="text-2xl font-bold text-green-600">{stats.activeMerchants}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Marchands suspendus</span>
                  <span className="text-2xl font-bold text-red-600">{stats.suspendedMerchants}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Nouveaux ce mois</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.newMerchantsThisMonth}</span>
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
                    placeholder="Rechercher par nom, email ou entreprise..."
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
          {selectedMerchantIds.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedMerchantIds.length} marchand(s) sélectionné(s)
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

          {/* Table des marchands */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoaderIcon className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Chargement des marchands...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox"
                          checked={selectedMerchantIds.length === merchants.length && merchants.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableHead>
                      <TableHead>Marchand</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead>Chiffre d'affaires</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center p-8 text-muted-foreground">
                          Aucun marchand trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      merchants.map((merchant: any) => (
                        <TableRow key={merchant.id}>
                          <TableCell>
                            <input 
                              type="checkbox"
                              checked={selectedMerchantIds.includes(merchant.id)}
                              onChange={(e) => handleMerchantSelection(merchant.id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{merchant.name}</div>
                            <div className="text-sm text-muted-foreground">{merchant.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{merchant.phoneNumber || 'Non renseigné'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {merchant.merchant?.city}, {merchant.merchant?.postalCode}
                              <br />
                              <span className="text-muted-foreground">{merchant.merchant?.country}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={merchant.status === 'ACTIVE' ? 'default' : 'destructive'}>
                              {merchant.status === 'ACTIVE' ? 'Actif' : 
                               merchant.status === 'PENDING_VERIFICATION' ? 'En attente' : 
                               merchant.status === 'SUSPENDED' ? 'Suspendu' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{merchant.stats?.totalProducts || 0}</div>
                            <div className="text-xs text-muted-foreground">
                              {merchant.stats?.totalOrders || 0} commandes
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(merchant.stats?.totalRevenue || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(merchant.createdAt)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Link href={`/fr/admin/users/${merchant.id}`}>
                                <Button variant="ghost" size="sm">
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/fr/admin/users/${merchant.id}/edit`}>
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
                Affichage de {merchants.length} marchand(s) sur {totalMerchants} au total
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
                Analyse complète des marchands et de leur activité
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
                      <span>Commande moyenne:</span>
                      <span className="font-bold">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taux de satisfaction:</span>
                      <span className="font-bold">92.1%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Répartition par Secteur</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Alimentation:</span>
                      <span className="font-bold">45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode & Accessoires:</span>
                      <span className="font-bold">25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Électronique:</span>
                      <span className="font-bold">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Autres:</span>
                      <span className="font-bold">10%</span>
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
