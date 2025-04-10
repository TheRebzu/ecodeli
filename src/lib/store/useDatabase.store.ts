"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CacheService } from "../services/cache.service";

interface DatabaseSyncState {
  lastSyncTime: number | null;
  syncErrors: Record<string, string>;
  isSyncing: boolean;
  pendingOperations: Array<{
    id: string;
    entity: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }>;
}

interface DatabaseSyncActions {
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addSyncError: (entity: string, error: string) => void;
  clearSyncError: (entity: string) => void;
  clearAllSyncErrors: () => void;
  addPendingOperation: (entity: string, operation: 'create' | 'update' | 'delete', data: any) => void;
  removePendingOperation: (id: string) => void;
  clearPendingOperations: () => void;
  invalidateCache: (entityPattern: string) => void;
}

type DatabaseSyncStore = DatabaseSyncState & DatabaseSyncActions;

export const useDatabaseStore = create<DatabaseSyncStore>()(
  persist(
    (set, get) => ({
      lastSyncTime: null,
      syncErrors: {},
      isSyncing: false,
      pendingOperations: [],

      setSyncing: (isSyncing) => set({ isSyncing }),
      
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      
      addSyncError: (entity, error) => set((state) => ({
        syncErrors: {
          ...state.syncErrors,
          [entity]: error
        }
      })),
      
      clearSyncError: (entity) => set((state) => {
        const newErrors = { ...state.syncErrors };
        delete newErrors[entity];
        return { syncErrors: newErrors };
      }),
      
      clearAllSyncErrors: () => set({ syncErrors: {} }),
      
      addPendingOperation: (entity, operation, data) => set((state) => ({
        pendingOperations: [
          ...state.pendingOperations,
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            entity,
            operation,
            data,
            timestamp: Date.now()
          }
        ]
      })),
      
      removePendingOperation: (id) => set((state) => ({
        pendingOperations: state.pendingOperations.filter(op => op.id !== id)
      })),
      
      clearPendingOperations: () => set({ pendingOperations: [] }),
      
      invalidateCache: (entityPattern) => {
        CacheService.invalidatePattern(entityPattern);
      }
    }),
    {
      name: 'ecodeli-database-sync',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
        pendingOperations: state.pendingOperations
      })
    }
  )
);

// Helper function to process pending operations
export const processPendingOperations = async () => {
  const {
    pendingOperations,
    removePendingOperation,
    setSyncing,
    setLastSyncTime,
    addSyncError,
    clearSyncError
  } = useDatabaseStore.getState();
  
  if (pendingOperations.length === 0) {
    return;
  }
  
  setSyncing(true);
  
  try {
    // Sort operations by timestamp (oldest first)
    const sortedOperations = [...pendingOperations].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process each operation
    for (const operation of sortedOperations) {
      try {
        // Process operation based on type and entity
        // For example:
        // if (operation.entity === 'products') {
        //   const productService = new ProductService();
        //   
        //   if (operation.operation === 'create') {
        //     await productService.create(operation.data);
        //   } else if (operation.operation === 'update') {
        //     await productService.update(operation.data.id, operation.data);
        //   } else if (operation.operation === 'delete') {
        //     await productService.delete(operation.data.id);
        //   }
        // }
        
        // Remove operation after successful processing
        removePendingOperation(operation.id);
        
        // Clear any previous errors for this entity
        clearSyncError(operation.entity);
      } catch (error) {
        console.error(`Error processing operation ${operation.id}:`, error);
        
        // Add sync error
        if (error instanceof Error) {
          addSyncError(operation.entity, error.message);
        } else {
          addSyncError(operation.entity, 'Unknown error occurred');
        }
        
        // For now, we continue processing other operations even if one fails
      }
    }
    
    // Update last sync time
    setLastSyncTime(Date.now());
  } finally {
    setSyncing(false);
  }
};

// Setup automatic background sync
if (typeof window !== 'undefined') {
  // Sync when coming back online
  window.addEventListener('online', () => {
    processPendingOperations();
  });
  
  // Try to sync every 5 minutes
  setInterval(() => {
    if (navigator.onLine && useDatabaseStore.getState().pendingOperations.length > 0) {
      processPendingOperations();
    }
  }, 5 * 60 * 1000);
} 