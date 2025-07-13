"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ProductForm } from "./ProductForm";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ProductEditFormProps {
  productId: string;
}

export function ProductEditForm({ productId }: ProductEditFormProps) {
  const t = useTranslations("merchant.products");
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/merchant/products/${productId}`);
        if (!response.ok) {
          throw new Error(t("error.fetchFailed"));
        }

        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error.unknown"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, t]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !product) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error || t("error.notFound")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <ProductForm product={product} mode="edit" />;
}
