"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  RefreshCw,
  Upload,
  Download,
  BarChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Tag,
  Camera
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Types pour les produits
enum ProductStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  DISCONTINUED = "DISCONTINUED"
}

enum ProductCategory {
  FOOD = "FOOD",
  ELECTRONICS = "ELECTRONICS",
  CLOTHING = "CLOTHING",
  HOME = "HOME",
  BEAUTY = "BEAUTY",
  SPORTS = "SPORTS",
  OTHER = "OTHER"
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  compareAtPrice?: number;
  sku: string;
  barcode?: string;
  stock: number;
  minStock: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images: string[];
  tags: string[];
  isDigital: boolean;
  requiresShipping: boolean;
  taxable: boolean;
  soldCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductManagerProps {
  className?: string;
  onProductSelect?: (product: Product) => void;
  onProductCreate?: () => void;
  showActions?: boolean;
}

export default function ProductManager({ 
  className,
  onProductSelect,
  onProductCreate,
  showActions = true
}: ProductManagerProps) {
  const t = useTranslations("merchant.products");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState("list");

  // Récupération des produits via tRPC
  const { 
    data: products, 
    isLoading, 
    error,
    refetch 
  } = api.merchant.products.getMyProducts.useQuery({
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });

  // Récupération des statistiques
  const { data: stats } = api.merchant.products.getProductStats.useQuery();

  // Mutations pour gérer les produits
  const updateStatusMutation = api.merchant.products.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Statut mis à jour",
        description: "Le statut du produit a été mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de mise à jour",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = api.merchant.products.deleteProduct.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = api.merchant.products.bulkUpdate.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedProducts([]);
      toast({
        title: "Mise à jour en lot réussie",
        description: "Les produits sélectionnés ont été mis à jour",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de mise à jour en lot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case ProductStatus.INACTIVE:
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case ProductStatus.OUT_OF_STOCK:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case ProductStatus.DISCONTINUED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ProductStatus) => {
    const variants = {
      [ProductStatus.ACTIVE]: "default",
      [ProductStatus.INACTIVE]: "secondary",
      [ProductStatus.OUT_OF_STOCK]: "destructive",
      [ProductStatus.DISCONTINUED]: "outline",
    } as const;

    const labels = {
      [ProductStatus.ACTIVE]: "Actif",
      [ProductStatus.INACTIVE]: "Inactif",
      [ProductStatus.OUT_OF_STOCK]: "Rupture de stock",
      [ProductStatus.DISCONTINUED]: "Arrêté",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status]}
      </Badge>
    );
  };

  const getCategoryLabel = (category: ProductCategory) => {
    const labels = {
      [ProductCategory.FOOD]: "Alimentaire",
      [ProductCategory.ELECTRONICS]: "Électronique",
      [ProductCategory.CLOTHING]: "Vêtements",
      [ProductCategory.HOME]: "Maison",
      [ProductCategory.BEAUTY]: "Beauté",
      [ProductCategory.SPORTS]: "Sport",
      [ProductCategory.OTHER]: "Autre",
    };
    return labels[category];
  };

  const handleStatusUpdate = (productId: string, newStatus: ProductStatus) => {
    updateStatusMutation.mutate({ productId, status: newStatus });
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      deleteProductMutation.mutate({ productId });
    }
  };

  const handleBulkAction = (action: string, value?: string) => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Aucun produit sélectionné",
        description: "Veuillez sélectionner au moins un produit",
        variant: "destructive",
      });
      return;
    }

    bulkUpdateMutation.mutate({
      productIds: selectedProducts,
      action,
      value,
    });
  };

  const filteredProducts = products?.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des produits: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestionnaire de Produits</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de produits et leur inventaire
          </p>
        </div>
        {showActions && onProductCreate && (
          <Button onClick={onProductCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau produit
          </Button>
        )}
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total produits</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.active}</div>
                  <div className="text-xs text-muted-foreground">Actifs</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.lowStock}</div>
                  <div className="text-xs text-muted-foreground">Stock faible</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalValue.toFixed(0)}€</div>
                  <div className="text-xs text-muted-foreground">Valeur stock</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList>
          <TabsTrigger value="list">Liste des produits</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filtres et recherche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtres et recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Nom, SKU, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProductStatus | "all")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value={ProductStatus.ACTIVE}>Actif</SelectItem>
                      <SelectItem value={ProductStatus.INACTIVE}>Inactif</SelectItem>
                      <SelectItem value={ProductStatus.OUT_OF_STOCK}>Rupture de stock</SelectItem>
                      <SelectItem value={ProductStatus.DISCONTINUED}>Arrêté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ProductCategory | "all")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {Object.values(ProductCategory).map(category => (
                        <SelectItem key={category} value={category}>
                          {getCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Actions</Label>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                    Actualiser
                  </Button>
                </div>
              </div>

              {/* Actions en lot */}
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {selectedProducts.length} produit(s) sélectionné(s)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("activate")}
                    disabled={bulkUpdateMutation.isLoading}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Activer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("deactivate")}
                    disabled={bulkUpdateMutation.isLoading}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Désactiver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("delete")}
                    disabled={bulkUpdateMutation.isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liste des produits */}
          <Card>
            <CardHeader>
              <CardTitle>Produits ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Chargement des produits...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun produit</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore de produits correspondant aux critères de recherche.
                  </p>
                  {onProductCreate && (
                    <Button onClick={onProductCreate}>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer votre premier produit
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedProducts.length === filteredProducts.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts(filteredProducts.map(product => product.id));
                              } else {
                                setSelectedProducts([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Ventes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow 
                          key={product.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            onProductSelect && "cursor-pointer"
                          )}
                          onClick={() => onProductSelect?.(product)}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedProducts([...selectedProducts, product.id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                {product.images.length > 0 ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                ) : (
                                  <Camera className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(product.status)}
                                  <span className="font-medium">{product.name}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  SKU: {product.sku}
                                </div>
                                {product.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {product.tags.slice(0, 2).map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {product.tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{product.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getCategoryLabel(product.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{product.price.toFixed(2)}€</div>
                              {product.compareAtPrice && product.compareAtPrice > product.price && (
                                <div className="text-sm text-muted-foreground line-through">
                                  {product.compareAtPrice.toFixed(2)}€
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={cn(
                              "font-medium",
                              product.stock <= product.minStock ? "text-red-500" : "text-foreground"
                            )}>
                              {product.stock}
                              {product.stock <= product.minStock && (
                                <AlertTriangle className="w-3 h-3 inline ml-1" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(product.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-green-500" />
                              <span>{product.soldCount}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Logique pour voir le produit
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Logique pour modifier le produit
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                                disabled={deleteProductMutation.isLoading}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Analyses des produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Analyses détaillées</h3>
                <p className="text-muted-foreground">
                  Consultez les performances de vos produits et les tendances de vente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import / Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-medium">Importer des produits</h3>
                  <p className="text-sm text-muted-foreground">
                    Importez vos produits depuis un fichier CSV ou Excel
                  </p>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer un fichier
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Exporter des produits</h3>
                  <p className="text-sm text-muted-foreground">
                    Exportez votre catalogue au format CSV ou Excel
                  </p>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter le catalogue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
