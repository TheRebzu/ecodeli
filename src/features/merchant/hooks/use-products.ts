"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  sku?: string;
  category?: string;
  brand?: string;
  weight?: number;
  dimensions?: any;
  images: string[];
  isActive: boolean;
  stockQuantity: number;
  minStockAlert: number;
  tags: string[];
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalValue: number;
  categories: number;
}

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/merchant/products");

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        setProducts(data.products || []);
        setStats(data.stats || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  const createProduct = async (productData: Partial<Product>) => {
    try {
      const response = await fetch("/api/merchant/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error("Failed to create product");
      }

      const newProduct = await response.json();
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const response = await fetch(`/api/merchant/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      const updatedProduct = await response.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p)),
      );
      return updatedProduct;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/merchant/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const bulkImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/merchant/products/bulk-import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to import products");
      }

      const result = await response.json();
      // Refresh products after import
      const productsResponse = await fetch("/api/merchant/products");
      const productsData = await productsResponse.json();
      setProducts(productsData.products || []);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  return {
    products,
    stats,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkImport,
  };
}
