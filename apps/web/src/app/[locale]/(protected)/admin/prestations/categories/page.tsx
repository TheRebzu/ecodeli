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
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Tag,
  Package,
  Users,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  servicesCount: number;
  isActive: boolean;
  createdAt: Date;
}

export default function ServiceCategoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Package',
  });
  
  const { toast } = useToast();

  // Récupérer les catégories via tRPC
  const { data: categoriesData, isLoading, refetch } = api.admin.services.categories.getAll.useQuery();
  
  const createCategoryMutation = api.admin.services.categories.create.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Catégorie créée',
        description: `La catégorie "${formData.name}" a été créée avec succès.`,
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', color: '#3B82F6', icon: 'Package' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCategoryMutation = api.admin.services.categories.update.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Catégorie modifiée',
        description: `La catégorie "${formData.name}" a été modifiée avec succès.`,
      });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setFormData({ name: '', description: '', color: '#3B82F6', icon: 'Package' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCategoryMutation = api.admin.services.categories.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Catégorie supprimée',
        description: 'La catégorie a été supprimée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = api.admin.services.categories.toggleStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: 'Statut modifié',
        description: 'Le statut de la catégorie a été modifié avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const categories = categoriesData?.categories || [];

  // Filtrer les catégories
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCategories = filteredCategories.length;
  const activeCategories = filteredCategories.filter(c => c.isActive).length;
  const totalServices = filteredCategories.reduce((acc, c) => acc + c.servicesCount, 0);

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge> :
      <Badge variant="secondary">Inactive</Badge>;
  };

  const handleCreateCategory = () => {
    createCategoryMutation.mutate({
      name: formData.name,
      description: formData.description,
      color: formData.color,
      icon: formData.icon,
    });
  };

  const handleEditCategory = () => {
    if (!selectedCategory) return;
    
    updateCategoryMutation.mutate({
      id: selectedCategory.id,
      name: formData.name,
      description: formData.description,
      color: formData.color,
      icon: formData.icon,
    });
  };

  const handleDeleteCategory = (category: ServiceCategory) => {
    if (category.servicesCount > 0) {
      toast({
        title: 'Impossible de supprimer',
        description: 'Cette catégorie contient des services. Veuillez d\'abord les déplacer ou les supprimer.',
        variant: 'destructive',
      });
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      deleteCategoryMutation.mutate({ id: category.id });
    }
  };

  const handleToggleStatus = (category: ServiceCategory) => {
    toggleStatusMutation.mutate({
      id: category.id,
      isActive: !category.isActive,
    });
  };

  const openEditDialog = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Chargement des catégories...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catégories de Services</h1>
          <p className="text-muted-foreground">
            Gérez les catégories pour organiser vos services
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle catégorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle catégorie</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle catégorie pour organiser vos services.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom de la catégorie</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Livraison, Nettoyage..."
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez cette catégorie de services..."
                />
              </div>
              <div>
                <Label htmlFor="color">Couleur</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="icon">Icône</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Ex: Package, Truck, Sparkles..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateCategory}
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Catégories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {activeCategories} actives
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">
              Répartis dans toutes les catégories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories Actives</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">
              {totalCategories > 0 ? Math.round((activeCategories / totalCategories) * 100) : 0}% du total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne Services</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCategories > 0 ? Math.round(totalServices / totalCategories) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Services par catégorie
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recherche et filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher des catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tableau des catégories */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des catégories</CardTitle>
          <CardDescription>
            Gérez vos catégories de services et leur organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {category.icon}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {category.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {category.servicesCount} services
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(category.isActive)}
                  </TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(new Date(category.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(category)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(category)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {category.isActive ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteCategory(category)}
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
        </CardContent>
      </Card>

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
            <DialogDescription>
              Modifiez les informations de cette catégorie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom de la catégorie</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Livraison, Nettoyage..."
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez cette catégorie de services..."
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Couleur</Label>
              <Input
                id="edit-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-icon">Icône</Label>
              <Input
                id="edit-icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Ex: Package, Truck, Sparkles..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleEditCategory}
              disabled={updateCategoryMutation.isPending}
            >
              {updateCategoryMutation.isPending ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
