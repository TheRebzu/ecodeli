"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";

// Icons
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Star,
  Euro,
  BarChart3,
  Filter} from "lucide-react";

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  minimumStock: number;
  category: {
    id: string;
    name: string;
  };
  images: string[];
  isActive: boolean;
  createdAt: string;
  sales?: {
    totalSold: number;
    revenue: number;
    trend: number;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  productCount: number;
}

// Composant carte produit
const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onView}: {
  product: Product;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}) => {
  const isLowStock = product.stockQuantity <= product.minimumStock;
  const isOutOfStock = product.stockQuantity === 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-sm mb-1 line-clamp-2">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {product.description}
            </p>
            <Badge
              variant={
                isOutOfStock
                  ? "destructive"
                  : isLowStock
                    ? "secondary"
                    : "default"
              }
              className="text-xs"
            >
              {product.category.name}
            </Badge>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{product.price}€</p>
            <p
              className={`text-xs ${
                isOutOfStock
                  ? "text-red-600"
                  : isLowStock
                    ? "text-orange-600"
                    : "text-green-600"
              }`}
            >
              {product.stockQuantity} en stock
            </p>
          </div>
        </div>

        {/* Alertes stock */}
        {(isOutOfStock || isLowStock) && (
          <div
            className={`flex items-center gap-2 p-2 rounded mb-3 text-xs ${
              isOutOfStock
                ? "bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-200"
                : "bg-orange-50 text-orange-800 dark:bg-orange-950/20 dark:text-orange-200"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>{isOutOfStock ? "Rupture de stock" : "Stock faible"}</span>
          </div>
        )}

        {/* Statistiques ventes */}
        {product.sales && (
          <div className="border-t pt-3 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Vendus:</span>
              <span className="font-medium">{product.sales.totalSold}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CA:</span>
              <span className="font-medium">{product.sales.revenue}€</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tendance:</span>
              <span
                className={`font-medium flex items-center gap-1 ${
                  product.sales.trend >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {product.sales.trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {product.sales.trend}%
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(product.id)}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(product.id)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(product.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant carte catégorie
const CategoryCard = ({
  category,
  onSelect}: {
  category: Category;
  onSelect: (id: string) => void;
}) => (
  <Card
    className="hover:shadow-md cursor-pointer transition-shadow"
    onClick={() => onSelect(category.id)}
  >
    <CardContent className="p-4">
      <h3 className="font-medium mb-2">{category.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">
        {category.description}
      </p>
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{category.productCount} produits</Badge>
        <Button size="sm" variant="ghost">
          Voir
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function CatalogPage() {
  const t = useTranslations("merchant.catalog");
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("products");

  // Récupérer les données
  const {
    data: products,
    isLoading: isLoadingProducts,
    refetch: refetchProducts} = api.merchant.catalog.getProducts.useQuery({ search: searchQuery || undefined,
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    sortBy,
    stockStatus: stockFilter !== "all" ? stockFilter : undefined });

  const { data: categories, isLoading: isLoadingCategories } =
    api.merchant.catalog.getCategories.useQuery();

  const { data } = api.merchant.catalog.getStats.useQuery();

  // Actions
  const handleCreateProduct = () => {
    router.push("/merchant/catalog/create");
  };

  const handleEditProduct = (productId: string) => {
    router.push(`/merchant/catalog/${productId}/edit`);
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/merchant/catalog/${productId}`);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      // Implémentation de la suppression
      console.log("Supprimer produit:", productId);
    }
  };

  const handleCreateCategory = () => {
    router.push("/merchant/catalog/categories/create");
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setActiveTab("products");
  };

  const filteredProducts = products?.filter((product) => {
    if (
      searchQuery &&
      !product.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (
      selectedCategory !== "all" &&
      product.category.id !== selectedCategory
    ) {
      return false;
    }
    if (stockFilter === "low" && product.stockQuantity > product.minimumStock) {
      return false;
    }
    if (stockFilter === "out" && product.stockQuantity > 0) {
      return false;
    }
    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalogue</h1>
          <p className="text-muted-foreground">
            Gérez vos produits et catégories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Catégorie
          </Button>
          <Button onClick={handleCreateProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Produit
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {catalogStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total produits
                  </p>
                  <p className="text-2xl font-bold">
                    {catalogStats.totalProducts}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock faible</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {catalogStats.lowStockCount}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valeur stock</p>
                  <p className="text-2xl font-bold">
                    {catalogStats.stockValue}€
                  </p>
                </div>
                <Euro className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Top ventes</p>
                  <p className="text-2xl font-bold">
                    {catalogStats.topSellingCount}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher des produits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="low">Stock faible</SelectItem>
                <SelectItem value="out">Rupture</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="price">Prix</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="sales">Ventes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">
            Produits ({ filteredProducts?.length || 0 })
          </TabsTrigger>
          <TabsTrigger value="categories">
            Catégories ({ categories?.length || 0 })
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onView={handleViewProduct}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground opacity-25 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Aucun produit trouvé
                </h3>
                <p className="text-muted-foreground mb-6 text-center">
                  {searchQuery || selectedCategory !== "all"
                    ? "Essayez de modifier vos filtres"
                    : "Commencez par ajouter votre premier produit"}
                </p>
                <Button onClick={handleCreateProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un produit
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {isLoadingCategories ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onSelect={handleSelectCategory}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground opacity-25 mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune catégorie</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  Organisez vos produits en créant des catégories
                </p>
                <Button onClick={handleCreateCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une catégorie
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance des produits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics détaillés en cours de développement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendances de stock</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Alertes et prédictions de stock
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
