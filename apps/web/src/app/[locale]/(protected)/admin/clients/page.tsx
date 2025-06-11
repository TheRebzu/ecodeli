'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DownloadIcon, PlusIcon, UsersIcon, EyeIcon, EditIcon, BanIcon, LoaderIcon, RefreshCcwIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminClients } from '@/hooks/use-admin-clients';

// Fonctions de formatage temporaires
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



export default function AdminClientsPage() {
  const t = useTranslations('Admin.clients');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list');
  
  // Utilisation du hook pour les vraies données
  const {
    clients,
    pagination,
    stats,
    filters,
    currentPage,
    pageSize,
    isLoading,
    isLoadingStats,
    error,
    updateFilters,
    clearFilters,
    setCurrentPage,
    refetch,
  } = useAdminClients();



  // Gérer la sélection des clients
  const handleClientSelection = (clientId: string, selected: boolean) => {
    if (selected) {
      setSelectedClientIds(prev => [...prev, clientId]);
    } else {
      setSelectedClientIds(prev => prev.filter(id => id !== clientId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedClientIds(clients.map((client: any) => client.id));
    } else {
      setSelectedClientIds([]);
    }
  };

  // Gestion des filtres
  const handleSearchChange = (search: string) => {
    updateFilters({ search });
  };

  const handleStatusChange = (status: string) => {
    const statusValue = status === 'all' ? undefined : status as any;
    updateFilters({ status: statusValue });
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Erreur lors du chargement des clients</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Clients</h1>
          <p className="text-muted-foreground">
            Administrez et supervisez tous les clients de la plateforme
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            Ajouter un client
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
              <UsersIcon className="mr-2 h-4 w-4" />
              Liste des Clients
            </TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          {/* Statistiques rapides */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-xl">Aperçu des Clients</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoadingStats ? (
                <div className="flex items-center justify-center p-8">
                  <LoaderIcon className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Chargement des statistiques...</span>
                </div>
              ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Total clients</span>
                    <span className="text-2xl font-bold">{stats.totalClients}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Clients actifs</span>
                    <span className="text-2xl font-bold text-green-600">{stats.activeClients}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Clients suspendus</span>
                    <span className="text-2xl font-bold text-red-600">{stats.suspendedClients}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Nouveaux ce mois</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.newClientsThisMonth}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Impossible de charger les statistiques
                </p>
              )}
            </CardContent>
          </Card>

          {/* Filtres et recherche */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par nom, email ou ville..."
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
          {selectedClientIds.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedClientIds.length} client(s) sélectionné(s)
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

          {/* Table des clients */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoaderIcon className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Chargement des clients...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox"
                          checked={selectedClientIds.length === clients.length && clients.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Commandes</TableHead>
                      <TableHead>Total dépensé</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center p-8 text-muted-foreground">
                          Aucun client trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client: any) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <input 
                              type="checkbox"
                              checked={selectedClientIds.includes(client.id)}
                              onChange={(e) => handleClientSelection(client.id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{client.phoneNumber || 'Non renseigné'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {client.client?.city}, {client.client?.postalCode}
                              <br />
                              <span className="text-muted-foreground">{client.client?.country}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={client.status === 'ACTIVE' ? 'default' : 'destructive'}>
                              {client.status === 'ACTIVE' ? 'Actif' : 
                               client.status === 'PENDING_VERIFICATION' ? 'En attente' : 
                               client.status === 'SUSPENDED' ? 'Suspendu' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{client.stats?.totalOrders || 0}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.stats?.lastOrderDate ? (
                                `Dernière: ${formatDate(client.stats.lastOrderDate)}`
                              ) : (
                                'Aucune commande'
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(client.stats?.totalSpent || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(client.createdAt)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Link href={`/fr/admin/users/${client.id}`}>
                                <Button variant="ghost" size="sm">
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/fr/admin/users/${client.id}/edit`}>
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
          {pagination && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Affichage de {clients.length} client(s) sur {pagination.total} au total
                (Page {pagination.page} sur {pagination.totalPages})
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNext}
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
                Analyse complète des clients et de leur activité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Performance Globale</h3>
                  <div className="space-y-2">
                    {stats ? (
                      <>
                        <div className="flex justify-between">
                          <span>Chiffre d'affaires total:</span>
                          <span className="font-bold">{formatCurrency(stats.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Panier moyen:</span>
                          <span className="font-bold">{formatCurrency(stats.averageOrderValue)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Chargement...</p>
                    )}
                    <div className="flex justify-between">
                      <span>Taux de rétention:</span>
                      <span className="font-bold">85.2%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Répartition Géographique</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Paris:</span>
                      <span className="font-bold">42%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lyon:</span>
                      <span className="font-bold">18%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Marseille:</span>
                      <span className="font-bold">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Autres:</span>
                      <span className="font-bold">28%</span>
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