"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { DataService, FilterParams, PaginationParams, PaginatedResponse } from "@/lib/services/data.service";
import { ApiResponse } from "@/lib/services/api-client";
import { CacheService } from "@/lib/services/cache.service";

interface UseDataOptions {
  cacheTTL?: number;
  useCache?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnConnect?: boolean;
}

export function useData<T, CreateDTO = any, UpdateDTO = any>(
  endpoint: string,
  options: UseDataOptions = {}
) {
  const [data, setData] = useState<T[] | null>(null);
  const [currentItem, setCurrentItem] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
  });
  const [meta, setMeta] = useState<PaginatedResponse<T>["meta"] | null>(null);

  const service = new DataService<T, CreateDTO, UpdateDTO>(endpoint);
  const cacheKey = `data-${endpoint}`;

  // Load initial data from cache if available
  useEffect(() => {
    if (options.useCache) {
      const cachedData = CacheService.get<{ items: T[], meta: PaginatedResponse<T>["meta"] }>(cacheKey);
      if (cachedData) {
        setData(cachedData.items);
        setMeta(cachedData.meta);
      }
    }
  }, [cacheKey, options.useCache]);

  // Revalidate on window focus if option is enabled
  useEffect(() => {
    if (!options.revalidateOnFocus) return;

    const onFocus = () => {
      fetchData();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [options.revalidateOnFocus]);

  // Revalidate on network reconnect if option is enabled
  useEffect(() => {
    if (!options.revalidateOnConnect) return;

    const onOnline = () => {
      fetchData();
    };

    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [options.revalidateOnConnect]);

  const handleApiResponse = useCallback(<R>(response: ApiResponse<R>, successMessage?: string): R | null => {
    if (response.success) {
      if (successMessage) {
        toast.success(successMessage);
      }
      return response.data || null;
    } else {
      setError(response.message || "Une erreur s'est produite");
      if (response.message) {
        toast.error(response.message);
      }
      return null;
    }
  }, []);

  const fetchData = useCallback(async (filters: FilterParams = {}, pagParams: PaginationParams = {}) => {
    setLoading(true);
    setError(null);
    
    const paginationToUse = { ...pagination, ...pagParams };
    setPagination(paginationToUse);
    
    try {
      let result: PaginatedResponse<T> | null;
      
      if (options.useCache) {
        result = await CacheService.getOrSet<PaginatedResponse<T>>(
          `${cacheKey}-${JSON.stringify({ filters, pagination: paginationToUse })}`,
          async () => {
            const response = await service.getAll(filters, paginationToUse);
            return handleApiResponse(response) as PaginatedResponse<T>;
          },
          { ttl: options.cacheTTL }
        );
      } else {
        const response = await service.getAll(filters, paginationToUse);
        result = handleApiResponse(response);
      }
      
      if (result) {
        setData(result.items);
        setMeta(result.meta);
        
        if (options.useCache) {
          CacheService.set(cacheKey, { items: result.items, meta: result.meta }, { ttl: options.cacheTTL });
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Impossible de récupérer les données");
      toast.error("Impossible de récupérer les données");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, handleApiResponse, options.cacheTTL, options.useCache, pagination, service]);

  const fetchById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let result: T | null;
      
      if (options.useCache) {
        result = await CacheService.getOrSet<T>(
          `${cacheKey}-item-${id}`,
          async () => {
            const response = await service.getById(id);
            return handleApiResponse(response);
          },
          { ttl: options.cacheTTL }
        );
      } else {
        const response = await service.getById(id);
        result = handleApiResponse(response);
      }
      
      if (result) {
        setCurrentItem(result);
        return result;
      }
      
      return null;
    } catch (err) {
      console.error("Error fetching item:", err);
      setError("Impossible de récupérer l'élément");
      toast.error("Impossible de récupérer l'élément");
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, handleApiResponse, options.cacheTTL, options.useCache, service]);

  const create = useCallback(async (createData: CreateDTO) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await service.create(createData);
      const result = handleApiResponse(response, "Élément créé avec succès");
      
      if (result) {
        if (options.useCache) {
          CacheService.invalidatePattern(`${cacheKey}`);
        }
        
        // Refresh the data list
        fetchData();
        
        return result;
      }
      
      return null;
    } catch (err) {
      console.error("Error creating item:", err);
      setError("Impossible de créer l'élément");
      toast.error("Impossible de créer l'élément");
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchData, handleApiResponse, options.useCache, service]);

  const update = useCallback(async (id: string, updateData: UpdateDTO) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await service.update(id, updateData);
      const result = handleApiResponse(response, "Élément mis à jour avec succès");
      
      if (result) {
        // Update the current item if needed
        if (currentItem && (currentItem as any).id === id) {
          setCurrentItem(result);
        }
        
        // Invalidate cache
        if (options.useCache) {
          CacheService.invalidatePattern(`${cacheKey}`);
          CacheService.invalidatePattern(`${cacheKey}-item-${id}`);
        }
        
        // Update data list if needed
        if (data) {
          setData(data.map(item => ((item as any).id === id ? result : item)));
        }
        
        return result;
      }
      
      return null;
    } catch (err) {
      console.error("Error updating item:", err);
      setError("Impossible de mettre à jour l'élément");
      toast.error("Impossible de mettre à jour l'élément");
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, currentItem, data, handleApiResponse, options.useCache, service]);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await service.delete(id);
      if (response.success) {
        if (response.message) {
          toast.success("Élément supprimé avec succès");
        }
        
        // Clear current item if needed
        if (currentItem && (currentItem as any).id === id) {
          setCurrentItem(null);
        }
        
        // Invalidate cache
        if (options.useCache) {
          CacheService.invalidatePattern(`${cacheKey}`);
          CacheService.delete(`${cacheKey}-item-${id}`);
        }
        
        // Update data list if needed
        if (data) {
          setData(data.filter(item => ((item as any).id !== id)));
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Impossible de supprimer l'élément");
      toast.error("Impossible de supprimer l'élément");
      return false;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, currentItem, data, options.useCache, service]);

  const bulkCreate = useCallback(async (items: CreateDTO[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await service.bulkCreate(items);
      const result = handleApiResponse(response, "Éléments créés avec succès");
      
      if (result) {
        // Invalidate cache
        if (options.useCache) {
          CacheService.invalidatePattern(`${cacheKey}`);
        }
        
        // Refresh the data list
        fetchData();
        
        return result;
      }
      
      return null;
    } catch (err) {
      console.error("Error creating items:", err);
      setError("Impossible de créer les éléments");
      toast.error("Impossible de créer les éléments");
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchData, handleApiResponse, options.useCache, service]);

  const bulkUpdate = useCallback(async (items: (UpdateDTO & { id: string })[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await service.bulkUpdate(items);
      const result = handleApiResponse(response, "Éléments mis à jour avec succès");
      
      if (result) {
        // Invalidate cache
        if (options.useCache) {
          CacheService.invalidatePattern(`${cacheKey}`);
          items.forEach(item => {
            CacheService.delete(`${cacheKey}-item-${item.id}`);
          });
        }
        
        // Refresh the data list
        fetchData();
        
        return result;
      }
      
      return null;
    } catch (err) {
      console.error("Error updating items:", err);
      setError("Impossible de mettre à jour les éléments");
      toast.error("Impossible de mettre à jour les éléments");
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchData, handleApiResponse, options.useCache, service]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await service.bulkDelete(ids);
      if (response.success) {
        toast.success("Éléments supprimés avec succès");
        
        // Clear current item if needed
        if (currentItem && ids.includes((currentItem as any).id)) {
          setCurrentItem(null);
        }
        
        // Invalidate cache
        if (options.useCache) {
          CacheService.invalidatePattern(`${cacheKey}`);
          ids.forEach(id => {
            CacheService.delete(`${cacheKey}-item-${id}`);
          });
        }
        
        // Update data list if needed
        if (data) {
          setData(data.filter(item => !ids.includes((item as any).id)));
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error deleting items:", err);
      setError("Impossible de supprimer les éléments");
      toast.error("Impossible de supprimer les éléments");
      return false;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, currentItem, data, options.useCache, service]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const changePage = useCallback((page: number) => {
    fetchData({}, { page });
  }, [fetchData]);

  const changePageSize = useCallback((limit: number) => {
    fetchData({}, { limit, page: 1 });
  }, [fetchData]);

  return {
    data,
    currentItem,
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
    setCurrentItem,
  };
} 