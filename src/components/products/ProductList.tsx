"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductFilter } from "@/lib/services/product.service";
import { useDatabaseSync } from "@/hooks/use-database-sync";

type ProductListProps = {
  initialCategory?: string;
  merchantId?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  limit?: number;
}

export function ProductList(props: ProductListProps) {
  const {
    initialCategory,
    merchantId,
    showSearch = true,
    showFilters = true,
    limit = 10,
  } = props;

  const {
    products,
    loading,
    error,
    pagination,
    meta,
    fetchProducts,
    searchProducts,
    advancedSearch,
    searchResults,
    searchLoading,
    getProductsByCategory,
    getProductsByMerchant,
    deleteProduct,
    setProductAvailability,
    changePage,
    changePageSize,
  } = useProducts();

  const { online, queueDelete } = useDatabaseSync();

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState(initialCategory || "");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Load initial products
  useEffect(() => {
    if (merchantId) {
      getProductsByMerchant(merchantId);
    } else if (category) {
      getProductsByCategory(category);
    } else {
      fetchProducts({ 
        page: 1, 
        limit 
      });
    }
  }, [merchantId, category, fetchProducts, getProductsByMerchant, getProductsByCategory, limit]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 2) {
      searchProducts(query);
    }
  };

  // Handle filter changes
  const applyFilters = () => {
    const filters: ProductFilter = {
      category: category || undefined,
      merchantId: merchantId || undefined,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      isAvailable: showAvailableOnly || undefined,
      search: searchQuery.trim() || undefined,
    };
    
    advancedSearch(filters);
  };

  // Handle product deletion
  const handleDeleteProduct = (id: string) => {
    if (online) {
      deleteProduct(id);
    } else {
      // Queue for later if offline
      queueDelete("products", id);
    }
  };

  // Handle product availability toggle
  const handleToggleAvailability = (id: string, currentAvailability: boolean) => {
    setProductAvailability(id, !currentAvailability);
  };

  // Determine which products to show (search results or regular products)
  const displayProducts = searchQuery.trim().length > 2 ? searchResults : products;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher des produits..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {searchLoading && (
            <div className="absolute right-3 top-2.5">
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Category filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Toutes</option>
              <option value="food">Alimentaire</option>
              <option value="electronics">Électronique</option>
              <option value="clothing">Vêtements</option>
              <option value="home">Maison</option>
            </select>
          </div>

          {/* Price range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix min</label>
            <input
              type="number"
              min="0"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix max</label>
            <input
              type="number"
              min="0"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Available only filter */}
          <div className="flex items-center mt-7">
            <input
              type="checkbox"
              id="availableOnly"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary rounded"
            />
            <label htmlFor="availableOnly" className="ml-2 text-sm text-gray-700">
              Produits disponibles uniquement
            </label>
          </div>
          
          <div className="md:col-span-4">
            <button
              onClick={applyFilters}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition"
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !searchLoading && (
        <div className="flex justify-center items-center py-8">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* Product grid */}
      {!loading && (
        <>
          {displayProducts && displayProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100 hover:shadow-lg transition">
                  {/* Product image */}
                  <div className="relative h-48 bg-gray-100">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Pas d'image
                      </div>
                    )}
                    
                    {/* Availability badge */}
                    <div className={`absolute top-2 right-2 px-2 py-1 text-xs rounded-full ${product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.isAvailable ? 'Disponible' : 'Indisponible'}
                    </div>
                  </div>
                  
                  {/* Product info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600 h-12 overflow-hidden">{product.description}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-lg font-bold text-primary">{product.price.toFixed(2)} €</span>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                          className="p-2 text-gray-500 hover:text-primary transition"
                          title={product.isAvailable ? "Marquer comme indisponible" : "Marquer comme disponible"}
                        >
                          {product.isAvailable ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition"
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Aucun produit trouvé
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && !searchQuery && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => changePage(1)}
                disabled={pagination.page === 1}
                className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                «
              </button>
              
              <button
                onClick={() => changePage(Math.max(1, (pagination.page || 1) - 1))}
                disabled={pagination.page === 1}
                className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                ‹
              </button>
              
              <span className="text-sm text-gray-700">
                Page {pagination.page} sur {meta.totalPages}
              </span>
              
              <button
                onClick={() => changePage(Math.min(meta.totalPages, (pagination.page || 1) + 1))}
                disabled={pagination.page === meta.totalPages}
                className={`px-3 py-1 rounded ${pagination.page === meta.totalPages ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                ›
              </button>
              
              <button
                onClick={() => changePage(meta.totalPages)}
                disabled={pagination.page === meta.totalPages}
                className={`px-3 py-1 rounded ${pagination.page === meta.totalPages ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                »
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 