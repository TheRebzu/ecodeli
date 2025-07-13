"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Upload, X, Package } from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/features/merchant/hooks/use-products";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  originalPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().min(0).optional(),
  stockQuantity: z.number().min(0, "Stock quantity must be positive"),
  minStockAlert: z.number().min(0, "Minimum stock alert must be positive"),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductEditFormProps {
  productId: string;
}

export function ProductEditForm({ productId }: ProductEditFormProps) {
  const t = useTranslations("merchant.products");
  const router = useRouter();
  const { updateProduct } = useProducts();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const watchedTags = watch("tags", []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/merchant/products/${productId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch product");
        }

        const product = await response.json();

        // Set form values
        reset({
          name: product.name,
          description: product.description || "",
          price: product.price,
          originalPrice: product.originalPrice || undefined,
          sku: product.sku || "",
          category: product.category || "",
          brand: product.brand || "",
          weight: product.weight || undefined,
          stockQuantity: product.stockQuantity,
          minStockAlert: product.minStockAlert,
          isActive: product.isActive,
          tags: product.tags || [],
        });

        setImages(product.images || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true);
      await updateProduct(productId, {
        ...data,
        images,
        dimensions: null, // TODO: Add dimensions form
        metadata: null, // TODO: Add metadata form
      });
      router.push(`/merchant/products/${productId}`);
    } catch (error) {
      console.error("Error updating product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // TODO: Implement actual image upload to server
      const newImages = Array.from(files).map((file) =>
        URL.createObjectURL(file),
      );
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue("tags", [...watchedTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue(
      "tags",
      watchedTags.filter((tag) => tag !== tagToRemove),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium">Error loading product</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/merchant/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href={`/merchant/products/${productId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("edit.back")}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("edit.title")}
            </h1>
            <p className="text-muted-foreground">{t("edit.description")}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("edit.basicInfo")}</CardTitle>
              <CardDescription>
                {t("edit.basicInfoDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("edit.name")} *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder={t("edit.namePlaceholder")}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("edit.description")}</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder={t("edit.descriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t("edit.price")} *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register("price", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-600">
                      {errors.price.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice">
                    {t("edit.originalPrice")}
                  </Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    {...register("originalPrice", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">{t("edit.sku")}</Label>
                  <Input
                    id="sku"
                    {...register("sku")}
                    placeholder={t("edit.skuPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">{t("edit.brand")}</Label>
                  <Input
                    id="brand"
                    {...register("brand")}
                    placeholder={t("edit.brandPlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t("edit.category")}</Label>
                <Input
                  id="category"
                  {...register("category")}
                  placeholder={t("edit.categoryPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory & Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("edit.inventory")}</CardTitle>
              <CardDescription>
                {t("edit.inventoryDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">
                    {t("edit.stockQuantity")} *
                  </Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    {...register("stockQuantity", { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.stockQuantity && (
                    <p className="text-sm text-red-600">
                      {errors.stockQuantity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStockAlert">
                    {t("edit.minStockAlert")} *
                  </Label>
                  <Input
                    id="minStockAlert"
                    type="number"
                    {...register("minStockAlert", { valueAsNumber: true })}
                    placeholder="5"
                  />
                  {errors.minStockAlert && (
                    <p className="text-sm text-red-600">
                      {errors.minStockAlert.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">{t("edit.weight")} (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register("weight", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch("isActive")}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">{t("edit.isActive")}</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t("edit.images")}</CardTitle>
            <CardDescription>{t("edit.imagesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-2 border-dashed border-muted-foreground rounded-lg p-4 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("edit.uploadImage")}
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>{t("edit.tags")}</CardTitle>
            <CardDescription>{t("edit.tagsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={t("edit.tagPlaceholder")}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
              />
              <Button type="button" onClick={addTag}>
                {t("edit.addTag")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchedTags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/merchant/products/${productId}`}>
              {t("edit.cancel")}
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? t("edit.saving") : t("edit.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
