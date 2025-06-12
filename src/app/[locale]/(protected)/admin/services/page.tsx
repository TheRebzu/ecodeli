'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Briefcase,
  Users,
  Star,
  MapPin,
} from 'lucide-react';
import { Link } from '@/navigation';
import { useToast } from '@/components/ui/use-toast';

type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SUSPENDED';
type ServiceCategory = 'DELIVERY' | 'CLEANING' | 'MAINTENANCE' | 'REPAIR' | 'OTHER';

export default function AdminServicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'ALL'>('ALL');
  const { toast } = useToast();

  // Récupérer les services via tRPC
  const {
    data: servicesData,
    isLoading,
    error,
    refetch,
  } = api.admin.services.getAll.useQuery({
    search: searchTerm,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
    page: 1,
    limit: 50,
  });

  // Mutations pour les actions CRUD
  const deleteServiceMutation = api.admin.services.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Service supprimé',
        description: 'Le service a été supprimé avec succès.',
      });
      refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const updateServiceStatusMutation = api.admin.services.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du service a été mis à jour.',
      });
      refetch();
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Actif
          </Badge>
        );
      case 'INACTIVE':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'DRAFT':
        return <Badge variant="outline">Brouillon</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">Suspendu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: ServiceCategory) => {
    const labels = {
      DELIVERY: 'Livraison',
      CLEANING: 'Nettoyage',
      MAINTENANCE: 'Maintenance',
      REPAIR: 'Réparation',
      OTHER: 'Autre',
    };
    return labels[category] || category;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      deleteServiceMutation.mutate({ id: serviceId });
    }
  };

  const handleToggleStatus = (serviceId: string, currentStatus: ServiceStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateServiceStatusMutation.mutate({
      id: serviceId,
      status: newStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Chargement des services...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-red-500">Erreur lors du chargement des services.</div>
      </div>
    );
  }

  const services = servicesData?.services || [];
  const totalServices = servicesData?.total || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Services</h1>
          <p className="text-muted-foreground">
            Gérez tous les services disponibles sur la plateforme
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/services/create">
            <Plus className="mr-2 h-4 w-4" />
            Créer un service
          </Link>
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services actifs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total services</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.length > 0
                ? (services.reduce((acc, s) => acc + (s.rating || 0), 0) / services.length).toFixed(
                    1
                  )
                : '0.0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(services.map(s => s.category)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un service..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={value => setStatusFilter(value as ServiceStatus | 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="INACTIVE">Inactif</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="SUSPENDED">Suspendu</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={value => setCategoryFilter(value as ServiceCategory | 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes catégories</SelectItem>
                <SelectItem value="DELIVERY">Livraison</SelectItem>
                <SelectItem value="CLEANING">Nettoyage</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="REPAIR">Réparation</SelectItem>
                <SelectItem value="OTHER">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des services */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Services ({totalServices})</CardTitle>
          <CardDescription>Gérez et modifiez tous les services disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map(service => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {service.description?.substring(0, 60)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(service.category)}</Badge>
                  </TableCell>
                  <TableCell>{formatPrice(service.price)}</TableCell>
                  <TableCell>{getStatusBadge(service.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {service.rating?.toFixed(1) || '0.0'}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(service.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/services/${service.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/services/${service.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(service.id, service.status)}
                        >
                          {service.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {services.length === 0 && (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Aucun service</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aucun service ne correspond à vos critères de recherche.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/admin/services/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer le premier service
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
