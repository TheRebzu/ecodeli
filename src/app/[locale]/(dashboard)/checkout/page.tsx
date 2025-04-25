"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShoppingCart,
  CreditCard,
  Loader2,
  ArrowLeft,
  Check,
} from "lucide-react";
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

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isClient, setIsClient] = useState(false);

  // État du formulaire
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
  });

  // Récupérer les détails des produits dans le panier
  const { data: productsData, isLoading } = api.order.getProducts.useQuery(
    {
      limit: 100,
    },
    {
      enabled: items.length > 0 && isClient,
    },
  );
  
  // Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true);
    
    // Redirect to cart if empty (client-side only)
    if (items.length === 0 && !isLoading) {
      router.push("/cart");
    }
  }, [items.length, isLoading, router]);

  // Mutation pour créer une commande
  const createOrder = api.order.createOrder.useMutation({
    onSuccess: (data) => {
      toast.success(t("orderSuccess"));
      clearCart();
      router.push(`/orders/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  // Calculer le total du panier
  const calculateSubtotal = () => {
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

  const subtotal = calculateSubtotal();
  const shipping = items.length > 0 ? 5 : 0;
  const tax = subtotal * 0.2;
  const total = subtotal + shipping + tax;

  // Vérifier si tous les produits sont du même commerce
  const getStoreId = () => {
    if (!productsData?.products || items.length === 0) return null;

    const storeIds = new Set();
    items.forEach((item) => {
      const product = productsData.products.find(
        (p: Product) => p.id === item.id,
      );
      if (product) {
        storeIds.add(product.storeId);
      }
    });

    if (storeIds.size !== 1) return null;
    return Array.from(storeIds)[0] as string;
  };

  // Gérer les changements dans le formulaire
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier que le panier n'est pas vide
    if (items.length === 0) {
      toast.error(t("emptyCartError"));
      return;
    }

    // Vérifier que tous les produits sont du même commerce
    const storeId = getStoreId();
    if (!storeId) {
      toast.error(t("multipleStoresError"));
      return;
    }

    setIsSubmitting(true);

    // Préparer l'adresse complète
    const shippingAddress = `${formData.fullName}\n${formData.address}\n${formData.postalCode} ${formData.city}\n${formData.phone}\n${formData.email}`;

    // Créer la commande
    createOrder.mutate({
      storeId,
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        notes: '',
      })),
      shippingAddress,
      notes: formData.notes,
    });
  };

  // Produits enrichis avec les détails
  const cartItems = items.map((item) => {
    const product = productsData?.products?.find((p: Product) => p.id === item.id);
    return {
      ...item,
      product,
    };
  });

  // If not client-side yet, show loading state
  if (!isClient) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />}>
        <DashboardHeader title={t("title")} description={t("description")} />
        <div className="container mx-auto py-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Normal render
  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <DashboardHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" onClick={() => router.push("/cart")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCart")}
          </Button>
        }
      />

      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t("shippingInformation")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t("fullName")} *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t("email")} *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("phone")} *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">{t("address")} *</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">{t("city")} *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">{t("postalCode")} *</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("orderNotes")}</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder={t("orderNotesPlaceholder")}
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t("paymentMethod")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label
                        htmlFor="card"
                        className="flex items-center cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t("creditCard")}
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  t("placeOrder")
                )}
              </Button>
            </form>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("orderSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            {item.product?.imageUrl ? (
                              <div className="h-12 w-12 rounded-md overflow-hidden relative mr-3">
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center mr-3">
                                <ShoppingCart className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {item.product?.name || t("unavailableProduct")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("quantity")}: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <p className="font-medium">
                            {item.product
                              ? `${(
                                  item.product.price * item.quantity
                                ).toFixed(2)} €`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>{t("subtotal")}</span>
                        <span>{subtotal.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("shipping")}</span>
                        <span>{shipping.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("tax")}</span>
                        <span>{tax.toFixed(2)} €</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-medium text-lg">
                      <span>{t("total")}</span>
                      <span>{total.toFixed(2)} €</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
