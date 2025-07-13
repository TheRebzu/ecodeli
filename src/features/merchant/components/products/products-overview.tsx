"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/features/merchant/hooks/use-products";

export function ProductsOverview() {
  const t = useTranslations("merchant.products");
  const { products, isLoading, stats } = useProducts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/merchant/products/add">
              <Plus className="mr-2 h-4 w-4" />
              {t("addProduct")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/merchant/products/import">{t("importBulk")}</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalProducts")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.activeProducts")}: {stats?.activeProducts || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.lowStock")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lowStockProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.needsRestock")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalValue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{stats?.totalValue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.inventoryValue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.categories")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.categories || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.uniqueCategories")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentProducts")}</CardTitle>
          <CardDescription>{t("recentProductsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="space-y-4">
              {products.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • Stock: {product.stockQuantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      €{product.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {product.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              ))}
              {products.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild>
                    <Link href="/merchant/products/list">
                      {t("viewAllProducts")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">{t("noProducts")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("noProductsDescription")}
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/merchant/products/add">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addFirstProduct")}
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
