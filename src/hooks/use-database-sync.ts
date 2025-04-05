"use client";

import { useEffect, useState } from "react";
import { useDatabaseStore, processPendingOperations } from "@/lib/store/database.store";

export function useDatabaseSync() {
  const {
    lastSyncTime,
    syncErrors,
    isSyncing,
    pendingOperations,
    clearSyncError,
    clearAllSyncErrors,
    addPendingOperation,
    clearPendingOperations,
    invalidateCache,
  } = useDatabaseStore();

  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Trigger sync when coming back online
  useEffect(() => {
    if (online && pendingOperations.length > 0 && !isSyncing) {
      processPendingOperations();
    }
  }, [online, pendingOperations.length, isSyncing]);

  // Queue a create operation
  const queueCreate = (entity: string, data: any) => {
    addPendingOperation(entity, "create", data);
    
    // If online, attempt to process immediately
    if (online && !isSyncing) {
      processPendingOperations();
    }
  };

  // Queue an update operation
  const queueUpdate = (entity: string, data: any) => {
    addPendingOperation(entity, "update", data);
    
    // If online, attempt to process immediately
    if (online && !isSyncing) {
      processPendingOperations();
    }
  };

  // Queue a delete operation
  const queueDelete = (entity: string, id: string) => {
    addPendingOperation(entity, "delete", { id });
    
    // If online, attempt to process immediately
    if (online && !isSyncing) {
      processPendingOperations();
    }
  };

  // Manually trigger sync
  const sync = () => {
    if (pendingOperations.length > 0 && !isSyncing) {
      processPendingOperations();
    }
  };

  // Get entity-specific error
  const getEntityError = (entity: string) => {
    return syncErrors[entity] || null;
  };

  // Format last sync time
  const formattedLastSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString()
    : "Never";

  // Calculate sync stats
  const syncStats = {
    pendingCount: pendingOperations.length,
    errorCount: Object.keys(syncErrors).length,
    lastSync: formattedLastSyncTime,
  };

  return {
    // Current state
    online,
    isSyncing,
    syncStats,
    syncErrors,
    pendingOperations,
    
    // Actions
    queueCreate,
    queueUpdate,
    queueDelete,
    sync,
    getEntityError,
    clearSyncError,
    clearAllSyncErrors,
    clearPendingOperations,
    invalidateCache,
  };
} 