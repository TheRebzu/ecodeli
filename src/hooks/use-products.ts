"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  Product, 
  ProductService, 
  ProductCreateDTO, 
  ProductUpdateDTO,
  ProductFilter
} from "@/lib/services/product.service";
import { useData } from "./use-data";

export function useProducts() {
  const productService = new ProductService();
  const [featuredProducts, setFeaturedProducts] = useState<Product[] | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[] | null>(null);
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Use the generic data hook for basic CRUD operations
  const {
    data: products,
    currentItem: currentProduct,
    loading,
    error,
    pagination,
    meta,
    fetchData,
    fetchById,
    create,
    update,
    remove,
    bulkCreate,
    bulkUpdate,
    bulkDelete,
    refresh,
    changePage,
    changePageSize,
    setCurrentItem: setCurrentProduct,
  } = useData<Product, ProductCreateDTO, ProductUpdateDTO>("/products", {
    useCache: true,
    revalidateOnFocus: true,
  });

  // Fetch featured products
  const getFeaturedProducts = useCallback(async () => {
    try {
      const response = await productService.getFeaturedProducts();
      if (response.success && response.data) {
        setFeaturedProducts(response.data);
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error fetching featured products:", error);
      toast.error("Impossible de récupérer les produits mis en avant");
      return null;
    }
  }, [productService]);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }
    
    setSearchLoading(true);
    
    try {
      const response = await productService.searchProducts(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      setSearchResults([]);
      return [];
    } catch (error) {
      console.error("Error searching products:", error);
      toast.error("Impossible de rechercher les produits");
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [productService]);

  // Get products by merchant
  const getProductsByMerchant = useCallback(async (merchantId: string) => {
    try {
      const response = await productService.getProductsByMerchant(merchantId);
      if (response.success && response.data) {
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return [];
    } catch (error) {
      console.error("Error fetching merchant products:", error);
      toast.error("Impossible de récupérer les produits du marchand");
      return [];
    }
  }, [productService]);

  // Get products by category
  const getProductsByCategory = useCallback(async (category: string) => {
    try {
      const response = await productService.getProductsByCategory(category);
      if (response.success && response.data) {
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return [];
    } catch (error) {
      console.error("Error fetching category products:", error);
      toast.error("Impossible de récupérer les produits de la catégorie");
      return [];
    }
  }, [productService]);

  // Set product availability
  const setProductAvailability = useCallback(async (id: string, isAvailable: boolean) => {
    try {
      const response = await productService.setProductAvailability(id, isAvailable);
      if (response.success && response.data) {
        toast.success(`Produit ${isAvailable ? 'disponible' : 'indisponible'}`);
        
        // Update current product if needed
        if (currentProduct && currentProduct.id === id) {
          setCurrentProduct({
            ...currentProduct,
            isAvailable,
          });
        }
        
        // Update products list if needed
        if (products) {
          const updatedProducts = products.map(product => 
            product.id === id ? { ...product, isAvailable } : product
          );
          refresh();
        }
        
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error setting product availability:", error);
      toast.error("Impossible de modifier la disponibilité du produit");
      return null;
    }
  }, [currentProduct, productService, products, refresh, setCurrentProduct]);

  // Upload product image
  const uploadProductImage = useCallback(async (id: string, file: File) => {
    try {
      const response = await productService.uploadProductImage(id, file);
      if (response.success && response.data) {
        toast.success("Image téléchargée avec succès");
        
        // Update current product if needed
        if (currentProduct && currentProduct.id === id) {
          setCurrentProduct({
            ...currentProduct,
            imageUrl: response.data.imageUrl,
          });
        }
        
        // Refresh products to get updated image
        refresh();
        
        return response.data.imageUrl;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error("Impossible de télécharger l'image du produit");
      return null;
    }
  }, [currentProduct, productService, refresh, setCurrentProduct]);

  // Get product recommendations
  const getProductRecommendations = useCallback(async (productId: string, limit: number = 5) => {
    try {
      const response = await productService.getProductRecommendations(productId, limit);
      if (response.success && response.data) {
        setRecommendedProducts(response.data);
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return [];
    } catch (error) {
      console.error("Error fetching product recommendations:", error);
      toast.error("Impossible de récupérer les recommandations de produits");
      return [];
    }
  }, [productService]);

  // Advanced search with filters
  const advancedSearch = useCallback(async (filters: ProductFilter) => {
    setSearchLoading(true);
    
    try {
      const response = await productService.advancedSearch(filters);
      if (response.success && response.data) {
        setSearchResults(response.data);
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      setSearchResults([]);
      return [];
    } catch (error) {
      console.error("Error performing advanced search:", error);
      toast.error("Impossible d'effectuer la recherche avancée");
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [productService]);

  return {
    // Generic data operations
    products,
    currentProduct,
    loading,
    error,
    pagination,
    meta,
    fetchProducts: fetchData,
    getProductById: fetchById,
    createProduct: create,
    updateProduct: update,
    deleteProduct: remove,
    bulkCreateProducts: bulkCreate,
    bulkUpdateProducts: bulkUpdate,
    bulkDeleteProducts: bulkDelete,
    refreshProducts: refresh,
    changePage,
    changePageSize,
    setCurrentProduct,
    
    // Custom product operations
    featuredProducts,
    recommendedProducts,
    searchResults,
    searchLoading,
    getFeaturedProducts,
    searchProducts,
    getProductsByMerchant,
    getProductsByCategory,
    setProductAvailability,
    uploadProductImage,
    getProductRecommendations,
    advancedSearch,
  };
} 