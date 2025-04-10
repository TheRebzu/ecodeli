'use client'

import { useState, useEffect } from 'react'

/**
 * Hook pour vérifier si le code s'exécute côté client
 * Utile pour éviter les erreurs d'hydratation avec les composants qui utilisent des API du navigateur
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return isClient
} 