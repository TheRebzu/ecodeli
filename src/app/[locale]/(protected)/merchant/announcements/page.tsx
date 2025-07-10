"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Package,
  Upload,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMerchantAnnouncements } from '@/features/merchant/hooks/use-merchant-announcements';
import { useTranslations } from 'next-intl';

interface MerchantAnnouncement {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  views: number;
  orders: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-yellow-100 text-yellow-800',
  ARCHIVED: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ARCHIVED: 'Archivée'
};

const TYPE_LABELS = {
  PACKAGE_DELIVERY: 'Livraison de colis',
  PERSON_TRANSPORT: 'Transport de personne',
  AIRPORT_TRANSFER: 'Transfert aéroport',
  SHOPPING: 'Course',
  INTERNATIONAL_PURCHASE: 'Achat international',
  CART_DROP: 'Lâcher de chariot'
};

export default function MerchantAnnouncementsPage() {
  const t = useTranslations('merchant.announcements');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, stats, loading, error, refreshData } = useMerchantAnnouncements({
    page: currentPage,
    limit: 10,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    search: searchQuery || undefined
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} variant="outline">
          Réessayer
        </Button>
      </div>
    );
    }

  if (!data || !stats) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Aucune donnée disponible</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { announcements, totalPages } = data;



  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: { variant: 'default' as const, text: 'Active', icon: CheckCircle },
      INACTIVE: { variant: 'secondary' as const, text: 'Inactive', icon: Clock },
      ARCHIVED: { variant: 'outline' as const, text: 'Archivée', icon: AlertCircle }
    }
    return variants[status as keyof typeof variants] || variants.INACTIVE;
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      PACKAGE_DELIVERY: 'Livraison colis',
      PERSON_TRANSPORT: 'Transport de personne',
      AIRPORT_TRANSFER: 'Transfert aéroport',
      SHOPPING: 'Course',
      INTERNATIONAL_PURCHASE: 'Achat international',
      CART_DROP: 'Lâcher de chariot'
    }
    return labels[type as keyof typeof labels] || type;
  }



  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Annonces</h1>
          <p className="text-muted-foreground">
            Gérez vos annonces et services proposés sur EcoDeli
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/merchant/announcements/bulk">
              <Upload className="h-4 w-4 mr-2" />
              Import en masse
            </Link>
          </Button>
          <Button asChild>
          <Link href="/merchant/announcements/create">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle annonce
            </Link>
            </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annonces actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sur {stats.total || 0} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vues totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalViews || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% ce mois
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prix moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.averagePrice || 0).toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Prix moyen des annonces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annonces terminées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Succès → Livraisons
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Liste des annonces</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="categories">Par catégorie</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
      {/* Filtres et recherche */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une annonce..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <SelectItem key={status} value={status}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Réinitialiser
            </Button>
          </div>

      {/* Liste des annonces */}
            <div className="space-y-4">
            {announcements.map((announcement: any) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                        <Badge variant="outline">{getTypeLabel(announcement.type)}</Badge>
                        <Badge variant={getStatusBadge(announcement.status).variant}>
                          {getStatusBadge(announcement.status).text}
                          </Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">{announcement.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Prix</p>
                          <p className="font-medium">{(announcement.price || 0).toFixed(2)}€</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vues</p>
                          <p className="font-medium">{announcement.views || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Commandes</p>
                          <p className="font-medium">{announcement.orders || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                          </Button>
                            <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                            </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshData()}
                      >
                        <Trash2 className="h-4 w-4" />
                            </Button>
                    </div>
                      </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {announcements.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune annonce trouvée</h3>
                <p className="text-muted-foreground mb-4">
                  Aucune annonce ne correspond à vos critères de recherche.
                </p>
                <Button asChild>
                  <Link href="/merchant/announcements/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer votre première annonce
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance par type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lâcher de chariot</span>
                    <span className="font-medium">45% conversions</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full w-[45%]"></div>
                  </div>
                </div>
        </CardContent>
      </Card>

            <Card>
              <CardHeader>
                <CardTitle>Évolution mensuelle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Graphique des performances sur 12 mois
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Artisanat', 'Alimentation', 'Mobilier'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                                  <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Annonces</span>
                    <span className="font-medium">
                      {announcements.filter((a: any) => a.type === category).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Commandes</span>
                    <span className="font-medium">
                      {announcements
                        .filter((a: any) => a.type === category)
                        .reduce((sum: any, a: any) => sum + (a.orders || 0), 0)}
                    </span>
                  </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}