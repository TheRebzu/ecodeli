"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { ProductStatus } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { MerchantSidebar } from "@/components/dashboard/merchant/merchant-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Package, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Filter 
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ProductsPage() {
  const t = useTranslations("products");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // États pour la recherche et le filtrage
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedStore, setSelectedStore] = useState(searchParams.get("storeId") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | "">("");
  
  // Récupérer les commerces de l'utilisateur
  const { data: storesData, isLoading: isLoadingStores } = api.store.getMyStores.useQuery();
  
  // Récupérer les produits
  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } = 
    api.order.getProducts.useInfiniteQuery(
      {
        storeId: selectedStore || undefined,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        status: selectedStatus || undefined,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );
  
  // Mutation pour supprimer un produit
  const deleteProduct = api.order.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Gérer la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mettre à jour l'URL avec les paramètres de recherche
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedStore) params.set("storeId", selectedStore);
    if (selectedCategory) params.set("category", selectedCategory);
    
    router.push(`/merchant/products?${params.toString()}`);
    
    // Déclencher une nouvelle requête
    refetch();
  };
  
  // Gérer la suppression d'un produit
  const handleDelete = (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      deleteProduct.mutate({ id });
    }
  };
  
  // Extraire toutes les catégories uniques des produits
  const categories = data?.pages.flatMap(page => 
    page.products.map(product => product.category)
  ).filter((value, index, self) => self.indexOf(value) === index) || [];
  
  // Tous les produits de toutes les pages
  const products = data?.pages.flatMap(page => page.products) || [];
  
  // Fonction pour afficher le statut du produit
  const renderStatus = (status: ProductStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">{t("status.active")}</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">{t("status.inactive")}</Badge>;
      case "OUT_OF_STOCK":
        return <Badge variant="destructive">{t("status.outOfStock")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <DashboardLayout sidebar={<MerchantSidebar />}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <Button asChild>
            <Link href="/merchant/products/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("addProduct")}
            </Link>
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("filterProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchPlaceholder")}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  disabled={isLoadingStores}
                >
                  <option value="">{t("allStores")}</option>
                  {storesData?.stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">{t("allCategories")}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ProductStatus | "")}
                >
                  <option value="">{t("allStatuses")}</option>
                  <option value="ACTIVE">{t("status.active")}</option>
                  <option value="INACTIVE">{t("status.inactive")}</option>
                  <option value="OUT_OF_STOCK">{t("status.outOfStock")}</option>
                </select>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit">
                  <Filter className="mr-2 h-4 w-4" />
                  {t("filter")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t("productsList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>{t("error")}</p>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()} 
                  className="mt-2"
                >
                  {t("retry")}
                </Button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-lg font-medium">{t("noProducts")}</h3>
                <p className="text-muted-foreground">{t("noProductsDescription")}</p>
                <Button className="mt-4" asChild>
                  <Link href="/merchant/products/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addProduct")}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("product")}</TableHead>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("price")}</TableHead>
                        <TableHead>{t("store")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              {product.imageUrl ? (
                                <div className="h-10 w-10 rounded-md overflow-hidden relative">
                                  <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                              <span>{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.price.toFixed(2)} €</TableCell>
                          <TableCell>{product.store.name}</TableCell>
                          <TableCell>{renderStatus(product.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">{t("openMenu")}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/merchant/products/${product.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t("view")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/merchant/products/${product.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t("edit")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {hasNextPage && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                    >
                      {t("loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
