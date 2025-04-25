"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { ProductStatus } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { MerchantSidebar } from "@/components/dashboard/merchant/merchant-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

export default function CreateProductPage() {
  const t = useTranslations("products");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer les commerces de l'utilisateur
  const { data: storesData, isLoading: isLoadingStores } =
    api.store.getMyStores.useQuery();

  // Mutation pour créer un produit
  const createProduct = api.order.createProduct.useMutation({
    onSuccess: () => {
      toast.success(t("createSuccess"));
      router.push("/merchant/products");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    category: "",
    sku: "",
    barcode: "",
    weight: "",
    dimensions: "",
    stockQuantity: "",
    storeId: "",
  });

  // Gérer les changements dans le formulaire
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Gérer la sélection du commerce
  const handleStoreChange = (value: string) => {
    setFormData((prev) => ({ ...prev, storeId: value }));
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Convertir les valeurs numériques
    const price = parseFloat(formData.price);
    const weight = formData.weight ? parseFloat(formData.weight) : undefined;
    const stockQuantity = formData.stockQuantity
      ? parseInt(formData.stockQuantity, 10)
      : undefined;

    // Valider les données
    if (isNaN(price) || price <= 0) {
      toast.error(t("invalidPrice"));
      setIsSubmitting(false);
      return;
    }

    if (formData.weight && (isNaN(weight!) || weight! <= 0)) {
      toast.error(t("invalidWeight"));
      setIsSubmitting(false);
      return;
    }

    if (
      formData.stockQuantity &&
      (isNaN(stockQuantity!) || stockQuantity! < 0)
    ) {
      toast.error(t("invalidStock"));
      setIsSubmitting(false);
      return;
    }

    // Créer le produit
    createProduct.mutate({
      name: formData.name,
      description: formData.description,
      price,
      imageUrl: formData.imageUrl || undefined,
      category: formData.category,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      weight: weight,
      dimensions: formData.dimensions || undefined,
      stockQuantity,
      storeId: formData.storeId,
    });
  };

  return (
    <DashboardLayout sidebar={<MerchantSidebar />}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t("createProduct")}</h1>
          <Button variant="outline" onClick={() => router.back()}>
            {t("back")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("productDetails")}</CardTitle>
            <CardDescription>{t("productDetailsDescription")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("name")} *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">{t("price")} (€) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("description")} *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t("category")} *</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeId">{t("store")} *</Label>
                  <Select
                    value={formData.storeId}
                    onValueChange={handleStoreChange}
                    disabled={isLoadingStores}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectStore")} />
                    </SelectTrigger>
                    <SelectContent>
                      {storesData?.stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">{t("imageUrl")}</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">{t("sku")}</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">{t("barcode")}</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">{t("stockQuantity")}</Label>
                  <Input
                    id="stockQuantity"
                    name="stockQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">{t("weight")} (g)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weight}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dimensions">
                    {t("dimensions")} (LxWxH cm)
                  </Label>
                  <Input
                    id="dimensions"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    placeholder="10x5x2"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("createProduct")}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
