"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShoppingCart, CreditCard, Loader2, ArrowLeft, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  
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
      enabled: cart.items.length > 0,
    }
  );
  
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
    
    return cart.items.reduce((total, item) => {
      const product = productsData.products.find(p => p.id === item.productId);
      if (product) {
        return total + (product.price * item.quantity);
      }
      return total;
    }, 0);
  };
  
  const subtotal = calculateSubtotal();
  const shipping = cart.items.length > 0 ? 5 : 0;
  const tax = subtotal * 0.2;
  const total = subtotal + shipping + tax;
  
  // Vérifier si tous les produits sont du même commerce
  const getStoreId = () => {
    if (!productsData?.products || cart.items.length === 0) return null;
    
    const storeIds = new Set();
    cart.items.forEach(item => {
      const product = productsData.products.find(p => p.id === item.productId);
      if (product) {
        storeIds.add(product.storeId);
      }
    });
    
    if (storeIds.size !== 1) return null;
    return Array.from(storeIds)[0] as string;
  };
  
  // Gérer les changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier que le panier n'est pas vide
    if (cart.items.length === 0) {
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
      items: cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
      shippingAddress,
      notes: formData.notes,
    });
  };
  
  // Produits enrichis avec les détails
  const cartItems = cart.items.map(item => {
    const product = productsData?.products.find(p => p.id === item.productId);
    return {
      ...item,
      product,
    };
  });
  
  // Rediriger vers le panier si vide
  if (cart.items.length === 0 && !isLoading) {
    router.push("/cart");
    return null;
  }
  
  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCart")}
          </Button>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
        </div>
        
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
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder={t("orderNotesPlaceholder")}
                      rows={3}
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
                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        {t("creditCard")}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">{t("cashOnDelivery")}</Label>
                    </div>
                  </RadioGroup>
                  
                  {paymentMethod === "card" && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        {t("demoPaymentNotice")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("placeOrder")}
                  </>
                )}
              </Button>
            </form>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("orderSummary")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div 
                          key={item.productId} 
                          className="flex items-center space-x-3"
                        >
                          {item.product?.imageUrl ? (
                            <div className="h-12 w-12 rounded-md overflow-hidden relative flex-shrink-0">
                              <Image
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <ShoppingCart className="h-6 w-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {item.product?.name || t("unavailableProduct")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("quantity")}: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            {item.product ? `${(item.product.price * item.quantity).toFixed(2)} €` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("subtotal")}</span>
                        <span>{subtotal.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("shipping")}</span>
                        <span>{shipping.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("tax")}</span>
                        <span>{tax.toFixed(2)} €</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-medium">
                        <span>{t("total")}</span>
                        <span>{total.toFixed(2)} €</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/cart">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("editCart")}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
