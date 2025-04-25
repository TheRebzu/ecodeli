"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DashboardLayout, DashboardHeader } from "@/components/dashboard/dashboard-layout";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";

// Définition du type Product pour éviter les erreurs de type implicite
interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  storeId: string;
  store: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export default function CartPage() {
  const t = useTranslations("cart");
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Récupérer les détails des produits dans le panier
  const { data: productsData, isLoading } = api.order.getProducts.useQuery(
    {
      limit: 100,
    },
    {
      enabled: items.length > 0,
    },
  );

  // Calculer le total du panier
  const calculateTotal = () => {
    if (!productsData?.products) return 0;

    return items.reduce((total, item) => {
      const product = productsData.products.find(
        (p: Product) => p.id === item.id,
      );
      if (product) {
        return total + product.price * item.quantity;
      }
      return total;
    }, 0);
  };

  // Vérifier si tous les produits sont du même commerce
  const isSingleStore = () => {
    if (!productsData?.products || items.length === 0) return true;

    const storeIds = new Set();
    items.forEach((item) => {
      const product = productsData.products.find(
        (p: Product) => p.id === item.id,
      );
      if (product) {
        storeIds.add(product.storeId);
      }
    });

    return storeIds.size === 1;
  };

  // Gérer le processus de checkout
  const handleCheckout = () => {
    if (!isSingleStore()) {
      toast.error(t("multipleStoresError"));
      return;
    }

    setIsCheckingOut(true);
    router.push("/checkout");
  };

  // Produits enrichis avec les détails
  const cartItems = items.map((item) => {
    const product = productsData?.products.find((p: Product) => p.id === item.id);
    return {
      ...item,
      product,
    };
  });

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <DashboardHeader 
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            {t("continueShopping")}
          </Button>
        }
      />

      <div className="container mx-auto py-6">
        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <h2 className="text-xl font-medium mb-2">{t("emptyCart")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("emptyCartDescription")}
              </p>
              <Button asChild>
                <Link href="/stores">{t("browseStores")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("cartItems", { count: items.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between border-b pb-4"
                        >
                          <div className="flex items-center space-x-4">
                            {item.product?.imageUrl ? (
                              <div className="h-16 w-16 rounded-md overflow-hidden relative">
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                                <ShoppingCart className="h-8 w-8" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium">
                                {item.product?.name || t("unavailableProduct")}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {item.product?.store.name || ""}
                              </p>
                              <p className="text-sm font-medium">
                                {item.product
                                  ? `${item.product.price.toFixed(2)} €`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    Math.max(1, item.quantity - 1),
                                  )
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity + 1,
                                  )
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="w-20 text-right font-medium">
                              {item.product
                                ? `${(item.product.price * item.quantity).toFixed(2)} €`
                                : ""}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => clearCart()}>
                    {t("clearCart")}
                  </Button>
                  <Button asChild>
                    <Link href="/stores">{t("addMoreItems")}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("orderSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t("subtotal")}</span>
                    <span>{calculateTotal().toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("shipping")}</span>
                    <span>{items.length > 0 ? "5.00 €" : "0.00 €"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("tax")}</span>
                    <span>{(calculateTotal() * 0.2).toFixed(2)} €</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between font-medium">
                    <span>{t("total")}</span>
                    <span>
                      {(
                        calculateTotal() +
                        (items.length > 0 ? 5 : 0) +
                        calculateTotal() * 0.2
                      ).toFixed(2)}{" "}
                      €
                    </span>
                  </div>

                  {!isSingleStore() && (
                    <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 mt-4">
                      {t("multipleStoresWarning")}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={items.length === 0 || isCheckingOut || !isSingleStore()}
                  >
                    {t("proceedToCheckout")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
